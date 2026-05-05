-- ============================================================
-- مدارك النخبة v2 — Migration 43
-- إضافة policy SELECT للأدمن على profiles
-- ============================================================
-- السياق:
--   SQL 28 حذف "Anyone can read leaderboard data" (تسريب PII)
--   لكن لم يُضف بديل يسمح للأدمن بقراءة الأعضاء.
--   النتيجة: لوحة الإدارة تعرض كل الأرقام = 0 لأن RLS تمنع
--   COUNT و SELECT على profiles لكل أحد غير صاحب الصف.
--
-- الحلّ:
--   policy SELECT واحدة آمنة:
--     - كل مستخدم يقرأ سطره (id = auth.uid())
--     - الأدمن/Staff يقرؤون كل الصفوف عبر is_admin() الموجودة
--   is_admin() من SQL 03 هي SECURITY DEFINER → لا recursion.
--
-- التحقّق بعد التشغيل:
--   SELECT policyname, cmd FROM pg_policies
--   WHERE tablename='profiles' AND cmd='SELECT';
--   -- المتوقّع: profiles_self_or_admin_read
-- ============================================================

-- نظافة: لو في policies SELECT تاريخية مكرّرة، نحذفها أوّلاً
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_or_admin_read" ON public.profiles;

-- policy موحّدة: المستخدم يقرأ سطره، الأدمن يقرأ الكل
CREATE POLICY "profiles_self_or_admin_read" ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR public.is_admin()
    );

COMMENT ON POLICY "profiles_self_or_admin_read" ON public.profiles IS
  'كل مستخدم يقرأ سطره فقط. الأدمن/Staff يقرؤون كل الصفوف عبر is_admin() (SECURITY DEFINER).';
