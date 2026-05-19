-- 90: Fix duplicate choices in ruler precision question (SQL 86 typo)
-- Issue: option A and B were identical → invalid question
-- Fix: replace option B with a plausible distractor

BEGIN;

UPDATE questions SET
  choices = '["زيادة عدد التدريجات في وحدة الطول", "زيادة سُمك المسطرة", "زيادة طول المسطرة", "تقليل طول المسطرة"]'::jsonb,
  explanation = 'دقة أداة القياس تتحسن بزيادة عدد التدريجات في وحدة الطول (تدريج أصغر = قراءة أدقّ). طول المسطرة أو سُمكها لا يؤثران في دقّة القراءة، بل في المدى الذي تقيسه.'
WHERE id = '9cdeaf8b-1d76-4565-9454-e668f00257ab'
  AND correct_index = 0;  -- safety: ensure A remains correct

COMMIT;
