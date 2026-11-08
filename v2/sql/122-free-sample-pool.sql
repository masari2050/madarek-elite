-- 122 — مجموعة الأسئلة المجانية (is_free_sample)
-- الهدف: المسجّل المجاني يحصل اختبار المستوى + 5 أسئلة يومياً من أسئلة شرحها واضح وغير معقّدة
-- (قرار عبدالله 2026-11-08: الأسئلة بالبداية دائماً اللي شرحها واضح وينفع، لا معقّدة ولا أرقام ولخبطة)
-- المعايير: استيرادات 17 أغسطس → 12 سبتمبر 2026 (مراجَعة بالوكلاء، مفاتيحها متحققة)، بلا صور ولا قطع،
--   4 خيارات قصيرة، شرح 45-300 حرفاً (الكمي ≤200 وبلا جذور/أسس/تحليل)، نص ≤170 (الكمي ≤130)
-- الرجوع: UPDATE questions SET is_free_sample=false;  (عمود إضافي فقط، لا يمس شيئاً آخر)

BEGIN;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_free_sample boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_questions_free_sample ON questions(section) WHERE is_free_sample = true AND disabled = false;

UPDATE questions SET is_free_sample = true
WHERE id IN (
select id from questions
 where disabled=false and section in ('quant','verbal') and image_url is null and passage_id is null
  and created_at >= '2026-08-17' and jsonb_array_length(choices)=4
  and correct_index between 0 and 3
  and explanation is not null
  and strpos(explanation, chr(92)||'n')=0
  and question_text !~ '(الشكل|الرسم|الجدول|المخطط|المجاور|أعلاه|التالي:)'
  and explanation !~ '(الشكل|الرسم|الجدول|المخطط)'
  and (select max(length(x)) from jsonb_array_elements_text(choices) x) <= 32
  and (
    (section='verbal' and length(question_text) between 15 and 170 and length(explanation) between 45 and 300)
    or
    (section='quant' and coalesce(sub_section,'') <> 'التحليل'
       and length(question_text) between 15 and 130 and length(explanation) between 45 and 200
       and question_text !~ '[√^⁴⁵⁶⁷⁸⁹]' and explanation !~ '[√^]'
       and question_text !~ '(−٣\)|\^\(|مرافق|لوغاريتم)')
  )
);

DO $$
DECLARE q int; v int;
BEGIN
  SELECT count(*) INTO q FROM questions WHERE is_free_sample AND section='quant' AND disabled=false;
  SELECT count(*) INTO v FROM questions WHERE is_free_sample AND section='verbal' AND disabled=false;
  IF q < 120 OR v < 120 THEN
    RAISE EXCEPTION 'free sample pool too small: quant=% verbal=%', q, v;
  END IF;
  RAISE NOTICE 'free sample pool: quant=% verbal=%', q, v;
END $$;

COMMIT;
