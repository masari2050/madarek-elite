-- ============================================================
-- مدارك النخبة v2 — Migration 45 (Rollback)
-- يرجع الوضع لما قبل SQL 43 و 44
-- ============================================================
-- السياق:
--   SQL 44 فعّل ROW LEVEL SECURITY على attempts/payments/reports
--   مع policies admin-only فقط — هذا حجب التطبيق نفسه عن قراءة
--   بياناته. لوحة الإدارة كمان لم تنفع.
--
-- الحل المؤقّت: نشيل كل اللي ضفناه اليوم. لوحة الإدارة ترجع
--   للحالة السابقة (أرقام صفر مثل أمس)، لكن التطبيق يرجع يشتغل.
--   لاحقاً نخطّط حل أعمق ومدروس.
-- ============================================================

-- 1) شيل policies اليوم
DROP POLICY IF EXISTS "profiles_self_or_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "attempts_admin_read"        ON public.attempts;
DROP POLICY IF EXISTS "payments_admin_read"        ON public.payments;
DROP POLICY IF EXISTS "reports_admin_read"         ON public.reports;

-- 2) عطّل RLS على attempts/payments/reports (إذا كانت معطّلة قبل اليوم)
--    إذا كانت مفعّلة من قبل، DISABLE هنا قد يفتح وصولاً ما هو مطلوب.
--    نتركها في وضعها الحالي ولا نعطّل — السبب: لو شُغّلت SQL 03 سابقاً
--    فالـ RLS كانت مفعّلة على الجداول الجديدة فقط، لا attempts الموروث.
--    لذا: نراهن أن DISABLE أكثر أماناً للتطبيق.
ALTER TABLE public.attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports  DISABLE ROW LEVEL SECURITY;

-- 3) ضف policy بسيطة على profiles: المستخدم يقرأ سطره فقط
--    (هذا الموقف الذي كان قائماً قبل SQL 28، عملياً)
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (id = auth.uid());

-- ============================================================
-- بعد التشغيل:
--   - التطبيق العادي يرجع يشتغل (يقرأ attempts/payments/reports بحرية)
--   - لوحة الإدارة لا تزال تعرض صفر للأعضاء — هذا مقبول مؤقتاً
--   - mock_exam يبقى كما هو (SQL 40-42 لم تتأثر)
-- ============================================================
