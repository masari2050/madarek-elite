-- تحويل بنر التحصيلي للون الأزرق المايل (نفس بنر "اشترك الآن")
UPDATE banners SET
  config = config || jsonb_build_object(
    'bg_left', '#6D5DF6',
    'bg_right', '#4838C7'
  )
WHERE banner_type = 'main';
