-- ============================================================
-- مدارك النخبة v2 — Migration 50 (defensive)
-- Backup snapshot — يفحص وجود كل جدول قبل النسخ
-- ============================================================
-- v2: يستخدم DO block لكل جدول → لو الجدول مفقود يتجاوزه.
--
-- لو احتجت rollback (مثال profiles):
--   BEGIN;
--   TRUNCATE public.profiles CASCADE;
--   INSERT INTO public.profiles SELECT * FROM backup_2026_05_06.profiles;
--   COMMIT;
-- ============================================================

CREATE SCHEMA IF NOT EXISTS backup_2026_05_06;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        -- المستخدمين
        'profiles',
        -- المحتوى
        'questions', 'attempts', 'reports',
        -- المالية
        'payments', 'coupons', 'plans', 'expenses',
        -- الإحالات
        'referrals', 'referral_payouts',
        -- المسابقة
        'mock_exams', 'mock_exam_attempts', 'mock_exam_attempt_answers',
        'mock_exam_registrations',
        -- التسريبات
        'leak_groups',
        -- الإعدادات
        'site_settings', 'banners'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        IF EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public' AND tablename = tbl
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS backup_2026_05_06.%I AS SELECT * FROM public.%I',
                tbl, tbl
            );
            RAISE NOTICE 'Backed up: %', tbl;
        ELSE
            RAISE NOTICE 'Skipped (not found): %', tbl;
        END IF;
    END LOOP;
END $$;

-- للتحقّق بعد التشغيل:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'backup_2026_05_06' ORDER BY tablename;
