-- Migration 13: banners.target_pages + profiles.onboarding_completed
-- Additive only: ADD COLUMN IF NOT EXISTS
-- Safe to re-run

-- 1) target_pages: jsonb array من أسماء الصفحات التي يظهر عليها البنر
--    القيم الممكنة: "all" | "dashboard" | "leaks" | "training" | "reports" | "profile"
--    Default 'dashboard' فقط (سلوك آمن)
ALTER TABLE public.banners
    ADD COLUMN IF NOT EXISTS target_pages jsonb NOT NULL DEFAULT '["dashboard"]'::jsonb;

COMMENT ON COLUMN public.banners.target_pages IS
'أسماء الصفحات التي يظهر عليها البنر. "all" = جميع صفحات v2. القيم الأخرى: dashboard, leaks, training, reports, profile';

-- 2) ticker بنرات موجودة: اجعلها تظهر في كل الصفحات (سلوك إعلان عام)
UPDATE public.banners
SET target_pages = '["all"]'::jsonb
WHERE banner_type = 'ticker' AND target_pages = '["dashboard"]'::jsonb;

-- 3) main/image بنرات: الرئيسية فقط (افتراضي الحالي صحيح، لا حاجة للتحديث)

-- 4) onboarding: تتبع أن المستخدم أكمل الاختبار التشخيصي
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_skipped boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_result jsonb;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'هل أكمل المستخدم اختبار التشخيص الأولي';
COMMENT ON COLUMN public.profiles.onboarding_skipped IS 'تخطى الاختبار التشخيصي — لا نسأله مرة ثانية';
COMMENT ON COLUMN public.profiles.onboarding_result IS 'نتيجة الاختبار: {quant:{correct,total},verbal:{correct,total},weakest:"quant|verbal"}';
