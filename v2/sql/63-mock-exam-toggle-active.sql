-- 63-mock-exam-toggle-active.sql
-- جلسة 2026-05-09 — toggle منفصل لكل اختبار محاكي
-- =============================================================
-- السياق: عبدالله طلب toggle مستقل لكل اختبار في جدول الاختبارات المحاكية
--   (بدلاً من toggle عام يخفي البنر لكل الاختبارات)
--
-- الاستخدام:
--   admin_set_mock_exam_active(p_exam_id UUID, p_is_active BOOLEAN)
--
-- في dashboard.html: get_active_mock_exam_status() يفلتر بـis_active=true تلقائياً
--   (لذا اختبار is_active=false → البنر يختفي عند الطلاب)
-- =============================================================

CREATE OR REPLACE FUNCTION admin_set_mock_exam_active(
    p_exam_id UUID,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    UPDATE mock_exams
       SET is_active = p_is_active
     WHERE id = p_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_mock_exam_active(UUID, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION admin_set_mock_exam_active(UUID, BOOLEAN) IS
    'Toggle visibility of a single mock exam banner. Setting is_active=false hides the banner from dashboard immediately while keeping the exam record + registrations.';
