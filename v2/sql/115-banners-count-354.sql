-- بعد مراجعة الجودة حُذفت 3 أسئلة غير صالحة: عدد أسئلة 6-10 سبتمبر صار 354 بدل 357
BEGIN;
UPDATE banners SET config = jsonb_set(config, '{subtitle}', to_jsonb(replace(config->>'subtitle', '357', '354')))
WHERE id = '51d0dc49-aba5-4cdf-8a4c-3ecb76ab1896' AND config->>'subtitle' LIKE '%357%';
UPDATE banners SET config = jsonb_set(config, '{text}', to_jsonb(replace(config->>'text', '357', '354')))
WHERE id = 'b511e034-42c3-4052-a214-6f1d14111ba2' AND config->>'text' LIKE '%357%';
COMMIT;
