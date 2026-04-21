-- ═══════════════════════════════════════════════════════════════
-- Migration 19 — RPCs إدارة طلبات الصرف من لوحة الأدمن
-- ═══════════════════════════════════════════════════════════════
--
-- السياق:
--   • Migration 16 أنشأ جدول referral_payouts + RPC المستخدم (request_referral_payout)
--   • المستخدم يطلب صرف → cash_status لإحالاته يصير 'paid_out' + payout_id مربوط
--   • الأدمن يحتاج: claim (processing) → complete/reject
--
-- القاعدة الذهبية:
--   • إضافات فقط
--   • لا تعديل على referral_payouts نفسه (Migration 16 معتمد)
--   • عند الرفض: إرجاع الإحالات من 'paid_out' → 'confirmed' (المبلغ يرجع لرصيد المستخدم)
-- ═══════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────
-- 1. RPC: الأدمن يستلم الطلب (claim → processing)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_claim_payout(
    p_payout_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_current_status TEXT;
BEGIN
    -- تحقّق الصلاحية
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = v_admin_id AND role IN ('admin','staff')
    ) INTO v_is_admin;
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
    END IF;

    -- تحقّق من الحالة
    SELECT status INTO v_current_status FROM referral_payouts WHERE id = p_payout_id;
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'طلب الصرف غير موجود');
    END IF;
    IF v_current_status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب ليس في حالة انتظار (' || v_current_status || ')');
    END IF;

    -- انقل لـ processing
    UPDATE referral_payouts
    SET status = 'processing',
        processed_by = v_admin_id
    WHERE id = p_payout_id;

    RETURN jsonb_build_object('success', true, 'status', 'processing');
END;
$$;

GRANT EXECUTE ON FUNCTION admin_claim_payout(UUID) TO authenticated;

-- ────────────────────────────────────────────
-- 2. RPC: إتمام الطلب (مع مرجع التحويل STC)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_complete_payout(
    p_payout_id UUID,
    p_transfer_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_current_status TEXT;
    v_amount NUMERIC;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = v_admin_id AND role IN ('admin','staff')
    ) INTO v_is_admin;
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
    END IF;

    SELECT status, amount INTO v_current_status, v_amount
    FROM referral_payouts WHERE id = p_payout_id;
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'طلب الصرف غير موجود');
    END IF;
    IF v_current_status NOT IN ('pending', 'processing') THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب في حالة لا تسمح بالإتمام (' || v_current_status || ')');
    END IF;
    IF p_transfer_ref IS NULL OR LENGTH(TRIM(p_transfer_ref)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'مرجع التحويل مطلوب (مثال: STC-REF-123)');
    END IF;

    -- أكمل الطلب
    UPDATE referral_payouts
    SET status = 'completed',
        admin_note = TRIM(p_transfer_ref),
        processed_at = now(),
        processed_by = v_admin_id
    WHERE id = p_payout_id;

    -- الإحالات المرتبطة أصلاً cash_status = 'paid_out' (من request_referral_payout)
    -- تظل كذلك — الصرف انتهى بنجاح

    RETURN jsonb_build_object(
        'success', true,
        'status', 'completed',
        'amount', v_amount,
        'transfer_ref', TRIM(p_transfer_ref)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_complete_payout(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────
-- 3. RPC: رفض الطلب (مع إرجاع الرصيد للمستخدم)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_reject_payout(
    p_payout_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_current_status TEXT;
    v_user_id UUID;
    v_restored_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM profiles WHERE id = v_admin_id AND role IN ('admin','staff')
    ) INTO v_is_admin;
    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
    END IF;

    SELECT status, user_id INTO v_current_status, v_user_id
    FROM referral_payouts WHERE id = p_payout_id;
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'طلب الصرف غير موجود');
    END IF;
    IF v_current_status NOT IN ('pending', 'processing') THEN
        RETURN jsonb_build_object('success', false, 'error', 'الطلب في حالة لا تسمح بالرفض (' || v_current_status || ')');
    END IF;
    IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', 'سبب الرفض مطلوب');
    END IF;

    -- ارفض الطلب
    UPDATE referral_payouts
    SET status = 'rejected',
        admin_note = TRIM(p_reason),
        processed_at = now(),
        processed_by = v_admin_id
    WHERE id = p_payout_id;

    -- أرجع الإحالات من 'paid_out' إلى 'confirmed' → الرصيد يرجع لرصيد المستخدم
    WITH restored AS (
        UPDATE referrals
        SET cash_status = 'confirmed', payout_id = NULL
        WHERE payout_id = p_payout_id
        RETURNING id
    )
    SELECT COUNT(*) INTO v_restored_count FROM restored;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'rejected',
        'user_id', v_user_id,
        'restored_referrals', v_restored_count,
        'reason', TRIM(p_reason)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reject_payout(UUID, TEXT) TO authenticated;

-- ────────────────────────────────────────────
-- 4. View: قائمة طلبات الصرف مع بيانات المستخدم
--    (يسهّل على الأدمن — تجنّب JOIN يدوي في الواجهة)
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW v_payouts_admin AS
SELECT
    rp.id,
    rp.user_id,
    rp.amount,
    rp.stc_pay_number,
    rp.status,
    rp.admin_note,
    rp.requested_at,
    rp.processed_at,
    rp.processed_by,
    p.full_name          AS user_name,
    p.email              AS user_email,
    p.phone              AS user_phone,
    p.referral_code      AS user_referral_code,
    admin_p.full_name    AS processor_name,
    (SELECT COUNT(*) FROM referrals r
        WHERE r.payout_id = rp.id) AS referrals_count
FROM referral_payouts rp
LEFT JOIN profiles p        ON p.id = rp.user_id
LEFT JOIN profiles admin_p  ON admin_p.id = rp.processed_by;

GRANT SELECT ON v_payouts_admin TO authenticated;

-- RLS لا يُطبَّق على الـview — RLS الأساس على جدول referral_payouts (Migration 16 فيه policy للأدمن)
-- لكن لضمان الأمان، نلفّ الـview بـsecurity barrier:
ALTER VIEW v_payouts_admin SET (security_barrier = true);

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) الدوال موجودة:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema='public' AND routine_name LIKE '%payout%';
--    → admin_claim_payout, admin_complete_payout, admin_reject_payout, request_referral_payout
--
-- 2) الـview يعمل:
--    SELECT * FROM v_payouts_admin ORDER BY requested_at DESC LIMIT 5;
--
-- 3) اختبار محلّي:
--    SELECT admin_claim_payout('...uuid...');
--    SELECT admin_complete_payout('...uuid...', 'STC-REF-99213');
--    SELECT admin_reject_payout('...uuid...', 'حساب مزيف');
-- ═══════════════════════════════════════════════════════════════
