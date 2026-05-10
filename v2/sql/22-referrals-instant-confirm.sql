-- ═══════════════════════════════════════════════════════════════
-- Migration 22 — تأكيد الإحالات فوراً (بدون فترة 7 أيام)
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية:
--   • كان السلوك القديم: awaiting_payment → pending (7 أيام) → confirmed
--   • سبب فترة الـ 7 أيام كان "حماية من الاسترداد" — لكننا قرّرنا لا نقدّم
--     استرداداً على الاشتراكات (تم حذف فقرة الاسترداد من الشروط).
--   • السلوك الجديد: awaiting_payment → confirmed (مباشرةً فور تأكيد الدفع)
--
-- القاعدة الذهبية:
--   • CREATE OR REPLACE FUNCTION فقط — لا حذف ولا DROP
--   • الحالة 'pending' تبقى موجودة في enum (للـ backward compatibility)
--     لكن أي إحالة جديدة تتخطّاها مباشرة
--   • cron job القديم (confirm-pending-referrals-daily) يبقى فعّالاً
--     كـ safety net — لو بقيت أي إحالات قديمة في pending سيأكّدها
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 0) تأكّد من وجود cron_logs (لو SQL 18 ما أنشأ الجدول لأي سبب) ──
-- self-contained — لا يعتمد على migration سابقة
CREATE TABLE IF NOT EXISTS public.cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result JSONB,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS cron_logs_executed_at_idx
    ON public.cron_logs(executed_at DESC);

-- RLS: admin/staff فقط يقرأون السجلّات
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cron_logs'
          AND policyname = 'cron_logs_admin_select'
    ) THEN
        CREATE POLICY "cron_logs_admin_select" ON public.cron_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid()
                      AND role IN ('admin', 'staff')
                )
            );
    END IF;
END $$;

-- ── 1) تحديث mark_referral_paid: يكتب 'confirmed' مباشرة ──
CREATE OR REPLACE FUNCTION mark_referral_paid(
    p_referred_user_id UUID,
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referral_id UUID;
BEGIN
    UPDATE referrals
    SET cash_status  = 'confirmed',    -- مباشرة بدل 'pending'
        payment_id   = p_payment_id,
        paid_at      = now(),
        confirmed_at = now()           -- نسجّل التأكيد في نفس اللحظة
    WHERE referred_user_id = p_referred_user_id
      AND cash_status      = 'awaiting_payment'
    RETURNING id INTO v_referral_id;

    IF v_referral_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error',   'لا توجد إحالة معلّقة لهذا المستخدم'
        );
    END IF;

    RETURN jsonb_build_object(
        'success',     true,
        'referral_id', v_referral_id,
        'message',     'تم تسجيل الدفع وتأكيد الرصيد فوراً — جاهز للصرف'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION mark_referral_paid(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION mark_referral_paid(UUID, UUID) IS
  'يُكتب بعد تأكيد MyFatoorah للدفع. يحوّل الإحالة مباشرة إلى confirmed (لا فترة انتظار).';

-- ── 2) backfill: أي إحالات عالقة في pending حالياً → confirmed ──
-- عمدنا للـ CTE علشان نعرف عدد الصفوف المتأثّرة (للـ log).
WITH migrated AS (
    UPDATE referrals
    SET cash_status  = 'confirmed',
        confirmed_at = COALESCE(confirmed_at, now())
    WHERE cash_status = 'pending'
    RETURNING id
)
INSERT INTO cron_logs (job_name, result, notes)
VALUES (
    'migration-22-instant-confirm-backfill',
    jsonb_build_object(
        'migrated_count', (SELECT COUNT(*) FROM migrated),
        'migrated_ids',   COALESCE((SELECT jsonb_agg(id) FROM migrated), '[]'::jsonb)
    ),
    'Migration 22: ترقية الإحالات pending → confirmed (حذف فترة 7 أيام)'
);

-- ── 3) cron يبقى فعّالاً كـ safety net — لا حاجة لـ unschedule ──
--
-- السبب:
--   • confirm_pending_referrals() يبحث عن pending + paid_at < now() - 7 days
--   • بعد هذا migration لن تصل أي إحالة جديدة لـ pending
--   • الدالة تبقى no-op يوميّاً (تكلفة صفرية)
--   • نتركها للحماية: لو حصل خطأ مستقبلي ودخلت إحالة لـ pending
--     الـ cron يمسّكها تلقائياً بعد 7 أيام
--
-- لو أردت إيقافه لاحقاً:
--   SELECT cron.unschedule('confirm-pending-referrals-daily');

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) لا توجد إحالات في pending بعد الآن:
--    SELECT cash_status, COUNT(*)
--    FROM referrals
--    GROUP BY cash_status;
--    -- المتوقّع: 'awaiting_payment' / 'confirmed' / 'paid_out' — بدون 'pending'
--
-- 2) log الـ backfill:
--    SELECT job_name, result, notes, executed_at
--    FROM cron_logs
--    WHERE job_name = 'migration-22-instant-confirm-backfill'
--    ORDER BY executed_at DESC
--    LIMIT 1;
--
-- 3) اختبار الدالة الجديدة (بيانات وهمية — لا تنفّذ على production):
--    -- SELECT mark_referral_paid('uuid-user-here', 'uuid-payment-here');
-- ═══════════════════════════════════════════════════════════════
