-- ============================================================
-- مدارك النخبة v2 — Migration 49
-- إعادة policy SELECT للأدمن على profiles
-- ============================================================
-- السياق:
--   SQL 43 (5 مايو) حذف 4 policies SELECT تاريخية على profiles
--   ضمنها policy "Users can read own profile" (محتمل كانت تسمح
--   للأدمن بقراءة الكل). SQL 45 (rollback) ضاف فقط
--   profiles_select_own (id = auth.uid()) — أضيق من السابقة.
--
--   النتيجة: اللوحة القديمة admin.html + الجديدة admin-v2.html
--   تعرض الأعضاء/المشتركون = صفر (تأثرت بدون قصد).
--
-- الحلّ:
--   policy SELECT منفصلة باستخدام is_admin() — نفس pattern
--   "Admin can update any profile" UPDATE policy الموجودة الشغّالة.
--
-- مهم: بعد التشغيل، اذهب لـ Supabase Dashboard:
--   Settings → API → اضغط "Reload Schema"
--   هذا قد يكون السبب وراء فشل SQL 46 السابق.
--
-- لو فشل من JS client رغم Reload Schema:
--   DROP POLICY IF EXISTS "Admin can read any profile" ON public.profiles;
--   ثم ننتقل لخطة RPC SECURITY DEFINER (مضمون 100%).
-- ============================================================

DROP POLICY IF EXISTS "Admin can read any profile" ON public.profiles;

CREATE POLICY "Admin can read any profile" ON public.profiles
    FOR SELECT
    USING (public.is_admin());

COMMENT ON POLICY "Admin can read any profile" ON public.profiles IS
  'الأدمن/Staff يقرؤون كل الصفوف. PERMISSIVE فيُجمع OR مع profiles_select_own للمستخدم العادي. نفس pattern "Admin can update any profile" المثبت.';
