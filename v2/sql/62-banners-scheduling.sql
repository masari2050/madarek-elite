-- 62-banners-scheduling.sql
-- جلسة 2026-05-08 (متأخرة) — توحيد البنرات + جدولة زمنية
-- =============================================================
-- الهدف:
--   1) إضافة جدولة زمنية للبنرات (schedule_start, schedule_end)
--   2) RPC موحّد get_active_banners(target_page) يفلتر بالـtarget_pages + is_active + الجدولة
--   3) لا حذف ولا تعديل لأي عمود موجود (إضافات فقط)
--
-- مرجع: ../CLAUDE.md "جلسة 2026-05-08 (متأخرة) — توحيد البنرات"
-- يُشغّل يدوياً في Supabase SQL Editor (لا تأثير قبل التشغيل: الكود يعمل بدونها كحالة "لا جدولة")
-- =============================================================

BEGIN;

-- ============================================================
-- (1) إضافة أعمدة الجدولة لجدول banners
-- ============================================================
ALTER TABLE banners
    ADD COLUMN IF NOT EXISTS schedule_start TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS schedule_end   TIMESTAMPTZ;

COMMENT ON COLUMN banners.schedule_start IS 'بداية ظهور البنر تلقائياً (NULL = يظهر فوراً)';
COMMENT ON COLUMN banners.schedule_end   IS 'نهاية ظهور البنر تلقائياً (NULL = يبقى دائماً)';

-- فهرس للـcron-like queries المستقبلية + RPC أدناه
CREATE INDEX IF NOT EXISTS idx_banners_schedule
    ON banners (is_active, schedule_start, schedule_end)
    WHERE is_active = true;

-- ============================================================
-- (2) RPC موحّد لقراءة البنرات النشطة لصفحة معيّنة
-- ============================================================
-- يستخدمه dashboard.html و leaks.html و أي صفحة أخرى عبر:
--    SELECT * FROM get_active_banners('dashboard');
--    SELECT * FROM get_active_banners('leaks');
--
-- المنطق:
--    is_active = true
--    AND (schedule_start IS NULL OR schedule_start <= NOW())
--    AND (schedule_end   IS NULL OR schedule_end   >= NOW())
--    AND (target_pages @> ARRAY['all'] OR target_pages @> ARRAY[target_page])
-- ============================================================

-- ملاحظة: target_pages في DB قد يكون jsonb (في schema قديم) أو text[]. لذا نستخدم
--        JSONB cast + ?| operator لـcompatibility مع كلا النوعين.
--        RETURNS TABLE يستخدم JSONB لـtarget_pages — العميل في JS يفحص Array.isArray أصلاً.

CREATE OR REPLACE FUNCTION get_active_banners(target_page TEXT DEFAULT 'dashboard')
RETURNS TABLE (
    id              UUID,
    banner_type     TEXT,
    is_active       BOOLEAN,
    config          JSONB,
    target_pages    JSONB,
    sort_order      INTEGER,
    schedule_start  TIMESTAMPTZ,
    schedule_end    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.banner_type,
        b.is_active,
        b.config,
        b.target_pages::jsonb AS target_pages,
        b.sort_order,
        b.schedule_start,
        b.schedule_end,
        b.created_at,
        b.updated_at
    FROM banners b
    WHERE b.is_active = true
      AND (b.schedule_start IS NULL OR b.schedule_start <= NOW())
      AND (b.schedule_end   IS NULL OR b.schedule_end   >= NOW())
      AND (
          -- ?| works on jsonb arrays: returns true if any element matches any value in param
          b.target_pages::jsonb ?| ARRAY['all', target_page]
      )
    ORDER BY b.sort_order ASC NULLS LAST, b.banner_type ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_banners(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION get_active_banners(TEXT) IS
    'يُرجع البنرات النشطة لصفحة معيّنة، مع فلترة الجدولة الزمنية. يدعم target_page=''dashboard''/''leaks''/أي. البنرات بـtarget_pages=[''all''] تظهر دائماً.';

-- ============================================================
-- (3) Verification
-- ============================================================

-- (أ) تأكّد أن الأعمدة أُضيفت
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'banners'
      AND column_name IN ('schedule_start', 'schedule_end');

    IF col_count <> 2 THEN
        RAISE EXCEPTION 'فشل: schedule_start/schedule_end غير موجودة. وجد % فقط', col_count;
    END IF;

    RAISE NOTICE '✓ schedule_start و schedule_end أُضيفا بنجاح';
END $$;

-- (ب) تأكّد أن RPC يعمل
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM get_active_banners('dashboard');
    RAISE NOTICE '✓ get_active_banners(''dashboard'') يعمل — يُرجع % بنر(ات) نشط(ة) الآن', test_count;
END $$;

COMMIT;

-- ============================================================
-- ملاحظة: العرض في dashboard.html و leaks.html سيتحوّل تدريجياً
--   من sb.from('banners').select() إلى sb.rpc('get_active_banners', {target_page: 'dashboard'})
--   عبر الـhelper M.getActiveBanners(page) في supabase-helpers-v2.js
--
--   الكود قبل تطبيق هذا SQL: يستخدم filter يدوي JS-side (يعمل لكن بدون فلترة جدولة)
--   الكود بعد تطبيق هذا SQL: يستخدم RPC مع فلترة كاملة (يعمل بكفاءة)
-- ============================================================
