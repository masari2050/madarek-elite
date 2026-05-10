-- ═══════════════════════════════════════════════════════════════
-- Migration 26 — تصلب أمني للـ RPC functions الحسّاسة
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية (audit 2026-04-28):
--   اكتُشفت 3 ثغرات أمنية في دوال الإحالات:
--
--   1. request_referral_payout(p_user_id, p_iban)
--      - مُمنوحة لـ authenticated بدون التحقّق أن auth.uid() = p_user_id
--      - الخطر: مهاجم يمرّر UUID ضحية + IBAN خاص به → سرقة كاش الضحية
--
--   2. get_referral_dashboard(p_user_id)
--      - نفس المشكلة: أي مصادَق يقدر يجلب dashboard أي مستخدم
--      - تكشف PII: IBAN، الرصيد، أسماء المُحالين
--
--   3. mark_referral_paid(p_referred_user_id, p_payment_id)
--      - مُمنوحة لـ authenticated — يفترض تُستدعى من webhook (service_role)
--      - الخطر: مهاجم بحساب وهمي يحاكي دفع → 10 ر.س لحسابه الأصلي بعد 7 أيام
--
--   4. confirm_pending_referrals() (أقل خطورة)
--      - cron logic لكنها متاحة لأي مصادَق
--      - الخطر: لا يبطل قاعدة 7 أيام (الدالة نفسها تفحصها) — لكن صلاحيتها زيادة
--
--   5. apply_cash_referral(p_new_user_id, p_code) (تحصين دفاعي)
--      - تستدعى عند التسجيل — تحتاج تأكيد أن auth.uid() = p_new_user_id
--
-- استراتيجية الإصلاح:
--   • للدوال اللي تخصّ مستخدماً معيناً: نضيف check `auth.uid() = p_user_id`
--   • للدوال اللي للنظام (webhook/cron): نسحب الصلاحية من authenticated
--   • CREATE OR REPLACE فقط (golden rule — لا حذف)
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) apply_cash_referral — تحصين دفاعي ──
-- يُستدعى عند التسجيل. نتأكّد أن المستخدم الحالي هو نفسه p_new_user_id.
CREATE OR REPLACE FUNCTION public.apply_cash_referral(
    p_new_user_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id UUID;
    v_existing UUID;
BEGIN
    -- 🛡️ NEW: تحقّق أن المستدعي هو نفسه المستخدم المُحَال
    IF auth.uid() IS NULL OR auth.uid() <> p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    -- تحقّق: الكود موجود؟
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE UPPER(TRIM(referral_code)) = UPPER(TRIM(p_referral_code));

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'كود الإحالة غير موجود');
    END IF;

    IF v_referrer_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كودك الشخصي');
    END IF;

    SELECT id INTO v_existing
    FROM referrals
    WHERE referred_user_id = p_new_user_id;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'تمت إحالتك مسبقاً');
    END IF;

    INSERT INTO referrals (referrer_id, referred_user_id, cash_amount, discount_applied, cash_status)
    VALUES (v_referrer_id, p_new_user_id, 10, 10, 'awaiting_payment');

    UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'discount', 10,
        'message', 'رائع! حصلت على خصم 10 ر.س على أول اشتراك'
    );
END;
$$;

-- ── 2) mark_referral_paid — سحب من authenticated ──
-- يُستدعى من webhook (verify-payment Edge Function عبر service_role).
-- لا يحتاج any user يقدر يستدعيها.
REVOKE ALL ON FUNCTION public.mark_referral_paid(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_referral_paid(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_referral_paid(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.mark_referral_paid(UUID, UUID) IS
  '⚠️ service_role فقط — تُستدعى من Edge Function verify-payment بعد تأكيد الدفع.';

-- ── 3) confirm_pending_referrals — سحب من authenticated ──
-- منطق cron — يُستدعى يومياً من pg_cron عبر service_role.
REVOKE ALL ON FUNCTION public.confirm_pending_referrals() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_pending_referrals() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pending_referrals() TO service_role;

COMMENT ON FUNCTION public.confirm_pending_referrals() IS
  '⚠️ service_role فقط — cron يستدعيها يومياً، لا يجوز الاستدعاء من العميل.';

-- ── 4) get_referral_dashboard — حماية PII ──
-- المهاجم كان يقدر يجلب dashboard أي UUID. نتأكّد المستدعي هو صاحب الـ UUID.
CREATE OR REPLACE FUNCTION public.get_referral_dashboard(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_stc TEXT;
    v_balance RECORD;
    v_recent JSONB;
BEGIN
    -- 🛡️ NEW: المستخدم يقدر يجلب dashboard نفسه فقط
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    SELECT referral_code, stc_pay_number INTO v_code, v_stc
    FROM profiles WHERE id = p_user_id;

    SELECT * INTO v_balance
    FROM v_referral_balances
    WHERE user_id = p_user_id;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'name', COALESCE(p.full_name, 'مستخدم'),
            'status', r.cash_status,
            'amount', r.cash_amount,
            'created_at', r.created_at,
            'paid_at', r.paid_at,
            'confirmed_at', r.confirmed_at
        ) ORDER BY r.created_at DESC
    ), '[]'::jsonb) INTO v_recent
    FROM (
        SELECT * FROM referrals
        WHERE referrer_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 10
    ) r
    LEFT JOIN profiles p ON p.id = r.referred_user_id;

    RETURN jsonb_build_object(
        'referral_code', v_code,
        'stc_pay_number', v_stc,
        'pending_amount', COALESCE(v_balance.pending_amount, 0),
        'available_amount', COALESCE(v_balance.available_amount, 0),
        'paid_out_amount', COALESCE(v_balance.paid_out_amount, 0),
        'total_earned', COALESCE(v_balance.total_earned, 0),
        'total_referrals', COALESCE(v_balance.total_referrals, 0),
        'confirmed_count', COALESCE(v_balance.confirmed_count, 0),
        'pending_count', COALESCE(v_balance.pending_count, 0),
        'recent', v_recent,
        'min_payout', 100
    );
