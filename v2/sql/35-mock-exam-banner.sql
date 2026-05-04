-- ============================================================
-- Migration 35 — بنر الاختبار المحاكي (قابل للتحكم من admin)
-- ============================================================
-- الغرض: نقل بنر الاختبار المحاكي من HTML ثابت إلى DB
-- يقرأه dashboard-v2 من banners، ويُعدَّل من admin-v2 → البنرات

-- ── Seed صف بنر mock_exam (لو غير موجود) ──
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT 'mock_exam', true, jsonb_build_object(
    'exam_type', 'tahsili',
    'title', 'محاكي التحصيلي — الفترة الأولى',
    'exam_date', '2026-05-13',
    'questions', 160,
    'duration_min', 125,
    'cta_text', 'سجّل الآن'
), 0
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type = 'mock_exam');

-- ── تحقق ──
SELECT banner_type, is_active, config, sort_order
FROM banners
WHERE banner_type = 'mock_exam';
