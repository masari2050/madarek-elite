-- ═══════════════════════════════════════════════════════════════
-- Migration 16: نظام الإحالة النقدي (Cash Referrals)
-- ═══════════════════════════════════════════════════════════════
-- يُضيف طبقة نقدية فوق نظام الأيام القديم دون كسره:
--   • referrer_bonus = 10 ر.س لكل إحالة مؤكدة (بعد دفع المحال + 7 أيام)
--   • referred_discount = 10 ر.س خصم على أول اشتراك
--   • حد أدنى للصرف: 100 ر.س (10 إحالات)
--   • الصرف عبر STC Pay فقط، يدوي من admin
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────
-- 1. توسيع جدول referrals بحقول النقد
-- ────────────────────────────────────────────
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(10,2) DEFAULT 10;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS discount_applied NUMERIC(10,2) DEFAULT 10;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS cash_status TEXT DEFAULT 'awaiting_payment';
-- Statuses:
--   awaiting_payment → انتظار أن يدفع المحال
--   pending          → دفع المحال، في فترة 7 أيام (حماية chargeback)
--   confirmed        → 7 أيام مرّت، الرصيد متاح
--   rejected         → استرجاع مبلغ أو حساب مزيف
--   paid_out         → صُرف ضمن عملية سحب

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;     -- وقت دفع المحال
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS payout_id UUID;

CREATE INDEX IF NOT EXISTS idx_referrals_cash_status ON referrals(cash_status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status ON referrals(referrer_id, cash_status);

-- ────────────────────────────────────────────
-- 2. جدول أرصدة الإحالة (view materialized حياً)
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_referral_balances AS
SELECT
    r.referrer_id                                                AS user_id,
    COALESCE(SUM(r.cash_amount) FILTER (WHERE r.cash_status = 'pending'), 0)   AS pending_amount,
    COALESCE(SUM(r.cash_amount) FILTER (WHERE r.cash_status = 'confirmed'), 0) AS available_amount,
    COALESCE(SUM(r.cash_amount) FILTER (WHERE r.cash_status = 'paid_out'), 0)  AS paid_out_amount,
    COALESCE(SUM(r.cash_amount) FILTER (WHERE r.cash_status IN ('confirmed','paid_out')), 0) AS total_earned,
    COUNT(*) FILTER (WHERE r.cash_status != 'rejected')          AS total_referrals,
    COUNT(*) FILTER (WHERE r.cash_status = 'confirmed')          AS confirmed_count,
    COUNT(*) FILTER (WHERE r.cash_status = 'pending')            AS pending_count
FROM referrals r
GROUP BY r.referrer_id;

GRANT SELECT ON v_referral_balances TO authenticated;

-- ────────────────────────────────────────────
-- 3. جدول طلبات الصرف (STC Pay)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_payouts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 100),
    stc_pay_number TEXT NOT NULL,
    status         TEXT DEFAULT 'pending',
    -- pending → انتظار معالجة admin
    -- processing → admin يشغل عليه
    -- completed → صُرف فعلاً
    -- rejected → رفض (مع ملاحظة)
    admin_note     TEXT,
    requested_at   TIMESTAMPTZ DEFAULT now(),
    processed_at   TIMESTAMPTZ,
    processed_by   UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_user ON referral_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON referral_payouts(status);

-- ────────────────────────────────────────────
-- 4. إضافة عمود stc_pay_number في profiles (لتعبئة مسبقة)
-- ────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stc_pay_number TEXT;

-- ────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_own_select" ON referral_payouts;
CREATE POLICY "payouts_own_select" ON referral_payouts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payouts_insert_own" ON referral_payouts;
CREATE POLICY "payouts_insert_own" ON referral_payouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "payouts_admin_all" ON referral_payouts;
CREATE POLICY "payouts_admin_all" ON referral_payouts
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));

-- ────────────────────────────────────────────
-- 6. RPC: تطبيق الإحالة النقدية عند التسجيل
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_cash_referral(
    p_new_user_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer_id UUID;
    v_existing UUID;
BEGIN
    -- تحقّق: الكود موجود؟
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE UPPER(TRIM(referral_code)) = UPPER(TRIM(p_referral_code));

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'كود الإحالة غير موجود');
    END IF;

    -- تحقّق: ما يحيل نفسه
    IF v_referrer_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك استخدام كودك الشخصي');
    END IF;

    -- تحقّق: ما تمّت الإحالة مسبقاً لنفس المستخدم
    SELECT id INTO v_existing
    FROM referrals
    WHERE referred_user_id = p_new_user_id;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'تمت إحالتك مسبقاً');
    END IF;

    -- أنشئ الإحالة (awaiting_payment) + اربط referred_by في profiles
    INSERT INTO referrals (referrer_id, referred_user_id, cash_amount, discount_applied, cash_status)
    VALUES (v_referrer_id, p_new_user_id, 10, 10, 'awaiting_payment');

    -- (اختياري) تحديث جدول profiles referred_by
    UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'discount', 10,
        'message', 'رائع! حصلت على خصم 10 ر.س على أول اشتراك'
    );