END;
$$;

-- ── 5) request_referral_payout — حماية مالية ──
-- المهاجم كان يقدر يطلب صرف لـ UUID شخص آخر، بـ IBAN يخصّه.
-- نتأكّد المستدعي هو صاحب الـ UUID.
CREATE OR REPLACE FUNCTION public.request_referral_payout(
    p_user_id UUID,
    p_stc_pay_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_available NUMERIC;
    v_pending_payout UUID;
    v_payout_id UUID;
BEGIN
    -- 🛡️ NEW: المستخدم يطلب صرف ماله فقط
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    -- تحقّق: ما عنده طلب صرف نشط
    SELECT id INTO v_pending_payout
    FROM referral_payouts
    WHERE user_id = p_user_id
      AND status IN ('requested', 'processing');

    IF v_pending_payout IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'يوجد طلب صرف قيد المعالجة');
    END IF;

    -- تحقّق: الرصيد متاح ≥ 100
    SELECT available_amount INTO v_available
    FROM v_referral_balances
    WHERE user_id = p_user_id;

    IF v_available IS NULL OR v_available < 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحد الأدنى للصرف 100 ر.س. رصيدك المتاح: ' || COALESCE(v_available::TEXT, '0')
        );
    END IF;

    -- 🛡️ NEW: تحقّق صيغة IBAN السعودي قبل القبول
    IF p_stc_pay_number IS NULL OR NOT (UPPER(REPLACE(p_stc_pay_number, ' ', '')) ~ '^SA\d{22}$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'صيغة الآيبان غير صحيحة (يجب SA + 22 رقماً)');
    END IF;

    -- حدّث رقم IBAN في profiles (للمرة القادمة)
    UPDATE profiles SET stc_pay_number = UPPER(REPLACE(p_stc_pay_number, ' ', '')) WHERE id = p_user_id;

    -- أنشئ طلب الصرف
    INSERT INTO referral_payouts (user_id, amount, stc_pay_number, status)
    VALUES (p_user_id, v_available, UPPER(REPLACE(p_stc_pay_number, ' ', '')), 'requested')
    RETURNING id INTO v_payout_id;

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount', v_available,
        'message', 'تم استلام طلب الصرف. سنحوّل لك المبلغ خلال 1-3 أيام عمل'
    );
END;
$$;

-- ── 6) RLS policy لـ referrals — تشديد INSERT ──
-- POLICY القديمة: WITH CHECK (true) — أي مصادَق يقدر يدخل أي صف!
-- النتيجة: تزوير referrals ممكن مباشرة عبر client SDK.
-- الإصلاح: إنكار جميع الـ inserts المباشرة. الإدراج يحدث فقط عبر SECURITY DEFINER
--          functions اللي تتجاوز RLS.
DROP POLICY IF EXISTS "referrals_insert_on_signup" ON public.referrals;
CREATE POLICY "referrals_no_direct_insert" ON public.referrals
    FOR INSERT
    WITH CHECK (false);  -- 🛡️ ينكر جميع inserts المباشرة. SECURITY DEFINER يتجاوز هذا.

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) الدوال محمية:
--    SELECT routine_name, security_type
--    FROM information_schema.routines
--    WHERE routine_schema = 'public'
--      AND routine_name IN (
--        'apply_cash_referral','get_referral_dashboard',
--        'request_referral_payout','mark_referral_paid','confirm_pending_referrals'
--      );
--    -- المتوقّع: 5 صفوف، security_type='DEFINER'
--
-- 2) الصلاحيات:
--    SELECT proname, proacl FROM pg_proc
--    WHERE proname IN ('mark_referral_paid','confirm_pending_referrals');
--    -- المتوقّع: service_role فقط (لا authenticated)
--
-- 3) RLS policy جديدة:
--    SELECT policyname, cmd, with_check
--    FROM pg_policies
--    WHERE tablename='referrals';
--    -- يجب يظهر: referrals_no_direct_insert مع with_check='false'
--
-- 4) اختبار سلبي (يجب يفشل):
--    SET ROLE authenticated;
--    SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
--    SELECT request_referral_payout(
--      '99999999-9999-9999-9999-999999999999'::uuid,  -- UUID شخص آخر
--      'SA1234567890123456789012'
--    );
--    -- المتوقّع: { success: false, error: 'غير مصرّح' }
--    RESET ROLE;
-- ═══════════════════════════════════════════════════════════════
