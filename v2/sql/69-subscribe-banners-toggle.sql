-- ═══════════════════════════════════════════════════════════════
-- Migration 69 — Toggle لبنر اشتراك التدريب + التسريبات
-- ═══════════════════════════════════════════════════════════════
-- الهدف:
--   عبدالله طلب صلاحية تحكّم من admin/البنرات لإظهار/إخفاء:
--   1. بنر "افتح التدريب وارفع مستواك" في training.html
--   2. بنر "التسريبات حصرية للمشتركين" في leaks.html
--
-- التنفيذ: نضيف صفّين في banners table — admin يقدر يفعّل/يعطّل من اللوحة.
-- الـdefault: false (مخفية) — حسب طلب عبدالله 2026-05-10
-- ═══════════════════════════════════════════════════════════════

INSERT INTO banners (banner_type, is_active, sort_order, config, target_pages)
SELECT 'training_subscribe', false, 80, '{}'::jsonb, ARRAY['training']::text[]
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type = 'training_subscribe');

INSERT INTO banners (banner_type, is_active, sort_order, config, target_pages)
SELECT 'leaks_subscribe', false, 81, '{}'::jsonb, ARRAY['leaks']::text[]
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type = 'leaks_subscribe');

-- التحقّق:
SELECT banner_type, is_active, sort_order, target_pages
FROM banners
WHERE banner_type IN ('training_subscribe','leaks_subscribe');
