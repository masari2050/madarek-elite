-- ════════════════════════════════════════════════════════════════
-- SQL 70 — توقعات النخبة (Predictions)
-- ════════════════════════════════════════════════════════════════
-- إضافة عمود is_predicted لتمييز أسئلة "توقعات النخبة"
-- (الأسئلة المتوقّعة لاختبار التحصيلي ١٤٤٧، منتقاة من نخبة المصادر)
--
-- الفلسفة: مختلف عن is_top_repeated (تجميعات اختبارات سابقة)
--   - is_top_repeated = أسئلة تكرّرت في اختبارات سابقة (مُثبَتة)
--   - is_predicted    = أسئلة متوقّعة للاختبار القادم (تنبؤية)
--
-- ملاحظة: السؤال يقدر يكون الاثنين معاً (متوقّع + سبق تكراره)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS is_predicted BOOLEAN DEFAULT false;

-- فهرس جزئي للأداء — يستخدم فقط للأسئلة المتوقّعة الفعّالة
CREATE INDEX IF NOT EXISTS idx_questions_predicted
ON questions(section, subject)
WHERE is_predicted = true AND disabled = false;

-- التحقق
DO $$
DECLARE
    v_predicted_count INT;
BEGIN
    SELECT COUNT(*) INTO v_predicted_count
    FROM questions
    WHERE is_predicted = true;

    RAISE NOTICE '✅ SQL 70 شُغّل بنجاح';
    RAISE NOTICE '   الأسئلة المتوقّعة الحالية: %', v_predicted_count;
    RAISE NOTICE '   (ستزيد تدريجياً بعد رفع PDFs التوقعات)';
END $$;
