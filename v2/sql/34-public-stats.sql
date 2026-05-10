-- 34-public-stats.sql
-- ─────────────────────────────────────────────────────────────
-- إحصائيات عامة للزوّار (welcome screen): عدد الأسئلة + عدد الطلاب
--
-- لماذا RPC وليس view؟
--   - RLS على `profiles` يحجب القراءة عن anon (وهذا صحيح للـPII)
--   - لكن العدد الإجمالي ليس PII — يجب أن يُكشف للـmarketing
--   - SECURITY DEFINER يسمح للدالة بتجاوز RLS لقراءة count() فقط
--   - لا تكشف أي بيانات شخصية، فقط رقمين إجماليين
--
-- الأمان:
--   - count(*) فقط، لا أسماء، لا إيميلات، لا أي حقل آخر
--   - STABLE: نتيجة ثابتة خلال نفس الـtransaction (يسمح بـcaching)
--   - GRANT EXECUTE لـanon + authenticated فقط
-- ─────────────────────────────────────────────────────────────

-- لو الدالة موجودة سابقاً بـreturn type مختلف، احذفها أولاً
-- (CREATE OR REPLACE لا يسمح بتغيير return type)
DROP FUNCTION IF EXISTS public.get_public_stats() CASCADE;

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(total_questions bigint, total_users bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT
        (SELECT count(*) FROM public.questions WHERE disabled = false)::bigint AS total_questions,
        (SELECT count(*) FROM public.profiles)::bigint AS total_users;
$$;

-- صلاحيات
REVOKE ALL ON FUNCTION public.get_public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO authenticated;

COMMENT ON FUNCTION public.get_public_stats() IS
  'إحصائيات عامة للـmarketing (عدد الأسئلة + الطلاب). آمنة: لا تكشف PII. SECURITY DEFINER لتجاوز RLS على profiles.';
