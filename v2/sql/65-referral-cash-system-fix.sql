-- ═══════════════════════════════════════════════════════════════
-- Migration 65 — إصلاح منظومة الإحالات النقدية (2026-05-09)
-- ═══════════════════════════════════════════════════════════════
--
-- الهدف:
--   إعادة تشغيل الإحالات النقدية بعد اكتشاف انكسارها (audit 2026-05-09):
--     • register.html كان يستدعي apply_referral (legacy bonus_days) بدل apply_cash_referral
--     • لا يتم تسجيل cash_amount/cash_status → mark_referral_paid يفشل بصمت
--     • لا يُطبَّق خصم الإحالة على المُحال في pricing.html
--
-- القواعد (من المستخدم 2026-05-09):
--   1. المُحال (الجديد): خصم 10% على أول اشتراك (وليس 10 ر.س ثابت)
--   2. المُحيل: 10 ر.س فقط بعد ما المبلغ يصلنا فعلياً من MyFatoorah
--   3. لا استرجاع (المنتج رقمي، مذكور بالشروط) → نبقي instant confirm
--
-- ما يفعله هذا الـ migration:
--   1. إضافة عمود discount_percent (10) — أبقي discount_applied للتوافق
--   2. تحديث apply_cash_referral ليستخدم النسبة + رسالة جديدة
--   3. RPC جديد get_referred_discount(user_id) للقراءة الآمنة في pricing
--   4. SELECT FOR UPDATE lock في request_referral_payout (race condition fix)
--   5. لا تغيير على mark_referral_paid (instant confirm يبقى)
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) إضافة عمود discount_percent ──
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 10;

-- backfill: أي صف قديم له discount_percent=10
UPDATE referrals SET discount_percent = 10 WHERE discount_percent IS NULL;

COMMENT ON COLUMN referrals.discount_percent IS
  'نسبة خصم المُحال على أول اشتراك (10% افتراضياً). discount_applied يبقى للتوافق مع legacy.';

-- ── 2) apply_cash_referral — تحديث مع رسالة النسبة ──
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
    v_code TEXT;
BEGIN
    -- 🛡️ المستدعي = المستخدم المُحَال
    IF auth.uid() IS NULL OR auth.uid() <> p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    -- تنظيف الكود
    v_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
    IF v_code = '' OR v_code !~ '^MADAR-[A-Z0-9]+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'صيغة الكود غير صحيحة');
    END IF;

    -- جلب المُحيل
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE UPPER(TRIM(referral_code)) = v_code;

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'كود الإحالة غير موجود');
    END IF;

    -- منع الإحالة الذاتية
    IF v_referrer_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كودك الشخصي');
    END IF;

    -- منع التكرار (المستخدم محال مسبقاً)
    SELECT id INTO v_existing
    FROM referrals
    WHERE referred_user_id = p_new_user_id;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'تمت إحالتك مسبقاً');
    END IF;

    -- إنشاء الإحالة:
    --   cash_amount=10 ر.س للمُحيل (يوصله بعد دفع المحال)
    --   discount_percent=10% للمحال (يطبّق تلقائياً في pricing)
    --   discount_applied=10 (يبقى للتوافق العكسي)
    INSERT INTO referrals (referrer_id, referred_user_id, cash_amount, discount_applied, discount_percent, cash_status)
    VALUES (v_referrer_id, p_new_user_id, 10, 10, 10, 'awaiting_payment');

    UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'discount_percent', 10,
        'message', 'حصلت على خصم 10% على أول اشتراك'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_cash_referral(UUID, TEXT) TO authenticated;

