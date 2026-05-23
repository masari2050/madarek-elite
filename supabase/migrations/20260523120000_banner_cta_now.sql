-- إضافة "الآن" لنص زر البنر الرئيسي ليطابق الموقع
UPDATE banners SET
  config = config || jsonb_build_object('cta_text', 'افتح التسريبات الآن')
WHERE banner_type = 'main';
