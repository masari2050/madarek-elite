-- ═══════════════════════════════════════════════════════════════
-- Migration 18 — جدولة cron يومي لتأكيد الإحالات المعلّقة
-- ═══════════════════════════════════════════════════════════════
--
-- الهدف:
--   • الإحالات بعد دفع الطالب تكون cash_status = 'pending'
--   • بعد 7 أيام (نافذة الاسترجاع) → تصبح 'confirmed' ورصيد المُحيل يُحتسب
--   • لازم trigger يومي يشغّل confirm_pending_referrals()
--
-- المتطلبات:
--   • Supabase يدعم pg_cron افتراضياً (extension مفعّل تلقائياً في المشاريع)
--   • لو ظهر خطأ "extension pg_cron does not exist":
--       → اذهب لـ Dashboard → Database → Extensions → ابحث pg_cron → Enable
--
-- القاعدة الذهبية:
--   • إضافات فقط (IF NOT EXISTS حيثما ممكن)
--   • لا حذف ولا تعديل للبنية الموجودة
--   • الـjob يشتغل بهوية postgres (SECURITY DEFINER) → لا مشكلة RLS
--
-- الجدولة:
--   • يوميّاً الساعة 02:00 UTC (= 05:00 الرياض)
--   • ساعة هادئة (الطلاب نائمين → لا أحد يتأثر لو حصل تأخير بسيط)
-- ═══════════════════════════════════════════════════════════════

-- ── 1) تأكّد من pg_cron (يُتجاهل لو مفعّل) ──
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 2) احذف الـjob القديم لو موجود (لتجنّب التكرار عند إعادة التشغيل) ──
DO $$
BEGIN
    PERFORM cron.unschedule('confirm-pending-referrals-daily');
EXCEPTION WHEN OTHERS THEN
    -- الـjob غير موجود → تجاهل
    NULL;
END $$;

-- ── 3) جدولة الـjob اليومي ──
-- صيغة cron: minute hour day-of-month month day-of-week
-- "0 2 * * *" = الساعة 2:00 UTC يومياً
SELECT cron.schedule(
    'confirm-pending-referrals-daily',
    '0 2 * * *',
    $$ SELECT public.confirm_pending_referrals(); $$
);

-- ── 4) (اختياري) جدول لتتبّع تنفيذ الـcron ──
-- يُفيد لمراقبة: هل اشتغل كل يوم؟ كم إحالة أُكّدت؟
CREATE TABLE IF NOT EXISTS cron_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result JSONB,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS cron_logs_executed_at_idx
    ON cron_logs(executed_at DESC);

-- ── 5) RLS للـcron_logs (admin فقط) ──
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cron_logs_admin_select" ON cron_logs;
CREATE POLICY "cron_logs_admin_select" ON cron_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'staff')
        )
    );

-- ── 6) wrapper RPC يسجّل النتيجة في cron_logs ──
-- هذا ما نستخدمه للـcron الحقيقي — بدل السكدجولر المباشر.
-- يُبقي سجلّاً قابلاً للمراجعة من admin.
CREATE OR REPLACE FUNCTION confirm_pending_referrals_logged()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := confirm_pending_referrals();

    INSERT INTO cron_logs (job_name, result, notes)
    VALUES (
        'confirm-pending-referrals-daily',
        v_result,
        'تشغيل تلقائي يومي الساعة 02:00 UTC'
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_pending_referrals_logged() TO authenticated;

-- ── 7) حدّث الـcron ليستخدم النسخة المسجّلة ──
DO $$
BEGIN
    PERFORM cron.unschedule('confirm-pending-referrals-daily');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'confirm-pending-referrals-daily',
    '0 2 * * *',
    $$ SELECT public.confirm_pending_referrals_logged(); $$
);

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) الـjobs المجدولة:
--    SELECT jobid, schedule, jobname, command, active
--    FROM cron.job
--    WHERE jobname = 'confirm-pending-referrals-daily';
--
-- 2) آخر تنفيذات الـjob:
--    SELECT jobname, status, start_time, end_time, return_message
--    FROM cron.job_run_details
--    ORDER BY start_time DESC
--    LIMIT 10;
--
-- 3) سجلّ الإحالات المؤكّدة:
--    SELECT * FROM cron_logs ORDER BY executed_at DESC LIMIT 10;
--
-- 4) اختبار يدوي (للتشغيل الفوري):
--    SELECT public.confirm_pending_referrals_logged();
-- ═══════════════════════════════════════════════════════════════
