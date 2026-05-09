-- ═══════════════════════════════════════════════════════════════
-- Migration 66 — إعادة فترة 7 أيام قبل تأكيد الإحالة (2026-05-09)
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية:
--   • SQL 22 ألغى فترة 7 أيام (instant confirm) بناءً على فرضية:
--     "لا استرجاع" تكفي للحماية.
--   • القرار الجديد من المستخدم (2026-05-09): نريد فترة 7 أيام كحماية
--     إضافية + لتطابق الشروط المكتوبة + لمنع الصرف الفوري قبل التأكد
--     من عدم وجود نزاع/استرداد بنكي عبر VISA/Mastercard.
--
-- السلوك الجديد:
--   • المحال يدفع → mark_referral_paid → cash_status='pending' (يُعرض في الإدارة)
--   • cron يومي confirm_pending_referrals → بعد 7 أيام: pending → confirmed
--   • المحيل يقدر يطلب الصرف فقط من 'confirmed'
--
-- التأثير على المحيل:
--   • في dashboard: يرى "معلّق" + "متاح للصرف" منفصلين
--   • view v_referral_balances يفصل بينهما تلقائياً (موجود من SQL 16)
--   • الإدارة ترى تفاصيل كاملة + counter بالأيام
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) mark_referral_paid: pending بدل confirmed (عكس SQL 22) ──
CREATE OR REPLACE FUNCTION public.mark_referral_paid(
    p_referred_user_id UUID,
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referral_id UUID;
BEGIN
    UPDATE referrals
    SET cash_status  = 'pending',           -- 🔄 رجوع لـpending (كان confirmed في SQL 22)
        payment_id   = p_payment_id,
        paid_at      = now()
        -- لا نضع confirmed_at هنا — الـcron يضعها بعد 7 أيام
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
        'message',     'تم تسجيل الدفع — سيُتاح للصرف بعد 7 أيام (حماية من الاسترداد البنكي)'
    );
END;
$$;

-- service_role فقط (تُستدعى من verify-payment Edge Function)
REVOKE ALL ON FUNCTION public.mark_referral_paid(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_referral_paid(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_referral_paid(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.mark_referral_paid(UUID, UUID) IS
  'يُكتب من verify-payment Edge Function. يحوّل awaiting_payment → pending. الـcron يحوّلها لـconfirmed بعد 7 أيام.';

-- ── 2) تأكّد من cron job اليومي ──
-- SQL 18 أنشأ pg_cron job 'confirm-pending-referrals-daily'.
-- نتأكّد منه + ننشئه لو ما موجود.
DO $$
BEGIN
    -- لو الـextension pg_cron مثبّت، نتحقّق من الـjob
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- احذف القديم (لو موجود) ثم أعد إنشاءه — idempotent
        BEGIN
            PERFORM cron.unschedule('confirm-pending-referrals-daily');
        EXCEPTION WHEN OTHERS THEN
            -- الـjob ما موجود — لا مشكلة
            NULL;
        END;

        -- أنشئ من جديد: يومياً الساعة 3 صباحاً UTC (6 ص بتوقيت السعودية)
        PERFORM cron.schedule(
            'confirm-pending-referrals-daily',
            '0 3 * * *',
            $cron$
            INSERT INTO cron_logs (job_name, result, notes)
            SELECT
                'confirm-pending-referrals-daily',
                confirm_pending_referrals(),
                'Daily auto-confirm of referrals after 7-day hold period'
            ;
            $cron$
        );

        RAISE NOTICE 'pg_cron job confirm-pending-referrals-daily scheduled successfully';
    ELSE
        RAISE NOTICE 'pg_cron extension غير مثبّت — يجب تشغيل confirm_pending_referrals() يدوياً أو من Edge Function';
    END IF;
END $$;

-- ── 3) backfill: أي إحالات confirmed خلال آخر 7 أيام (بسبب SQL 22) ──
-- ترجع لـpending لو الـpaid_at < 7 أيام، وتبقى confirmed لو أكثر.
-- هذا يحمي من سرقة محيل دفع له المحال أمس وحاول يصرف اليوم.
WITH reverted AS (
    UPDATE referrals
    SET cash_status = 'pending',
        confirmed_at = NULL
    WHERE cash_status = 'confirmed'
      AND paid_at IS NOT NULL
      AND paid_at > now() - INTERVAL '7 days'
      AND payout_id IS NULL  -- لا نلمس اللي صُرف فعلياً
    RETURNING id
)
INSERT INTO cron_logs (job_name, result, notes)
VALUES (
    'migration-66-revert-instant-confirm',
    jsonb_build_object(
        'reverted_count', (SELECT COUNT(*) FROM reverted),
        'reverted_ids',   COALESCE((SELECT jsonb_agg(id) FROM reverted), '[]'::jsonb)
    ),
    'Migration 66: إرجاع الإحالات confirmed (آخر 7 أيام) إلى pending'
);

-- ── 4) التحقّق ──
-- SELECT cash_status, COUNT(*), SUM(cash_amount) as total
-- FROM referrals GROUP BY cash_status ORDER BY cash_status;
-- المتوقّع:
--   awaiting_payment → المحال لم يدفع
--   pending          → دفع لكن في فترة الـ 7 أيام
--   confirmed        → ≥ 7 أيام، متاح للصرف
--   paid_out         → صُرف
-- ═══════════════════════════════════════════════════════════════
