-- ============================================================
-- مدارك النخبة v2 — Migration 46
-- profiles: policy SELECT للأدمن (نفس pattern UPDATE الموجود)
-- ============================================================
-- السياق:
--   تشخيص جلسة 2026-05-05 كشف:
--   - is_admin() function موجودة وصحيحة (SECURITY DEFINER, owner=postgres)
--   - "Admin can update any profile" UPDATE policy تستخدم is_admin() ✓ شغّالة
--   - لا توجد SELECT policy تستخدم is_admin() — هذي الفجوة
--
--   محاولة SQL 43 السابقة فشلت بسبب أنها كانت policy واحدة
--   بشرطين OR — السبب المرجّح: planner short-circuit issue.
--
-- الحلّ:
--   policy SELECT منفصلة بسيطة باستخدام نفس pattern UPDATE المثبت.
--   PostgreSQL يجمع PERMISSIVE policies بـ OR تلقائياً، فالمستخدم العادي
--   يقرأ سطره عبر profiles_select_own، والأدمن يقرأ الكل عبر هذي.
--
-- التحقّق بعد التشغيل:
--   من Supabase SQL Editor (superuser): SELECT COUNT(*) FROM profiles;
--   من JS client (admin): لوحة الإدارة → الأعضاء = 407
-- ============================================================

DROP POLICY IF EXISTS "profiles_admin_read" ON public.profiles;

CREATE POLICY "profiles_admin_read" ON public.profiles
    FOR SELECT
    USING (public.is_admin());

COMMENT ON POLICY "profiles_admin_read" ON public.profiles IS
  'الأدمن/Staff يقرؤون كل الصفوف. PERMISSIVE فيُجمع OR مع profiles_select_own للمستخدم العادي. نفس pattern "Admin can update any profile" المثبت.';
