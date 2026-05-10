-- ═══════════════════════════════════════════════════════════════
-- v2/sql/33-reviewer-account.sql
-- تفعيل حساب reviewer مدى الحياة لـ Apple App Review
-- ═══════════════════════════════════════════════════════════════
-- الهدف: مراجعو Apple يحتاجون حساب جاهز يقدرون يدخلونه ويجرّبون كل
-- ميزات التطبيق بدون دفع. هذا الـ SQL يفعّل اشتراك سنوي حتى 2030
-- على حساب abodi2088@gmail.com (الحساب الذي زوّده المستخدم لـ Apple).
--
-- ⚠️ ملاحظات أمنية:
--   1. auto_renew_enabled = false → ما في خصم تلقائي
--   2. subscription_type = 'yearly' لكن بدون فاتورة فعلية
--   3. التاريخ ممدّد لـ 2030 → يكفي لكل مراجعات Apple المستقبلية
--   4. لا يؤثر على نظام المالية لأنه مفعّل يدوياً (لا payment فعلي)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_user_id UUID;
  v_email   TEXT := 'abodi2088@gmail.com';
BEGIN
  -- 1) اعثر على الـ user_id
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'الحساب % غير موجود — سجّل أولاً عبر التطبيق ثم شغّل هذا الـ SQL', v_email;
  END IF;

  -- 2) فعّل الاشتراك السنوي مدى الحياة + علّمه كحساب reviewer
  UPDATE profiles
  SET
    subscription_type        = 'yearly',
    subscription_end         = '2030-12-31'::TIMESTAMPTZ,
    subscription_source      = 'admin',          -- ليس Apple IAP ولا MyFatoorah
    auto_renew_enabled       = false,            -- لا تجديد تلقائي
    auto_renew_cancelled_at  = NOW(),            -- علامة إضافية
    onboarding_completed     = true,             -- يتجاوز اختبار التشخيص
    onboarding_skipped       = false,
    full_name                = 'Apple Reviewer',
    role                     = 'user'
  WHERE id = v_user_id;

  -- 3) امسح أي auto-renew attempts قديمة تخص هذا الحساب
  DELETE FROM autorenew_attempts WHERE user_id = v_user_id;

  RAISE NOTICE '✅ Reviewer account activated: % (id: %)', v_email, v_user_id;
  RAISE NOTICE '   Subscription: yearly until 2030-12-31';
  RAISE NOTICE '   Auto-renew: disabled';
  RAISE NOTICE '   Onboarding: marked complete';
END $$;

-- 4) تحقّق نهائي
SELECT
  u.email,
  p.full_name,
  p.subscription_type,
  p.subscription_end,
  p.subscription_source,
  p.auto_renew_enabled,
  p.onboarding_completed,
  p.role
FROM auth.users u
JOIN profiles p ON p.id = u.id
WHERE u.email = 'abodi2088@gmail.com';
