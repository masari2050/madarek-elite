-- ═══════════════════════════════════════════════════════════════
-- Migration 30 — تصلب RPC functions الخاصة بالكوبونات والفواتير
-- ═══════════════════════════════════════════════════════════════
--
-- audit verification (2026-04-28 ليلي):
--   5 functions حسّاسة ممنوحة لـ authenticated بينما يجب تكون service_role فقط:
--
-- 🔴 1. activate_subscription_by_coupon(p_user_id, p_subscription_type, p_duration_months)
--    الكارثة: أي مصادَق يستدعيها بـ:
--      activate_subscription_by_coupon(my_id, 'yearly', 12)
--    → يعطي نفسه اشتراك سنوي مجاني!
--    + يوجد overload ثاني بدون p_user_id (يستخدم auth.uid()) — هذا أقل خطورة
--      لكن لا يزال يجب تقييده.
--    الإصلاح: REVOKE من authenticated، service_role فقط.
--    الـ apply-coupon Edge Function يستدعيها بـ service_role بعد التحقّق.
--
-- 🔴 2. create_invoice(p_user_id, p_customer_name, p_customer_phone, p_plan_name,
--                       p_total_amount, p_payment_id)
--    الخطر: إنشاء فاتورة وهمية تعرض دفعة لم تحدث (نفقات احتيالية).
--    + قد يُستخدم لتشويش admin reporting.
--    الإصلاح: service_role فقط — تُستدعى من verify-payment بعد دفع مؤكّد.
--
-- 🟠 3. has_user_redeemed_coupon(p_user_id, p_coupon_code)
--    الخطر: PII leak — كشف هل مستخدم معيّن استخدم كوبوناً معيّناً.
--    قد يكون أقل خطورة لكنه يُسرّب معلومات.
--    الإصلاح: service_role فقط — apply-coupon يتحقّق server-side.
--
-- 🟠 4. log_autorenew_attempt(p_user_id, p_attempt_number, ...)
--    الخطر: تلويث جدول autorenew_attempts بسجلات وهمية.
--    قد يُستخدم لإخفاء فشل تجديد فعلي بإنشاء سجل "ناجح" مزيف.
--    الإصلاح: service_role فقط — autorenew-charge هو المستدعي الوحيد.
--
-- 🟠 5. log_coupon_redemption(p_user_id, p_coupon_code, p_coupon_id, p_status, ...)
--    الخطر: تزوير سجلات استخدام الكوبونات — تشويه analytics.
--    قد يُستغل لتجاوز usage_limit (إنشاء سجل "failed" مكان "redeemed").
--    الإصلاح: service_role فقط — apply-coupon هو المستدعي الوحيد.
--
-- التحقّق المسبق:
--   * `apply-coupon` Edge Function يستخدم supabaseAdmin (service_role) ✅
--   * `verify-payment` Edge Function يستخدم supabaseAdmin (service_role) ✅
--   * `autorenew-charge` Edge Function يستخدم supabaseAdmin (service_role) ✅
--   → الإصلاح لا يكسر أي flow شرعي.
-- ═══════════════════════════════════════════════════════════════

-- ── 1) activate_subscription_by_coupon — overload أول (مع p_user_id) ──
REVOKE ALL ON FUNCTION public.activate_subscription_by_coupon(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_subscription_by_coupon(UUID, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_by_coupon(UUID, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.activate_subscription_by_coupon(UUID, TEXT, INTEGER) IS
  '⚠️ service_role فقط — تُستدعى من Edge Function apply-coupon بعد التحقّق من الكوبون.';

-- ── 1b) activate_subscription_by_coupon — overload ثاني (بدون p_user_id، يستخدم auth.uid()) ──
-- هذا overload أقل خطورة (يفعّل لـ المستدعي فقط) لكن لا يزال يجب تقييده
-- لأن المستخدم يقدر يفعّل اشتراك أي subscription_type لأي duration
REVOKE ALL ON FUNCTION public.activate_subscription_by_coupon(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_subscription_by_coupon(TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_by_coupon(TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.activate_subscription_by_coupon(TEXT, INTEGER) IS
  '⚠️ service_role فقط — تُستدعى من Edge Function apply-coupon بعد التحقّق من الكوبون.';

-- ── 2) create_invoice ──
REVOKE ALL ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

COMMENT ON FUNCTION public.create_invoice(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) IS
  '⚠️ service_role فقط — تُستدعى من verify-payment بعد دفع مؤكّد من MyFatoorah.';

-- ── 3) has_user_redeemed_coupon ──
REVOKE ALL ON FUNCTION public.has_user_redeemed_coupon(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_user_redeemed_coupon(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_user_redeemed_coupon(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.has_user_redeemed_coupon(UUID, TEXT) IS
  '⚠️ service_role فقط — تُستدعى من apply-coupon قبل تطبيق الكوبون.';

-- ── 4) log_autorenew_attempt ──
REVOKE ALL ON FUNCTION public.log_autorenew_attempt(UUID, INTEGER, TEXT, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_autorenew_attempt(UUID, INTEGER, TEXT, NUMERIC, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_autorenew_attempt(UUID, INTEGER, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.log_autorenew_attempt(UUID, INTEGER, TEXT, NUMERIC, TEXT, TEXT, TEXT) IS
  '⚠️ service_role فقط — تُستدعى من autorenew-charge Edge Function يومياً.';

-- ── 5) log_coupon_redemption ──
REVOKE ALL ON FUNCTION public.log_coupon_redemption(UUID, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_coupon_redemption(UUID, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_coupon_redemption(UUID, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.log_coupon_redemption(UUID, TEXT, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, INTEGER) IS
  '⚠️ service_role فقط — تُستدعى من apply-coupon Edge Function بعد محاولة استخدام كوبون.';

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) جميع الـ 5 functions مقيّدة:
--    SELECT
--      p.proname,
--      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can,
--      has_function_privilege('service_role', p.oid, 'EXECUTE') AS sr_can
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname='public'
--      AND p.proname IN (
--        'activate_subscription_by_coupon','create_invoice',
--        'has_user_redeemed_coupon','log_autorenew_attempt','log_coupon_redemption'
--      );
--    -- المتوقّع: auth_can=false، sr_can=true لكل الصفوف
--
-- 2) اختبار سلبي:
--    SET ROLE authenticated;
--    SELECT activate_subscription_by_coupon('any-uuid'::uuid, 'yearly', 12);
--    -- المتوقّع: ERROR: permission denied for function
-- ═══════════════════════════════════════════════════════════════
