-- ═══════════════════════════════════════════════════════════════
-- Migration 23 — حذف الحساب داخل التطبيق (Apple Guideline 5.1.1(v))
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية:
--   • App Store يرفض الإرسال بدون زر "حذف الحساب" داخل التطبيق
--   • Google Play Console يتّبع نفس القاعدة منذ 2022
--   • الحذف يجب أن يكون فعلياً — ليس "تعطيل مؤقت"
--
-- التصميم:
--   1. preflight — نتحقّق مسبقاً من: رصيد إحالات غير مصروف + اشتراك فعّال
--      → نُرجع تحذير للواجهة ليعرضه للمستخدم قبل التأكيد النهائي
--   2. scrub_user_pii — مسح البيانات الحسّاسة من جدول profiles (خطوة دفاعية
--      قبل الحذف الفعلي، للـ audit logs)
--   3. الحذف النهائي من auth.users يتم من Edge Function بـ service role
--      (لا يمكن من SQL عادي) — الـ CASCADE على FKs يحذف البقيّة تلقائياً
--
-- القاعدة الذهبية:
--   • CREATE OR REPLACE FUNCTION فقط — لا حذف ولا DROP
--   • الإحالات التاريخية (referrals للـ referrer) يُحتفظ بها كسجلّات مالية
--     لكن `referred_user_id` يصير NULL تلقائياً بفضل ON DELETE SET NULL
--   • رصيد الكاش الخاص بالمستخدم يُحذف (CASCADE) — نبلّغه مسبقاً
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) preflight — فحص ما قبل الحذف ──
-- نُرجع معلومات تساعد الواجهة تبني رسالة تحذير دقيقة
CREATE OR REPLACE FUNCTION public.account_deletion_preflight()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id         UUID := auth.uid();
    v_cash_balance    NUMERIC(10,2) := 0;
    v_subscription    TEXT;
    v_sub_end         TIMESTAMPTZ;
    v_pending_payouts INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'يجب تسجيل الدخول'
        );
    END IF;

    -- رصيد كاش الإحالات (إن وُجد الجدول)
    BEGIN
        SELECT COALESCE(balance, 0) INTO v_cash_balance
        FROM referral_cash_balances
        WHERE user_id = v_user_id;
    EXCEPTION WHEN undefined_table THEN
        v_cash_balance := 0;
    END;

    -- طلبات صرف قيد المعالجة
    BEGIN
        SELECT COUNT(*) INTO v_pending_payouts
        FROM referral_payouts
        WHERE user_id = v_user_id
          AND status IN ('requested', 'processing');
    EXCEPTION WHEN undefined_table THEN
        v_pending_payouts := 0;
    END;

    -- الاشتراك الحالي
    SELECT subscription_type, subscription_end
    INTO v_subscription, v_sub_end
    FROM profiles
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success',          true,
        'cash_balance',     v_cash_balance,
        'pending_payouts',  v_pending_payouts,
        'subscription',     COALESCE(v_subscription, 'free'),
        'subscription_end', v_sub_end,
        'has_active_sub',   (v_subscription IS NOT NULL AND v_subscription <> 'free'
                             AND (v_sub_end IS NULL OR v_sub_end > now()))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.account_deletion_preflight() TO authenticated;

COMMENT ON FUNCTION public.account_deletion_preflight() IS
  'يُرجع معلومات الحساب قبل الحذف (رصيد + اشتراك + طلبات صرف) لبناء تحذير دقيق.';

-- ── 2) scrub PII — خطوة دفاعية قبل الحذف النهائي ──
-- تُستدعى من Edge Function بـ service role (لذا p_user_id parameter)
CREATE OR REPLACE FUNCTION public.scrub_user_pii(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row_exists BOOLEAN;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'user_id مفقود');
    END IF;

    SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_row_exists;
    IF NOT v_row_exists THEN
        RETURN jsonb_build_object('success', true, 'note', 'لا يوجد profile — تخطّي');
    END IF;

    -- مسح PII + إلغاء الاشتراك + إطفاء التجديد
    -- (نحتفظ بالإحصائيات المجمّعة لأغراض التحليل بدون ربطها لاسم/بريد)
    UPDATE profiles
    SET full_name               = 'مستخدم محذوف',
        phone                   = NULL,
        avatar_emoji            = NULL,
        referral_code           = NULL,
        subscription_type       = 'free',
        subscription_end        = NULL,
        auto_renew_enabled      = FALSE,
        auto_renew_cancelled_at = now()
    WHERE id = p_user_id;

    -- إلغاء أي إحالات معلّقة قبل التأكيد (الاسترداد لن يتم بعد حذف الحساب)
    BEGIN
        UPDATE referrals
        SET cash_status = 'cancelled'
        WHERE referred_user_id = p_user_id
          AND cash_status IN ('awaiting_payment', 'pending');
    EXCEPTION WHEN undefined_table THEN
        NULL;  -- الجدول غير موجود — تخطّي
    EXCEPTION WHEN invalid_text_representation THEN
        NULL;  -- enum لا يحوي 'cancelled' — تخطّي بدون خطأ
    END;

    RETURN jsonb_build_object('success', true, 'scrubbed_at', now());
END;
$$;

-- service role فقط (لا authenticated) لأنها تُستدعى من Edge Function
REVOKE ALL ON FUNCTION public.scrub_user_pii(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scrub_user_pii(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.scrub_user_pii(UUID) TO service_role;

COMMENT ON FUNCTION public.scrub_user_pii(UUID) IS
  'تُمسح PII من profiles قبل حذف auth.users. تُستدعى من Edge Function delete-account فقط.';

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) الدوال موجودة:
--    SELECT proname FROM pg_proc
--    WHERE proname IN ('account_deletion_preflight', 'scrub_user_pii');
--    -- المتوقّع: صفّان
--
-- 2) اختبار preflight (من مستخدم مسجّل):
--    SELECT account_deletion_preflight();
--    -- المتوقّع: { success: true, cash_balance, subscription, ... }
--
-- 3) الصلاحيات صحيحة:
--    SELECT proname, proacl FROM pg_proc
--    WHERE proname = 'scrub_user_pii';
--    -- service_role فقط
-- ═══════════════════════════════════════════════════════════════
