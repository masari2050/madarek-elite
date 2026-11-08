-- 123b — إيقاف الشريك: انتهاء الكود بثانية قبل الآن حتى يظهر «منتهٍ» فوراً حتى داخل نفس المعاملة
BEGIN;
CREATE OR REPLACE FUNCTION admin_set_partner_active(p_partner_id UUID, p_active BOOLEAN, p_coupon_expires_at TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
  END IF;

  UPDATE partners SET is_active = coalesce(p_active, false)
   WHERE id = p_partner_id
  RETURNING coupon_code INTO v_code;
  IF v_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الشريك غير موجود');
  END IF;

  IF coalesce(p_active, false) THEN
    UPDATE coupons SET is_active = true,
                       expires_at = coalesce(p_coupon_expires_at, now() + interval '1 year')
     WHERE upper(code) = upper(v_code);
  ELSE
    UPDATE coupons SET expires_at = least(coalesce(expires_at, now()), now() - interval '1 second')
     WHERE upper(code) = upper(v_code);
  END IF;

  RETURN jsonb_build_object('success', true, 'is_active', coalesce(p_active, false));
END;
$$;
COMMIT;
