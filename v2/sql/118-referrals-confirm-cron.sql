-- تأكيد الإحالات تلقائياً بعد 7 أيام (تصميم SQL 18 / 66 المعتمد): الـjob ما جُدول أبداً لأن pg_cron لم يكن مفعّلاً
-- (فُعّل 2026-09-10). cron.schedule بنفس الاسم يستبدل أي job قديم — آمن لإعادة التشغيل.
SELECT cron.schedule(
  'confirm-pending-referrals-daily',
  '0 3 * * *',
  $job$INSERT INTO cron_logs (job_name, result, notes) SELECT 'confirm-pending-referrals-daily', confirm_pending_referrals(), 'Daily auto-confirm of referrals after 7-day hold period';$job$
);

-- تشغيل أول مرة الآن للإحالات المتأخرة (نفس ما يفعله الـjob يومياً)
INSERT INTO cron_logs (job_name, result, notes)
SELECT 'confirm-pending-referrals-daily', confirm_pending_referrals(), 'first run after enabling pg_cron (migration 20260913070000)';
