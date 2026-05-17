-- 76: refresh leak_groups.question_count + auto-trigger
-- Fixes "0 سؤال" badge on leak cards after manual question inserts

BEGIN;

-- Step 1: backfill counts from existing questions
UPDATE leak_groups lg
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.leak_group_id = lg.id
    AND COALESCE(q.disabled, false) = false
    AND COALESCE(q.status, 'active') = 'active'
);

-- Step 2: trigger to keep it in sync going forward
CREATE OR REPLACE FUNCTION refresh_leak_group_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
BEGIN
  -- Pick the relevant leak_group id from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.leak_group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If leak_group_id changed, refresh both
    IF OLD.leak_group_id IS DISTINCT FROM NEW.leak_group_id THEN
      IF OLD.leak_group_id IS NOT NULL THEN
        UPDATE leak_groups SET question_count = (
          SELECT COUNT(*) FROM questions
          WHERE leak_group_id = OLD.leak_group_id
            AND COALESCE(disabled, false) = false
            AND COALESCE(status, 'active') = 'active'
        ) WHERE id = OLD.leak_group_id;
      END IF;
    END IF;
    target_id := NEW.leak_group_id;
  ELSE
    target_id := NEW.leak_group_id;
  END IF;

  IF target_id IS NOT NULL THEN
    UPDATE leak_groups SET question_count = (
      SELECT COUNT(*) FROM questions
      WHERE leak_group_id = target_id
        AND COALESCE(disabled, false) = false
        AND COALESCE(status, 'active') = 'active'
    ) WHERE id = target_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_leak_count ON questions;
CREATE TRIGGER trg_refresh_leak_count
AFTER INSERT OR UPDATE OR DELETE ON questions
FOR EACH ROW
EXECUTE FUNCTION refresh_leak_group_count();

COMMIT;
