-- QA Fixes — تسريبات التحصيلي الأربعاء ١٣ مايو
-- بعد مراجعة wakil على 188 سؤال، 7 أسئلة بحاجة تصحيح correct_index
BEGIN;

-- 1. Math: إزاحة نقطة (2,6) → الصحيح (0, 3) = index 1
UPDATE questions SET correct_index = 1 WHERE id = '1644d1b0-1e8d-4d23-a5cf-b0eda74dcd91';

-- 2. Math: متجهات b=3 = index 2
UPDATE questions SET correct_index = 2 WHERE id = 'cab2a62e-2e76-446b-bba5-9e0ed8d6b87f';

-- 3. Math: f∘g(3) = 2/18 = index 2
UPDATE questions SET correct_index = 2 WHERE id = 'c4a5f749-aabb-4b8d-9b88-ab1b6c2cb9d8';

-- 4. Physics: الإشعاعات الكهرومغناطيسية = الميكروويف = index 1
UPDATE questions SET correct_index = 1 WHERE id = 'b337c053-3cdf-4e3a-9aac-d2da11ea7ef9';

-- 5. Physics: السرعة الزاوية π/9 (الكوكب 18 ساعة) — نضيف الخيار الصحيح ونغيّر correct_index
UPDATE questions SET
    choices = '["π/9","18π","36/2 π","36π"]'::jsonb,
    correct_index = 0,
    explanation = 'ω = 2π/T. T = 18 ساعة، فـ ω = 2π/18 = π/9.'
    WHERE id = '4c98a558-cc8e-4017-9c3c-da6cbbcacaf6';

-- 6. Biology: شخص فصيلة A يأخذ A أو O (الصحيح طبياً) = index 0
UPDATE questions SET correct_index = 0,
    explanation = 'مريض فصيلة A يأخذ دماً من فصيلة A أو O (المعطي العام). إعطاؤه دم B أو AB قد يسبّب تفاعل مناعي قاتل.'
    WHERE id = 'f24e7c09-67e8-4dc2-95b1-b25cbed4cb5b';

-- 7. Biology: قشور القرش placoid (صفائحية)
-- الخيارات الحالية: قُرصية / مشطية / صفائحية / لامعة → الصحيح index 2
UPDATE questions SET correct_index = 2,
    explanation = 'قشور القرش (والأسماك الغضروفية) صفائحية (placoid) — مغطّاة بالـdentine وتشبه أسنان صغيرة.'
    WHERE id = 'b32ec772-e89e-4dde-86e3-8d31716e0e5b';

COMMIT;

-- تحقّق
SELECT id, subject, correct_index, question_text
FROM questions
WHERE id IN (
    '1644d1b0-1e8d-4d23-a5cf-b0eda74dcd91',
    'cab2a62e-2e76-446b-bba5-9e0ed8d6b87f',
    'c4a5f749-aabb-4b8d-9b88-ab1b6c2cb9d8',
    'b337c053-3cdf-4e3a-9aac-d2da11ea7ef9',
    '4c98a558-cc8e-4017-9c3c-da6cbbcacaf6',
    'f24e7c09-67e8-4dc2-95b1-b25cbed4cb5b',
    'b32ec772-e89e-4dde-86e3-8d31716e0e5b'
);
