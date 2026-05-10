-- ============================================================
-- Migration 12 — تفعيل البنرات للاختبار
-- ============================================================
-- شغّل هذا لتفعيل البنرات الافتراضية التي وُجدت معطّلة

UPDATE banners SET is_active = true WHERE banner_type = 'ticker';
UPDATE banners SET is_active = true WHERE banner_type = 'main';
-- image يبقى معطّلاً حتى يرفع الأدمن صورة

-- تحقق
SELECT banner_type, is_active,
       config->>'title' AS title,
       config->>'text' AS text
FROM banners
ORDER BY sort_order;
