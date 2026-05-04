-- ============================================================
-- Migration 37 — إصلاح ambiguous column في RPCs الخاصة بالاختبار
-- ============================================================
-- السبب: أعمدة RETURN TABLE لها نفس أسماء أعمدة mock_exam_registrations
-- الحل: تأهيل اسم العمود بـtable alias

CREATE OR REPLACE FUNCTION get_active_mock_exam_status()
RETURNS TABLE (
    exam_id UUID,
    exam_type TEXT,
    title TEXT,
    starts_at TIMESTAMPTZ,
    duration_min INT,
    questions_count INT,
    total_registered INT,
    user_registered BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exam mock_exams%ROWTYPE;
BEGIN
    SELECT * INTO v_exam FROM mock_exams
    WHERE is_active = true
    ORDER BY starts_at DESC
    LIMIT 1;

    IF v_exam.id IS NULL THEN RETURN; END IF;

    RETURN QUERY SELECT
        v_exam.id,
        v_exam.exam_type,
        v_exam.title,
        v_exam.starts_at,
        v_exam.duration_min,
        v_exam.questions_count,
        (SELECT COUNT(*)::INT FROM mock_exam_registrations r WHERE r.exam_id = v_exam.id),
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM mock_exam_registrations r
            WHERE r.exam_id = v_exam.id AND r.user_id = auth.uid()
        ));
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_mock_exam_status() TO authenticated, anon;

CREATE OR REPLACE FUNCTION admin_list_mock_exam_registrations(p_exam_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    registered_at TIMESTAMPTZ,
    score_correct INT,
    score_total INT,
    rank_position INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        r.user_id,
        p.full_name,
        u.email::text,
        r.registered_at,
        r.score_correct,
        r.score_total,
        r.rank_position
    FROM mock_exam_registrations r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.exam_id = p_exam_id
    ORDER BY r.registered_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_mock_exam_registrations(UUID) TO authenticated;

-- تحقق
SELECT 'OK' AS status;
