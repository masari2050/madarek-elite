-- تفعيل البنر الرئيسي بمحتوى التحصيلي للموقع والتطبيق
-- ينتهي تلقائياً يوم 5 يونيو (بداية الفترة الثانية)
UPDATE banners SET
  is_active = true,
  schedule_end = '2026-06-05 00:00:00+00',
  config = jsonb_build_object(
    'tag', 'تسريبات التحصيلي',
    'title', 'الفترة الأولى كاملة',
    'subtitle', 'كل أيام الاختبار + شروح مبسّطة — اضغط للوصول',
    'bg_left', '#4C1D95',
    'bg_right', '#7C3AED',
    'cta_text', 'افتح التسريبات',
    'btn_color', '#FFD700',
    'btn_text_color', '#1A1428',
    'link', '/leaks.html',
    'countdown_target', '2026-06-05T05:00:00Z',
    'countdown_label', 'الفترة الثانية تبدأ بعد'
  )
WHERE banner_type = 'main';
