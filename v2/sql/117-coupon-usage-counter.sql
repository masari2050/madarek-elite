-- عداد استخدام الكوبونات:
-- 1) increment_coupon_usage كانت قابلة للاستدعاء من anon وauthenticated → أي زائر يقدر يستنفد كوداً (مثل KSA96)
--    بطلبات متكررة. تُقفل على service_role فقط (المستدعون الوحيدون: دوال apply-coupon / create-payment / verify-payment).
--    subscription.js القديم يستدعيها من المتصفح لكن لا تحمّله أي صفحة.
-- 2) verify-payment ما كان يزيد العداد للكوبونات المدفوعة → تعبئة العداد من الدفعات المدفوعة الفعلية (لا يُنقص أي عداد)
BEGIN;

REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO service_role;

UPDATE coupons c
SET used_count = sub.n
FROM (
  SELECT upper(coupon_code) AS code, COUNT(*) AS n
  FROM payments
  WHERE status = 'paid' AND coupon_code IS NOT NULL
  GROUP BY upper(coupon_code)
) sub
WHERE upper(c.code) = sub.code AND COALESCE(c.used_count, 0) < sub.n;

DO $chk$
BEGIN
  IF has_function_privilege('anon', 'public.increment_coupon_usage(text)', 'execute')
     OR has_function_privilege('authenticated', 'public.increment_coupon_usage(text)', 'execute') THEN
    RAISE EXCEPTION 'increment_coupon_usage ما زالت مفتوحة';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.increment_coupon_usage(text)', 'execute') THEN
    RAISE EXCEPTION 'service_role فقد صلاحية increment_coupon_usage';
  END IF;
END
$chk$;

COMMIT;
