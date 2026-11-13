-- ═══════════════════════════════════════════════════════════════
-- SQL 128 — آخر نشاط العضو يتحدث مع كل تدريب
-- المشكلة: profiles.last_seen_at لا يتحدث من التطبيق ولا من صفحة التدريب،
-- فعضو يتدرب اليوم يظهر «خامداً» في أسفل تحليل المستخدمين (15 حساباً وقت الكتابة).
-- الحل: trigger على attempts يرفع last_seen_at (مرة كل 5 دقائق كحد أقصى) + تعبئة القديم.
-- ═══════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION public.touch_last_seen_on_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    UPDATE profiles
       SET last_seen_at = now()
     WHERE id = NEW.user_id
       AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;   -- لا نعطّل حفظ الإجابة لأي سبب
END
$fn$;

DROP TRIGGER IF EXISTS trg_touch_last_seen_on_attempt ON public.attempts;
CREATE TRIGGER trg_touch_last_seen_on_attempt
AFTER INSERT ON public.attempts
FOR EACH ROW EXECUTE FUNCTION public.touch_last_seen_on_attempt();

-- تعبئة الحسابات التي آخر تدريب لها أحدث من آخر دخول مسجَّل
UPDATE profiles p
   SET last_seen_at = la.last
  FROM (SELECT user_id, max(created_at) AS last FROM attempts GROUP BY user_id) la
 WHERE la.user_id = p.id
   AND (p.last_seen_at IS NULL OR la.last > p.last_seen_at);

COMMIT;
