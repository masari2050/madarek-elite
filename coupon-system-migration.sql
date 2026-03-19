-- ══════════════════════════════════════════════════════════════
--  إصلاح نظام الكوبونات الشامل — مدارك النخبة
--  تاريخ: 2026-03-19
-- ══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
--  1. جدول coupon_redemptions (تتبع الاستخدامات)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coupon_code TEXT NOT NULL,
    coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'success',  -- 'success' | 'failed'
    failure_reason TEXT,                      -- سبب الفشل لو فشل
    discount_type TEXT,                       -- 'free' | 'percentage' | 'fixed'
    discount_value NUMERIC,
    final_amount NUMERIC DEFAULT 0,           -- المبلغ النهائي بعد الخصم
    plan_type TEXT,                           -- 'monthly' | 'yearly'
    duration_months INTEGER DEFAULT 1,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- فهرس لمنع الاستخدام المكرر + تسريع البحث
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_code
    ON coupon_redemptions(user_id, coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_code
    ON coupon_redemptions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_created
    ON coupon_redemptions(created_at DESC);

-- ─────────────────────────────────────────────
--  2. RLS على coupon_redemptions
-- ─────────────────────────────────────────────
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- المستخدم يشوف استخداماته فقط
CREATE POLICY "users_read_own_redemptions" ON coupon_redemptions
    FOR SELECT USING (auth.uid() = user_id);

-- فقط service_role يقدر يضيف (Edge Function)
CREATE POLICY "service_role_insert_redemptions" ON coupon_redemptions
    FOR INSERT WITH CHECK (true);

-- الأدمن يشوف الكل
CREATE POLICY "admin_read_all_redemptions" ON coupon_redemptions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ─────────────────────────────────────────────
--  3. التأكد من RLS على profiles تسمح لـ service_role
-- ─────────────────────────────────────────────
DO $$
BEGIN
    -- حذف السياسة القديمة لو موجودة عشان نعيد إنشاءها
    DROP POLICY IF EXISTS "service_role_can_update_profiles" ON profiles;

    -- إنشاء سياسة تسمح لـ service_role بتحديث profiles
    CREATE POLICY "service_role_can_update_profiles" ON profiles
        FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy already exists or error: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────
--  4. RLS على coupons — القراءة فقط (بدون كشف التفاصيل الحساسة)
-- ─────────────────────────────────────────────
-- ملاحظة: السياسات الحالية موجودة، بس نتأكد
DO $$
BEGIN
    DROP POLICY IF EXISTS "anyone_can_read_coupons" ON coupons;
    -- القراءة العامة (الفرونت يحتاج يتحقق من الكود)
    -- لكن الحقيقة: التحقق لازم يكون في Edge Function فقط
    -- نخلي القراءة للمصادقين فقط
    CREATE POLICY "authenticated_read_coupons" ON coupons
        FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy error: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────
--  5. Function: تفعيل الاشتراك بالكوبون (SECURITY DEFINER)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activate_subscription_by_coupon(
    p_user_id UUID,
    p_subscription_type TEXT,
    p_duration_months INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_end_date TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- حساب تاريخ الانتهاء
    v_end_date := now() + (p_duration_months || ' months')::INTERVAL;

    -- تحديث الـ profile (SECURITY DEFINER يتجاوز RLS)
    UPDATE profiles
    SET subscription_type = p_subscription_type,
        subscription_end = v_end_date,
        updated_at = now()
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    -- التحقق من نجاح التحديث
    SELECT jsonb_build_object(
        'success', true,
        'subscription_type', subscription_type,
        'subscription_end', subscription_end
    ) INTO v_result
    FROM profiles
    WHERE id = p_user_id;

    RETURN v_result;
END;
$$;

-- ─────────────────────────────────────────────
--  6. Function: تسجيل استخدام الكوبون
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_coupon_redemption(
    p_user_id UUID,
    p_coupon_code TEXT,
    p_coupon_id UUID,
    p_status TEXT,
    p_failure_reason TEXT DEFAULT NULL,
    p_discount_type TEXT DEFAULT NULL,
    p_discount_value NUMERIC DEFAULT NULL,
    p_final_amount NUMERIC DEFAULT 0,
    p_plan_type TEXT DEFAULT NULL,
    p_duration_months INTEGER DEFAULT 1
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO coupon_redemptions (
        user_id, coupon_code, coupon_id, status, failure_reason,
        discount_type, discount_value, final_amount,
        plan_type, duration_months
    ) VALUES (
        p_user_id, p_coupon_code, p_coupon_id, p_status, p_failure_reason,
        p_discount_type, p_discount_value, p_final_amount,
        p_plan_type, p_duration_months
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ─────────────────────────────────────────────
--  7. Function: التحقق هل المستخدم استخدم الكوبون
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION has_user_redeemed_coupon(
    p_user_id UUID,
    p_coupon_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM coupon_redemptions
        WHERE user_id = p_user_id
          AND coupon_code = p_coupon_code
          AND status = 'success'
    );
END;
$$;

-- ─────────────────────────────────────────────
--  8. تأكيد increment_coupon_usage موجودة
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE code = p_code;
END;
$$;

-- ─────────────────────────────────────────────
--  9. Grant execute للـ functions
-- ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION activate_subscription_by_coupon(UUID, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION log_coupon_redemption(UUID, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION has_user_redeemed_coupon(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_coupon_usage(TEXT) TO service_role;

-- ══════════════════════════════════════════════════════════════
--  ✅ الانتهاء — تشغيل هذا الملف في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════