-- ── 3) get_referred_discount — قراءة الخصم المتاح للمُحال ──
-- يُستدعى من pricing.html لتطبيق الخصم تلقائياً
CREATE OR REPLACE FUNCTION public.get_referred_discount(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_percent INTEGER;
    v_referral_id UUID;
    v_referrer_name TEXT;
BEGIN
    -- 🛡️ المستخدم يقرأ خصمه فقط
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('has_discount', false);
    END IF;

    -- ابحث عن إحالة awaiting_payment (المحال لم يدفع بعد)
    SELECT r.id, r.discount_percent, p.full_name
    INTO v_referral_id, v_percent, v_referrer_name
    FROM referrals r
    LEFT JOIN profiles p ON p.id = r.referrer_id
    WHERE r.referred_user_id = p_user_id
      AND r.cash_status = 'awaiting_payment'
    LIMIT 1;

    IF v_referral_id IS NULL THEN
        RETURN jsonb_build_object('has_discount', false);
    END IF;

    RETURN jsonb_build_object(
        'has_discount', true,
        'percent', COALESCE(v_percent, 10),
        'referral_id', v_referral_id,
        'referrer_name', COALESCE(v_referrer_name, 'صديقك'),
        'message', 'خصم الإحالة ' || COALESCE(v_percent, 10) || '% مُفعّل'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referred_discount(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_referred_discount(UUID) IS
  'يُستدعى من pricing.html — يرجع نسبة خصم الإحالة (10%) إذا كان المستخدم محال ولم يدفع بعد.';

-- ── 4) request_referral_payout — إضافة SELECT FOR UPDATE lock ──
-- الإصلاح: قفل صف الـ profiles لمنع race condition (طلبين متزامنين)
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
    v_lock_acquired BOOLEAN;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    -- 🛡️ NEW: قفل صف المستخدم في profiles (advisory lock بسيط)
    -- يمنع طلبين متزامنين من قراءة نفس الرصيد المتاح
    SELECT pg_try_advisory_xact_lock(hashtext('payout:' || p_user_id::text)) INTO v_lock_acquired;
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object('success', false, 'error', 'طلب آخر قيد المعالجة، حاول بعد لحظات');
    END IF;

    -- تحقّق: لا يوجد طلب صرف نشط
    SELECT id INTO v_pending_payout
    FROM referral_payouts
    WHERE user_id = p_user_id
      AND status IN ('requested', 'pending', 'processing');

    IF v_pending_payout IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'يوجد طلب صرف قيد المعالجة');
    END IF;

    -- تحقّق: الرصيد ≥ 100 ر.س
    SELECT available_amount INTO v_available
    FROM v_referral_balances
    WHERE user_id = p_user_id;

    IF v_available IS NULL OR v_available < 100 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحد الأدنى للصرف 100 ر.س. رصيدك: ' || COALESCE(v_available::TEXT, '0') || ' ر.س'
        );
    END IF;

    -- تحقّق: صيغة IBAN
    IF p_stc_pay_number IS NULL OR NOT (UPPER(REPLACE(p_stc_pay_number, ' ', '')) ~ '^SA\d{22}$') THEN
        RETURN jsonb_build_object('success', false, 'error', 'صيغة الآيبان غير صحيحة (SA + 22 رقماً)');
    END IF;

    UPDATE profiles SET stc_pay_number = UPPER(REPLACE(p_stc_pay_number, ' ', '')) WHERE id = p_user_id;

    INSERT INTO referral_payouts (user_id, amount, stc_pay_number, status)
    VALUES (p_user_id, v_available, UPPER(REPLACE(p_stc_pay_number, ' ', '')), 'pending')
    RETURNING id INTO v_payout_id;

    -- علّم الإحالات المؤكدة بهذا الـ payout (نمنع صرفها مرتين)
    UPDATE referrals
    SET cash_status = 'paid_out', payout_id = v_payout_id
    WHERE referrer_id = p_user_id AND cash_status = 'confirmed';

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount', v_available,
        'message', 'تم استلام طلب الصرف. سنحوّل المبلغ خلال 1-3 أيام عمل'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_referral_payout(UUID, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل
-- ═══════════════════════════════════════════════════════════════
-- 1) العمود الجديد:
--    SELECT column_name, data_type, column_default
--    FROM information_schema.columns
--    WHERE table_name='referrals' AND column_name='discount_percent';
--    -- المتوقّع: integer, DEFAULT 10
--
-- 2) الدوال:
--    SELECT routine_name, security_type
--    FROM information_schema.routines
--    WHERE routine_schema='public'
--      AND routine_name IN ('apply_cash_referral','get_referred_discount','request_referral_payout');
--    -- المتوقّع: 3 صفوف، كلها DEFINER
--
-- 3) اختبار get_referred_discount لمستخدم بدون إحالة (يجب false):
--    SELECT get_referred_discount(auth.uid());
-- ═══════════════════════════════════════════════════════════════
