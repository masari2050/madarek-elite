-- بطلب عبدالله (13 سبتمبر): العرض مفتوح مبدئياً حتى نهاية 1 أكتوبر (23:59 بتوقيت السعودية) أو حتى يأمر بإيقافه،
-- وبدون أي تاريخ أو مدة في النصوص (المدة الطويلة تعطي المتردد فرصة للتأجيل) — نص تحفيزي بدلها.
-- السابق: schedule_end و KSA96.expires_at = '2026-09-27 20:59:59+00' · subtitle = 'بكود KSA96 حتى 27 سبتمبر'
-- كود الشريك ABAAD ينزل إلى 15% عند نهاية العرض العام (لا قبله، حتى لا يصير العرض العام أفضل من كود الشريك فيضيع عليه الإسناد)
BEGIN;

UPDATE banners
SET schedule_end = '2026-10-01 20:59:59+00',
    config = config || jsonb_build_object('subtitle', 'عرض مؤقت بكود KSA96 — استغل الفرصة')
WHERE id = '84064beb-6794-4b89-b677-e6c723c9a721' AND banner_type = 'campaign';

UPDATE coupons SET expires_at = '2026-10-01 20:59:59+00' WHERE code = 'KSA96';

SELECT cron.schedule(
  'abaad-post-natday-15pct',
  '0 21 1 10 *',
  $job$UPDATE coupons SET discount_value = 15 WHERE code = 'ABAAD' AND discount_type = 'percentage'; SELECT cron.unschedule('abaad-post-natday-15pct');$job$
);

COMMIT;
