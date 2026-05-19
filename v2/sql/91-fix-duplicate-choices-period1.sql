-- 91: Fix duplicate/invalid choices in 12 Period 1 questions (quality audit 2026-05-19)
-- Each UPDATE keeps the existing correct_index pointing at the same correct answer.
-- Safety: AND correct_index = X ensures we don't corrupt by accident.

BEGIN;

-- 1) ffce2571 — friction direction: 'شمالاً' duplicated → replace duplicate with 'شرقاً'
UPDATE questions SET
  choices = '["شمالاً", "غرباً", "جنوباً", "شرقاً"]'::jsonb
WHERE id = 'ffce2571-aa69-4036-8dcf-d0a072df490b' AND correct_index = 2;

-- 2) 05c9fcf6 — work on system: A & B identical → replace B with 'سالباً وتزداد'
UPDATE questions SET
  choices = '["سالباً وتقلّ طاقة النظام", "سالباً وتزداد طاقة النظام", "موجباً وتزداد طاقة النظام", "موجباً وتقلّ طاقة النظام"]'::jsonb
WHERE id = '05c9fcf6-0a4f-4217-ade8-721a749e64b2' AND correct_index = 2;

-- 3) 17412055 — volt equivalent: A & D both 'جول/كولوم' → replace D with 'أمبير/كولوم'
UPDATE questions SET
  choices = '["جول/كولوم", "جول/أمبير", "كولوم/أمبير", "أمبير/كولوم"]'::jsonb
WHERE id = '17412055-b2b3-4cca-a1f2-40dd27841eda' AND correct_index = 0;

-- 4) 03531e11 — dice probability: C & D both '1/6' → replace D with correct simplified form '1/18'
UPDATE questions SET
  choices = '["2/18", "2/36", "1/6", "1/18"]'::jsonb
WHERE id = '03531e11-669a-43bd-8dbd-9fad7dfa96c1' AND correct_index = 1;

-- 5) 185a734b — salt classification: B & C 'مخلوطاً' duplicate → replace C with 'محلولاً'
UPDATE questions SET
  choices = '["عنصراً", "مخلوطاً", "محلولاً", "مركّباً"]'::jsonb
WHERE id = '185a734b-a28e-4436-bd97-05133dc97142' AND correct_index = 3;

-- 6) dabfc05e — equilibrium law: has 5 choices (invalid) → keep first 4 only
UPDATE questions SET
  choices = '["K_eq = [H₂O]²[O₂]/[H₂O₂]²", "K_eq = [H₂O][O₂]/[H₂O₂]²", "K_eq = [O]/[H₂O₂]²", "K_eq = [H₂O]²[O₂]"]'::jsonb
WHERE id = 'dabfc05e-a308-4080-9613-8365f2603bcb' AND correct_index = 0;

-- 7) d4a5f9d2 — AgI solubility (Ksp=4e-12, S=2e-6): B & D '2 × 10⁻¹²' duplicate → replace D
UPDATE questions SET
  choices = '["2 × 10⁻⁶", "2 × 10⁻¹²", "4 × 10⁻⁶", "4 × 10⁻¹²"]'::jsonb
WHERE id = 'd4a5f9d2-5db5-49b7-9508-21584255ebb4' AND correct_index = 0;

-- 8) 34dcc59f — salmon behavior: B & C 'تعود' duplicate → replace C with 'غريزي'
UPDATE questions SET
  choices = '["مطبوع", "تعوّد", "غريزي", "إدراكي"]'::jsonb
WHERE id = '34dcc59f-05d1-4b7b-afb6-b7078a1ccbd1' AND correct_index = 0;

-- 9) 41b17054 — bird parasitism: B & C 'تطفل' duplicate → replace C with 'افتراس'
UPDATE questions SET
  choices = '["تنافس", "تطفّل", "افتراس", "تعايش"]'::jsonb
WHERE id = '41b17054-96c9-44b4-beef-89f619701f59' AND correct_index = 1;

-- 10) 315a8c20 — keratin: TWO pairs of duplicates → fully rebuild with distinct distractors
UPDATE questions SET
  choices = '["الكيراتين", "الكولاجين", "الميلانين", "الإيلاستين"]'::jsonb
WHERE id = '315a8c20-ad20-49a0-a12e-a6783b08c01d' AND correct_index = 0;

-- 11) 603c5c0e — proton: B & C identical → replace C with 'يماثل شحنة وكتلة الإلكترون'
UPDATE questions SET
  choices = '["يماثل شحنة وكتلة النيوترون", "يماثل شحنة الإلكترون وكتلة النيوترون", "يماثل شحنة وكتلة الإلكترون", "يماثل شحنة البوزيترون وكتلة النيوترون"]'::jsonb
WHERE id = '603c5c0e-6783-4137-be50-d7b3ff3e99bc' AND correct_index = 3;

-- 12) e2f640a8 — spontaneous emission: C & D identical → replace D with absorption case
UPDATE questions SET
  choices = '["انتقال الذرة المُثارة إلى الحالة المستقرة باعثةً فوتوناً طاقته تساوي فرق الطاقتين", "انتقال الذرة المستقرة إلى الحالة المُثارة باعثةً فوتوناً", "انتقال الذرة المُثارة إلى الحالة المستقرة دون انبعاث فوتونات", "امتصاص الذرة المستقرة فوتوناً لتنتقل إلى الحالة المُثارة"]'::jsonb
WHERE id = 'e2f640a8-e969-4409-a704-c6ed58786331' AND correct_index = 0;

COMMIT;
