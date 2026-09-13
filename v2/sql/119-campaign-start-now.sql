-- بطلب عبدالله (13 سبتمبر): عرض اليوم الوطني يبدأ الآن بدل 20 سبتمبر — النهاية كما هي 27 سبتمبر 23:59 بتوقيت السعودية
-- الكود KSA96 صالح أصلاً من الآن (expires_at فقط). السابق: schedule_start = '2026-09-19 21:00:00+00'
BEGIN;
UPDATE banners SET schedule_start = now()
WHERE id = '84064beb-6794-4b89-b677-e6c723c9a721' AND banner_type = 'campaign';
COMMIT;
