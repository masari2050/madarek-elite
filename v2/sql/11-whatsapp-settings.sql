-- ============================================================
-- Migration 11 — رقم واتساب الدعم + seed للبنرات
-- ============================================================

-- ── 1. رقم واتساب الدعم (لأيقونة الواتساب العائمة) ──
INSERT INTO site_settings (key, value)
VALUES ('whatsapp_number', '+966553339885')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 2. seed للبنرات الأساسية (لو مش موجودة) ──

-- Ticker
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT 'ticker', true, jsonb_build_object(
    'keyword', 'جديد',
    'keyword_color', '#FF6B35',
    'text', 'تسريبات أبريل 2026 متاحة الآن — أحدث الأسئلة مع شرح مفصّل',
    'bg_color', '#6D5DF6',
    'text_color', '#ffffff',
    'speed', 50
), 1
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type='ticker');

-- Main banner
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT 'main', true, jsonb_build_object(
    'tag', 'اختبار محاكي أسبوعي',
    'cta_text', 'سجّل مشاركتي',
    'title', 'السبت القادم — القدرات',
    'subtitle', 'اختبار جماعي بنفس الوقت لكل المشتركين — أعلى 3 يُعلَن عنهم',
    'bg_left', '#1A1230',
    'bg_right', '#2D1B69',
    'btn_color', '#F59E0B',
    'btn_text_color', '#1A1230'
), 2
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type='main');

-- Image banner (معطل افتراضياً)
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT 'image', false, jsonb_build_object(
    'image_url', '',
    'link_type', 'none',
    'link', null
), 3
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type='image');

-- ── تحقق ──
SELECT banner_type, is_active, (config->>'title')::text AS title
FROM banners
ORDER BY sort_order;
