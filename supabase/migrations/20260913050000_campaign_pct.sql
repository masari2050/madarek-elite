-- حملة اليوم الوطني: نسبة الخصم في الإعداد (الواجهات تحسب الأسعار منها ومن جدول plans: القديم مشطوب والجديد ظاهر)
-- السابق: subtitle = 'بكود KSA96 حتى 27 سبتمبر — شهري 79 · 3 شهور 199 · سنوي 639'
BEGIN;
UPDATE banners
SET config = config || jsonb_build_object('pct', 20, 'subtitle', 'بكود KSA96 حتى 27 سبتمبر')
WHERE id = '84064beb-6794-4b89-b677-e6c723c9a721' AND banner_type = 'campaign';
COMMIT;
