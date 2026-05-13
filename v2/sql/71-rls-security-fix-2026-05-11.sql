-- ============================================================================
-- SQL 71 — RLS Security Fix (2026-05-11)
-- ============================================================================
-- السبب: Supabase Security Advisor أبلغ عن "sensitive_columns_exposed"
-- التشخيص كشف: 3 جداول بـRLS غير مفعّل (attempts, payments, reports)
-- الـpolicies موجودة لكن معطّلة لأن RLS=false → الجداول مكشوفة بالكامل
--
-- الإصلاح:
--   1. ENABLE RLS على الـ3 جداول → الـpolicies الموجودة تنشط فوراً
--   2. إضافة INSERT + UPDATE policies على attempts (مفقودة)
--   3. payments و reports عندهم policies كاملة
--
-- آمن للتراجع: الكل داخل BEGIN/COMMIT — لو شي غلط، نسوي ROLLBACK
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRE-CHECK: تأكّد من الوضع الحالي
-- ============================================================================
DO $$
DECLARE
  v_attempts_rls boolean;
  v_payments_rls boolean;
  v_reports_rls boolean;
BEGIN
  SELECT rowsecurity INTO v_attempts_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='attempts';
  SELECT rowsecurity INTO v_payments_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='payments';
  SELECT rowsecurity INTO v_reports_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='reports';

  RAISE NOTICE 'Pre-check: attempts.rls=%, payments.rls=%, reports.rls=%',
    v_attempts_rls, v_payments_rls, v_reports_rls;
END $$;

-- ============================================================================
-- STEP 1: تفعيل RLS على الجداول الـ3 المكشوفة
-- ============================================================================
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: إضافة policies مفقودة على attempts
-- ============================================================================
-- attempts موجود فيها فقط:
--   - SELECT (own + admin)
--   - DELETE (admin)
-- ينقص: INSERT + UPDATE للمستخدم العادي
-- بدون هذي، التطبيق ما يقدر يحفظ محاولات المستخدم بعد تفعيل RLS

DROP POLICY IF EXISTS "Users can insert own attempts" ON public.attempts;
CREATE POLICY "Users can insert own attempts" ON public.attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own attempts" ON public.attempts;
CREATE POLICY "Users can update own attempts" ON public.attempts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- POST-CHECK: تحقّق من النجاح
-- ============================================================================
DO $$
DECLARE
  v_attempts_rls boolean;
  v_payments_rls boolean;
  v_reports_rls boolean;
  v_attempts_policies int;
  v_payments_policies int;
  v_reports_policies int;
BEGIN
  SELECT rowsecurity INTO v_attempts_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='attempts';
  SELECT rowsecurity INTO v_payments_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='payments';
  SELECT rowsecurity INTO v_reports_rls FROM pg_tables
    WHERE schemaname='public' AND tablename='reports';

  SELECT COUNT(*) INTO v_attempts_policies FROM pg_policies
    WHERE schemaname='public' AND tablename='attempts';
  SELECT COUNT(*) INTO v_payments_policies FROM pg_policies
    WHERE schemaname='public' AND tablename='payments';
  SELECT COUNT(*) INTO v_reports_policies FROM pg_policies
    WHERE schemaname='public' AND tablename='reports';

  RAISE NOTICE 'Post-check: attempts.rls=% (% policies)', v_attempts_rls, v_attempts_policies;
  RAISE NOTICE 'Post-check: payments.rls=% (% policies)', v_payments_rls, v_payments_policies;
  RAISE NOTICE 'Post-check: reports.rls=% (% policies)',   v_reports_rls,  v_reports_policies;

  -- Assertions
  IF NOT v_attempts_rls OR NOT v_payments_rls OR NOT v_reports_rls THEN
    RAISE EXCEPTION 'RLS لم يُفعّل على كل الجداول. ROLLBACK!';
  END IF;

  IF v_attempts_policies < 5 THEN
    RAISE EXCEPTION 'attempts ينقصها policies (متوقّع 5+، فعلي %). ROLLBACK!', v_attempts_policies;
  END IF;

  IF v_payments_policies < 2 THEN
    RAISE EXCEPTION 'payments ينقصها policies (متوقّع 2+، فعلي %). ROLLBACK!', v_payments_policies;
  END IF;

  IF v_reports_policies < 5 THEN
    RAISE EXCEPTION 'reports ينقصها policies (متوقّع 5+، فعلي %). ROLLBACK!', v_reports_policies;
  END IF;

  RAISE NOTICE '✓ كل الـassertions نجحت. آمن للـCOMMIT.';
END $$;

-- ============================================================================
-- النتيجة النهائية (للعرض في SQL Editor)
-- ============================================================================
SELECT
  tablename AS "الجدول",
  CASE WHEN rowsecurity THEN '✓ مفعّل' ELSE '✗ معطّل' END AS "RLS",
  (SELECT COUNT(*) FROM pg_policies p
   WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS "policies"
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN ('attempts', 'payments', 'reports')
ORDER BY tablename;

-- ============================================================================
-- ⚠️ مهم: اقرأ النتائج أعلاه قبل أن تختار:
--   COMMIT;   ← لو الـ3 جداول كلها "✓ مفعّل"
--   ROLLBACK; ← لو شي غلط
-- ============================================================================

-- COMMIT أو ROLLBACK يدوياً من Supabase SQL Editor
