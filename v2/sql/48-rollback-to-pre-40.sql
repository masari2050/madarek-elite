-- ============================================================
-- مدارك النخبة v2 — Migration 48
-- Rollback شامل: يرجع DB لحالة ما قبل SQL 40
-- ============================================================
-- شغّل هذا أولاً، ثم بعده شغّل من Editor:
--   1) v2/sql/38-mock-exam-phase2.sql       (يستعيد functions)
--   2) v2/sql/39-mock-exam-fix-ambiguous.sql (يصلح ambiguous)
--
-- بعد تشغيل الثلاثة:
--   - DB يطابق حالة قبل SQL 40 (نفس bugs المسابقة السابقة)
--   - profiles_select_own يبقى (آمنة، تسمح للمستخدم بقراءة سطره)
--   - attempts/payments/reports RLS معطّلة (التطبيق يقرأها)
-- ============================================================

-- 1) شيل policies اليوم (43, 46)
DROP POLICY IF EXISTS "profiles_admin_read"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_or_admin_read" ON public.profiles;

-- 2) شيل policies من SQL 44 (لو بقايا)
DROP POLICY IF EXISTS "attempts_admin_read" ON public.attempts;
DROP POLICY IF EXISTS "payments_admin_read" ON public.payments;
DROP POLICY IF EXISTS "reports_admin_read"  ON public.reports;

-- 3) DROP الـ functions اللي عُدّلت في 40-42
--    (سيعاد إنشاؤها بنسخها القديمة بعد تشغيل SQL 38 + 39)
DROP FUNCTION IF EXISTS public.start_mock_exam_attempt(UUID);
DROP FUNCTION IF EXISTS public._pick_balanced_questions(JSONB, INTEGER);
DROP FUNCTION IF EXISTS public.register_for_active_mock_exam();

-- ============================================================
-- بعد التشغيل، شغّل SQL 38 + 39 من Supabase Editor.
-- ============================================================
