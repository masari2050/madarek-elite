-- 79: Day 5 evening (Sunday May 17 2026 — مسائي) leak_group
-- Source: yelo platform — distinct exam session from morning hammah file.
-- Questions inserted progressively as extracted.

BEGIN;

-- 1) Rename existing Day 5 to make it explicitly the morning session
UPDATE leak_groups
SET title = 'تسريبات التحصيلي – الأحد ١٧ مايو ٢٠٢٦ (صباحي)',
    description = 'تسريبات اختبار التحصيلي الفترة الأولى – الأحد ١٧ مايو (الفترة الصباحية). أربع مواد: رياضيات + فيزياء + كيمياء + أحياء.'
WHERE id = '7d5c8a6b-9e3f-4a2d-b1c4-58a0d3f7e982'::uuid;

-- 2) Insert the evening session (yelo source)
INSERT INTO leak_groups (id, title, description, section, leak_date, accent_color, is_active, created_at)
VALUES (
    '8e6d9c7a-af4d-4b3e-c2d5-69b1e4a8d093'::uuid,
    'تسريبات التحصيلي – الأحد ١٧ مايو ٢٠٢٦ (مسائي)',
    'تسريبات اختبار التحصيلي الفترة الأولى – الأحد ١٧ مايو (الفترة المسائية). أربع مواد: رياضيات + فيزياء + كيمياء + أحياء.',
    'tahsili',
    '2026-05-17',
    '#0EA5E9',  -- sky blue (مختلف عن الصباحي الأخضر #10B981)
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      leak_date = EXCLUDED.leak_date,
      accent_color = EXCLUDED.accent_color,
      is_active = true;

COMMIT;
