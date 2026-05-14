BEGIN;

UPDATE banners
SET config = jsonb_build_object(
    'keyword', 'خدمة 24 ساعة',
    'keyword_color', '#FFD700',
    'text', 'لأي استفسار أو مشكلة في المنصّة — تواصل معنا واتساب  ٩٦٦٥٥٣٣٣٩٨٨٥+ · ندعمك على مدار الساعة',
    'text_color', '#FFFFFF',
    'bg_color', '#10B981',
    'speed', 45
),
is_active = true
WHERE banner_type = 'ticker';

SELECT id, is_active, config FROM banners WHERE banner_type = 'ticker';

COMMIT;
