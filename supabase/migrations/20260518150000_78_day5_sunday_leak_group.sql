-- 78: Day 5 (Sunday May 17 2026) leak_group placeholder
-- Questions inserted progressively via subsequent migrations as they're extracted.

BEGIN;

INSERT INTO leak_groups (id, title, description, section, leak_date, accent_color, is_active, created_at)
VALUES (
    '7d5c8a6b-9e3f-4a2d-b1c4-58a0d3f7e982'::uuid,
    'تسريبات التحصيلي – الأحد ١٧ مايو ٢٠٢٦',
    'تسريبات اختبار التحصيلي الفترة الأولى – اليوم الخامس (الأحد). أربع مواد: رياضيات + فيزياء + كيمياء + أحياء.',
    'tahsili',
    '2026-05-17',
    '#10B981',  -- emerald (مختلف عن الأيام السابقة)
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      description = EXCLUDED.description,
      leak_date = EXCLUDED.leak_date,
      accent_color = EXCLUDED.accent_color,
      is_active = true;

COMMIT;
