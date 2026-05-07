-- ════════════════════════════════════════════════════════════════════
-- 60-referral-code-diagnostic-and-backfill.sql              2026-05-08
--
-- يضمن أن كل profile عنده referral_code فريد.
--
-- استخدام:
--   1) شغّل القسم [DIAGNOSTIC] أولاً → شف النتائج
--   2) لو users_without_code = 0 → خلاص، لا تشغّل [BACKFILL]
--   3) لو > 0 → شغّل [BACKFILL] (محمي بـTRANSACTION)
--   4) شغّل [VERIFY] للتأكد بعد الـBACKFILL
--
-- آمن للإعادة (idempotent).
-- ════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
-- [DIAGNOSTIC] افحص الوضع الحالي (read-only)
-- ══════════════════════════════════════════════════════════════════

-- 1) عدد الأعضاء الكلي + من عنده/ما عنده كود
SELECT
    COUNT(*)                              AS total_users,
    COUNT(referral_code)                  AS users_with_code,
    COUNT(*) - COUNT(referral_code)       AS users_without_code,
    COUNT(*) FILTER (WHERE referral_code = '') AS users_with_empty_code
FROM public.profiles;


-- 2) شكل الكود (sample من 5 أعضاء)
SELECT
    full_name,
    email,
    referral_code,
    created_at::DATE AS joined
FROM public.profiles
WHERE referral_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;


-- 3) فحص تكرار محتمل (collision)
SELECT
    referral_code,
    COUNT(*) AS occurrences
FROM public.profiles
WHERE referral_code IS NOT NULL
GROUP BY referral_code
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
-- ⇒ يجب يطلع 0 صفوف. لو طلع شي → في تكرار يحتاج معالجة يدوية.


-- 4) تأكيد الـtrigger مثبّت
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles'
  AND trigger_name = 'trg_gen_referral_code';
-- ⇒ يجب يطلع 1 صف. لو فاضي → الـtrigger مفقود (أعد تشغيل SQL 15).


-- ══════════════════════════════════════════════════════════════════
-- [BACKFILL] (شغّل فقط إذا users_without_code > 0)
-- ══════════════════════════════════════════════════════════════════
-- محمي بـ:
--   - TRANSACTION: لو فشل أي جزء → ROLLBACK
--   - assertions: pre-check + post-check
--   - يستخدم نفس pattern الـtrigger (MADAR-XXXXX، 5 hex)
--   - يحاول 5 مرات لكل صف لتفادي التصادم
-- ══════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
    pre_missing  INT;
    post_missing INT;
    new_code     TEXT;
    rec          RECORD;
    attempt      INT;
    success      BOOLEAN;
BEGIN
    -- Pre-check
    SELECT COUNT(*) INTO pre_missing
    FROM public.profiles
    WHERE referral_code IS NULL OR LENGTH(TRIM(referral_code)) = 0;

    RAISE NOTICE 'Pre-backfill: % profiles بدون referral_code', pre_missing;

    IF pre_missing = 0 THEN
        RAISE NOTICE 'لا يوجد ما يستوجب backfill. اخرج.';
        RETURN;
    END IF;

    -- لكل صف بدون كود، ولّد واحد فريد
    FOR rec IN
        SELECT id FROM public.profiles
        WHERE referral_code IS NULL OR LENGTH(TRIM(referral_code)) = 0
    LOOP
        success := FALSE;
        FOR attempt IN 1..5 LOOP
            new_code := 'MADAR-' || UPPER(SUBSTR(MD5(gen_random_uuid()::text), 1, 5));
            BEGIN
                UPDATE public.profiles
                SET referral_code = new_code
                WHERE id = rec.id;
                success := TRUE;
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- تصادم نادر — أعد المحاولة
                CONTINUE;
            END;
        END LOOP;

        IF NOT success THEN
            RAISE EXCEPTION 'فشل توليد كود فريد لـ profile % بعد 5 محاولات', rec.id;
        END IF;
    END LOOP;

    -- Post-check
    SELECT COUNT(*) INTO post_missing
    FROM public.profiles
    WHERE referral_code IS NULL OR LENGTH(TRIM(referral_code)) = 0;

    IF post_missing <> 0 THEN
        RAISE EXCEPTION 'Post-check فشل: ما زال % profile بدون كود', post_missing;
    END IF;

    RAISE NOTICE '✅ تم: % profile حصلوا على كود جديد. الباقي بدون كود: %', pre_missing, post_missing;
END $$;

COMMIT;


-- ══════════════════════════════════════════════════════════════════
-- [VERIFY] (بعد BACKFILL)
-- ══════════════════════════════════════════════════════════════════

-- 1) يجب يطلع users_without_code = 0
SELECT
    COUNT(*)                        AS total_users,
    COUNT(referral_code)            AS users_with_code,
    COUNT(*) - COUNT(referral_code) AS users_without_code
FROM public.profiles;

-- 2) لا تكرار
SELECT referral_code, COUNT(*) AS occ
FROM public.profiles
GROUP BY referral_code
HAVING COUNT(*) > 1;


-- ══════════════════════════════════════════════════════════════════
-- [ROLLBACK] (لو احتجت إلغاء BACKFILL — استعمل بحذر)
-- ══════════════════════════════════════════════════════════════════
-- ملاحظة: لا يوجد سجل بأي codes تمّ تخصيصها بالـbackfill (لأن الـUPDATE
-- مدمج مع الـloop). اللجوء للـrollback يتطلب backup يدوي قبله.
--
-- توصية: اعمل CSV export لجدول profiles قبل الـBACKFILL:
--   psql ... -c "\COPY profiles TO '~/Desktop/profiles-backup-2026-05-08.csv' CSV HEADER"
-- ══════════════════════════════════════════════════════════════════
