-- ============================================================
-- مدارك النخبة v2 — Migration 44
-- policies SELECT للأدمن على attempts/payments/reports
-- ============================================================
-- السياق:
--   بعد SQL 43 (profiles)، لوحة الإدارة لا تزال تعرض صفر للمحاولات
--   والبلاغات والإيراد. السبب: الجداول هذي عليها RLS موروث من
--   schema قديم تسمح للمستخدم بقراءة سطره فقط، بدون استثناء للأدمن.
--
-- الحلّ:
--   policy SELECT منفصلة لكل جدول — الأدمن يقرأ كل الصفوف عبر
--   is_admin() الموجودة من SQL 03 (SECURITY DEFINER فلا recursion).
--   policies المستخدم العادي تبقى كما هي (لا نلمسها).
--
-- التحقّق بعد التشغيل:
--   SELECT tablename, policyname FROM pg_policies
--   WHERE tablename IN ('attempts','payments','reports')
--     AND policyname LIKE '%admin_read%';
-- ============================================================

-- ── attempts ──
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attempts_admin_read" ON public.attempts;
CREATE POLICY "attempts_admin_read" ON public.attempts
    FOR SELECT
    USING (public.is_admin());

-- ── payments ──
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_admin_read" ON public.payments;
CREATE POLICY "payments_admin_read" ON public.payments
    FOR SELECT
    USING (public.is_admin());

-- ── reports ──
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_admin_read" ON public.reports;
CREATE POLICY "reports_admin_read" ON public.reports
    FOR SELECT
    USING (public.is_admin());

COMMENT ON POLICY "attempts_admin_read" ON public.attempts IS
  'الأدمن/Staff يقرؤون كل المحاولات لإحصائيات لوحة الإدارة. policies المستخدم العادي تبقى منفصلة.';
COMMENT ON POLICY "payments_admin_read" ON public.payments IS
  'الأدمن/Staff يقرؤون كل المدفوعات للإيراد والفواتير.';
COMMENT ON POLICY "reports_admin_read" ON public.reports IS
  'الأدمن/Staff يقرؤون كل البلاغات للمراجعة.';
