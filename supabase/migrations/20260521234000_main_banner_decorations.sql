-- إضافة LIVE dot + بادج "الفترة الأولى مكتملة" للبنر الرئيسي
-- يطابق تصميم الموقع 100%
UPDATE banners SET
  config = config || jsonb_build_object(
    'live_dot', true,
    'day_badge', 'الفترة الأولى مكتملة',
    'decorations', true
  )
WHERE banner_type = 'main';
