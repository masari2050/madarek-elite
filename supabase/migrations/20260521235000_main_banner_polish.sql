-- صقل البنر الرئيسي: CTA أبيض + كلمة "كاملة" بالذهبي داخل العنوان
-- يطابق الموقع 100%
UPDATE banners SET
  config = config || jsonb_build_object(
    'title_accent', 'كاملة',
    'btn_color', '#FFFFFF',
    'btn_text_color', '#5B21B6'
  )
WHERE banner_type = 'main';
