-- 84: Deduplicate Period 1 questions across the 6 leak_groups
-- 72 duplicate text groups found:
--   - 51 cross between الخميس يلو ومهندسة (same exam, two sources)
--   - 17 cross between other Period 1 days
--   - 3 triple-overlaps
--   - 1 within الأربعاء itself
-- Strategy: keep the oldest (by leak_date, then created_at, then id);
-- disable the rest.

BEGIN;

WITH dups AS (
  SELECT
    q.id,
    ROW_NUMBER() OVER (
      PARTITION BY md5(regexp_replace(coalesce(q.question_text,''), '[[:space:]]+|[.,،;:!؟?]', '', 'g'))
      ORDER BY lg.leak_date, q.created_at, q.id
    ) AS rn
  FROM questions q
  JOIN leak_groups lg ON lg.id = q.leak_group_id
  WHERE q.leak_group_id IN (
    'cfaf82ac-dc99-43ac-8d00-d44133802245',  -- Wed
    '002b90df-4849-4842-88cd-8c4c11253573',  -- Thu (yelo)
    'c48e7dd9-8dc6-47c4-9a30-4b53766fb361',  -- Thu (mohandesa)
    'a4b1c2d3-7654-4321-8aaa-fedc12345678',  -- Fri
    'b6a2c3d4-7777-4321-8aaa-fed012345001',  -- Sat morning
    'f62fd04b-fcf1-e144-5931-039d178c582e'   -- Sat evening
  )
    AND coalesce(q.disabled, false) = false
)
UPDATE questions
SET disabled = true
WHERE id IN (SELECT id FROM dups WHERE rn > 1);

COMMIT;
