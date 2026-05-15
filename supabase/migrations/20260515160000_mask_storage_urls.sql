-- ============================================================
-- 🔒 إخفاء عنوان Supabase Storage عبر proxy على madarekelite.com
-- ============================================================
-- بدل ما المستخدم يشوف:
--   https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/leaks-pdfs/...
-- يصير:
--   https://madarekelite.com/files/...
-- ============================================================

BEGIN;

-- تحديث pdf_url لكل التسريبات (الأربعاء + الخميس + أي مستقبلية)
UPDATE leak_groups
SET pdf_url = REPLACE(
    pdf_url,
    'https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/leaks-pdfs/',
    'https://madarekelite.com/files/'
)
WHERE pdf_url LIKE '%czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/leaks-pdfs/%';

-- تحديث image_url للأسئلة المصوّرة
UPDATE questions
SET image_url = REPLACE(
    image_url,
    'https://czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/question-figures/',
    'https://madarekelite.com/img/'
)
WHERE image_url LIKE '%czzcmbxejxbotjemyuqf.supabase.co/storage/v1/object/public/question-figures/%';

COMMIT;

-- التحقق
SELECT 'leak_groups' AS tbl, count(*) AS rows_with_proxy
FROM leak_groups WHERE pdf_url LIKE 'https://madarekelite.com/files/%'
UNION ALL
SELECT 'questions', count(*)
FROM questions WHERE image_url LIKE 'https://madarekelite.com/img/%';