END;
$$;

-- ────────────────────────────────────────────
-- 7. RPC: تسجيل دفعة مُحال (يستدعى من payment webhook)
-- ────────────────────────────────────────────
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
    SET cash_status = 'pending',
        payment_id = p_payment_id,
        paid_at = now()
    WHERE referred_user_id = p_referred_user_id
      AND cash_status = 'awaiting_payment'
    RETURNING id INTO v_referral_id;

    IF v_referral_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا توجد إحالة معلّقة لهذا المستخدم');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'referral_id', v_referral_id,
        'message', 'تم تسجيل الدفع. سيُأكّد الرصيد بعد 7 أيام'
    );
END;
$$;

-- ────────────────────────────────────────────
-- 8. RPC: تأكيد الإحالات المعلّقة (7 أيام)
--    يُستدعى يومياً من cron job أو manually من admin
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION confirm_pending_referrals()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE referrals
        SET cash_status = 'confirmed',
            confirmed_at = now()
        WHERE cash_status = 'pending'
          AND paid_at < now() - INTERVAL '7 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN jsonb_build_object('success', true, 'confirmed_count', v_count);
END;
$$;

-- ────────────────────────────────────────────
-- 9. RPC: لوحة الإحالة للمستخدم (شامل)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_referral_dashboard(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code TEXT;
    v_stc TEXT;
    v_balance RECORD;
    v_recent JSONB;
BEGIN
    SELECT referral_code, stc_pay_number INTO v_code, v_stc
    FROM profiles WHERE id = p_user_id;

    SELECT * INTO v_balance
    FROM v_referral_balances
    WHERE user_id = p_user_id;

    -- آخر 10 إحالات
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

-- ────────────────────────────────────────────
-- 10. RPC: طلب صرف (من المستخدم)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION request_referral_payout(
    p_user_id UUID,
    p_stc_pay_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_available NUMERIC;
    v_pending_payout UUID;
    v_payout_id UUID;
BEGIN
    -- تحقّق: ما عنده طلب صرف نشط
    SELECT id INTO v_pending_payout
    FROM referral_payouts
    WHERE user_id = p_user_id AND status IN ('pending', 'processing')
    LIMIT 1;

    IF v_pending_payout IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'لديك طلب صرف قيد المعالجة');
    END IF;

    -- تحقّق من الرصيد المتاح
    SELECT COALESCE(available_amount, 0) INTO v_available
    FROM v_referral_balances
    WHERE user_id = p_user_id;

    IF v_available < 100 THEN
        RETURN jsonb_build_object('success', false,
            'error', 'الحد الأدنى للصرف 100 ر.س. رصيدك الحالي: ' || v_available || ' ر.س');
    END IF;

    -- تحقّق من رقم STC Pay
    IF p_stc_pay_number IS NULL OR LENGTH(TRIM(p_stc_pay_number)) < 9 THEN
        RETURN jsonb_build_object('success', false, 'error', 'رقم STC Pay غير صحيح');
    END IF;

    -- حفظ الرقم في profiles للمرة القادمة
    UPDATE profiles SET stc_pay_number = TRIM(p_stc_pay_number) WHERE id = p_user_id;

    -- أنشئ طلب الصرف
    INSERT INTO referral_payouts (user_id, amount, stc_pay_number, status)
    VALUES (p_user_id, v_available, TRIM(p_stc_pay_number), 'pending')
    RETURNING id INTO v_payout_id;

    -- علّم الإحالات المؤكدة بهذا الـ payout (نمنع صرفها مرتين)
    UPDATE referrals
    SET cash_status = 'paid_out', payout_id = v_payout_id
    WHERE referrer_id = p_user_id AND cash_status = 'confirmed';

    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'amount', v_available,
        'message', 'تم استلام طلبك — سنحوّله خلال 1-3 أيام'
    );
END;
$$;

-- ────────────────────────────────────────────
-- 11. صلاحيات التنفيذ
-- ────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION apply_cash_referral(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_referral_paid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_pending_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_dashboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_referral_payout(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────
-- 12. Verification
-- ────────────────────────────────────────────
-- تحقّق من الأعمدة الجديدة:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='referrals' AND column_name IN ('cash_amount','cash_status','discount_applied');

-- تحقّق من الدوال:
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema='public' AND routine_name LIKE '%referral%';

-- ═══════════════════════════════════════════════════════════════
-- انتهى Migration 16
-- ═══════════════════════════════════════════════════════════════
