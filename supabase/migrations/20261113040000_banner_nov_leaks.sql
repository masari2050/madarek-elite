-- SQL 129 — بنر الأعضاء: تسريبات قدرات 10 و11 و12 نوفمبر (87 سؤالاً). ينطفئ تلقائياً 20 نوفمبر.
UPDATE banners
   SET config = config || jsonb_build_object(
         'tag', 'تسريبات القدرات',
         'title', 'اختبارات 10 و11 و12 نوفمبر',
         'title_accent', '10 و11 و12 نوفمبر',
         'subtitle', '87 سؤالاً جديداً من ثلاثة أيام اختبار — اختبر نفسك فيها، فقد تتكرر عليك في اختبارك',
         'cta_text', 'افتح التسريبات الآن',
         'link', '/leaks.html',
         'day_badge', 'جديد'),
       is_active = true,
       schedule_start = NULL,
       schedule_end = '2026-11-20 20:59:00+00'
 WHERE banner_type = 'main';
