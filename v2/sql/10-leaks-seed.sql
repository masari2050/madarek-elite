-- ============================================================
-- Migration 10 — بذر مجموعات تسريبات تجريبية + بنر leaks
-- ============================================================
-- ملاحظة: هذه بيانات تجريبية فارغة (مجموعات بدون أسئلة حقيقية)
-- حتى تتمكن من اختبار واجهة leaks-v2.html مع Supabase.
-- الأسئلة الحقيقية ترفعها أنت لاحقاً وتربطها بـ leak_group_id

-- ── 1. بذر 3 مجموعات تسريبات ──
INSERT INTO leak_groups (title, leak_date, section, question_count, description, is_active)
VALUES
    ('تسريبات 16 أبريل 2026', '2026-04-16', 'مختلط',    167, 'أحدث التسريبات — 167 سؤال قدرات حقيقي مع شرح مفصّل', true),
    ('تسريبات 14 أبريل 2026', '2026-04-14', 'قدرات لفظي', 122, '122 سؤال لفظي — تناظر وإكمال جمل',                   true),
    ('تسريبات 13 أبريل 2026', '2026-04-13', 'تحصيلي',   98,  '98 سؤال تحصيلي — أحياء وكيمياء',                       true)
ON CONFLICT DO NOTHING;

-- ── 2. إضافة بنر "leaks" في جدول banners ──
-- (لو موجود من قبل، ما يتأثر)
INSERT INTO banners (banner_type, is_active, config, sort_order)
SELECT
    'leaks',
    true,
    jsonb_build_object(
        'title',    'تسريبات أبريل 2026',
        'subtitle', 'أحدث الأسئلة الحقيقية من اختبارات هذا الشهر — مع شروحات مفصّلة',
        'bg_left',  '#6D5DF6',
        'bg_right', '#4838C7',
        'label',    'حصري للمشتركين'
    ),
    4
WHERE NOT EXISTS (
    SELECT 1 FROM banners WHERE banner_type = 'leaks'
);

-- ── 3. تحقق: عرض المجموعات المُضافة ──
SELECT id, title, leak_date, section, question_count, is_active
FROM leak_groups
WHERE is_active = true
ORDER BY leak_date DESC;
