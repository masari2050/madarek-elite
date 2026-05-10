-- ============================================================
-- Migration 39 — إصلاح تعارض column reference "id" is ambiguous
-- ============================================================
-- نفس مشكلة SQL 37: RETURNS TABLE (id ...) يتعارض مع mock_exams.id داخل البدنة
-- الإصلاح: #variable_conflict use_column في كل دالة (أبسط وأقل تعديل)
-- يُشغّل مرة واحدة في Supabase SQL Editor

-- ── 1. _pick_balanced_questions (يحتاج use_column) ─────────────
CREATE OR REPLACE FUNCTION _pick_balanced_questions(p_section TEXT, p_total INT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_n INT;
BEGIN
    SELECT COUNT(*)::INT INTO v_n
    FROM (SELECT DISTINCT sub_section FROM questions
          WHERE section = p_section
            AND COALESCE(disabled, false) = false
            AND COALESCE(status, 'active') = 'active'
            AND sub_section IS NOT NULL
            AND sub_section <> '') x;

    IF v_n = 0 THEN
        RETURN QUERY
        SELECT q.id FROM questions q
        WHERE q.section = p_section
          AND COALESCE(q.disabled, false) = false
          AND COALESCE(q.status, 'active') = 'active'
        ORDER BY random()
        LIMIT p_total;
        RETURN;
    END IF;

    RETURN QUERY
    WITH subs AS (
        SELECT DISTINCT sub_section AS s,
               ROW_NUMBER() OVER (ORDER BY sub_section) AS idx
        FROM questions
        WHERE section = p_section
          AND COALESCE(disabled, false) = false
          AND COALESCE(status, 'active') = 'active'
          AND sub_section IS NOT NULL
          AND sub_section <> ''
    ),
    quotas AS (
        SELECT s,
               (p_total / v_n) + CASE WHEN idx <= (p_total - (p_total/v_n)*v_n) THEN 1 ELSE 0 END AS qq
        FROM subs
    )
    SELECT q.id
    FROM quotas qu
    CROSS JOIN LATERAL (
        SELECT q1.id FROM questions q1
        WHERE q1.section = p_section
          AND q1.sub_section = qu.s
          AND COALESCE(q1.disabled, false) = false
          AND COALESCE(q1.status, 'active') = 'active'
        ORDER BY random()
        LIMIT qu.qq
    ) q;
END;
$$;

GRANT EXECUTE ON FUNCTION _pick_balanced_questions(TEXT, INT) TO authenticated;

-- ── 2. admin_list_all_mock_exams ───────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_all_mock_exams()
RETURNS TABLE (
    id UUID,
    exam_type TEXT,
    title TEXT,
    starts_at TIMESTAMPTZ,
    duration_min INT,
    questions_count INT,
    quant_count INT,
    verbal_count INT,
    is_active BOOLEAN,
    total_registered INT,
    total_completed INT,
    avg_correct NUMERIC,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.exam_type,
        e.title,
        e.starts_at,
        e.duration_min,
        e.questions_count,
        e.quant_count,
        e.verbal_count,
        e.is_active,
        (SELECT COUNT(*)::INT FROM mock_exam_registrations r WHERE r.exam_id = e.id),
        (SELECT COUNT(*)::INT FROM mock_exam_registrations r WHERE r.exam_id = e.id AND r.submitted_at IS NOT NULL),
        (SELECT ROUND(AVG((r.score_correct::NUMERIC / NULLIF(r.score_total,0)) * 100), 1)
         FROM mock_exam_registrations r WHERE r.exam_id = e.id AND r.submitted_at IS NOT NULL),
        e.created_at
    FROM mock_exams e
    ORDER BY e.starts_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_all_mock_exams() TO authenticated;

-- ── 3. admin_list_mock_exam_completed ──────────────────────────
CREATE OR REPLACE FUNCTION admin_list_mock_exam_completed(p_exam_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    duration_min NUMERIC,
    score_correct INT,
    score_total INT,
    score_pct NUMERIC,
    rank_position INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        r.user_id,
        p.full_name,
        u.email::text,
        r.started_at,
        r.submitted_at,
        ROUND(EXTRACT(EPOCH FROM (r.submitted_at - r.started_at))/60, 1),
        r.score_correct,
        r.score_total,
        ROUND((r.score_correct::NUMERIC / NULLIF(r.score_total,0)) * 100, 1),
        r.rank_position
    FROM mock_exam_registrations r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.exam_id = p_exam_id AND r.submitted_at IS NOT NULL
    ORDER BY r.score_correct DESC NULLS LAST, r.submitted_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_mock_exam_completed(UUID) TO authenticated;

-- ── 4. mock_exam_leaderboard ───────────────────────────────────
CREATE OR REPLACE FUNCTION mock_exam_leaderboard(p_exam_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
    rank INT,
    user_id UUID,
    full_name TEXT,
    score_correct INT,
    score_total INT,
    score_pct NUMERIC,
    duration_min NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY r.score_correct DESC NULLS LAST,
                                    EXTRACT(EPOCH FROM (r.submitted_at - r.started_at)) ASC NULLS LAST)::INT,
        r.user_id,
        COALESCE(p.full_name, 'مستخدم'),
        r.score_correct,
        r.score_total,
        ROUND((r.score_correct::NUMERIC / NULLIF(r.score_total,0)) * 100, 1),
        ROUND(EXTRACT(EPOCH FROM (r.submitted_at - r.started_at))/60, 1)
    FROM mock_exam_registrations r
    LEFT JOIN profiles p ON p.id = r.user_id
    WHERE r.exam_id = p_exam_id
      AND r.submitted_at IS NOT NULL
      AND r.show_in_leaderboard = true
    ORDER BY r.score_correct DESC NULLS LAST, EXTRACT(EPOCH FROM (r.submitted_at - r.started_at)) ASC NULLS LAST
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION mock_exam_leaderboard(UUID, INT) TO authenticated, anon;

-- ── 5. admin_get_section_breakdown ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_get_section_breakdown(p_section TEXT)
RETURNS TABLE (sub_section TEXT, available INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE(NULLIF(q.sub_section,''),'(غير محدّد)') AS ss,
        COUNT(*)::INT
    FROM questions q
    WHERE q.section = p_section
      AND COALESCE(q.disabled, false) = false
      AND COALESCE(q.status, 'active') = 'active'
    GROUP BY 1
    ORDER BY 1;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_section_breakdown(TEXT) TO authenticated;

-- ── 6. get_active_mock_exam_status — يعرض الأقرب موعداً (بدل الأحدث إنشاءً) ──
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
#variable_conflict use_column
DECLARE
    v_exam mock_exams%ROWTYPE;
BEGIN
    -- منطق: نأخذ اختباراً نشطاً لم ينتهِ بعد (مباشر الآن أو قادم)، مرتّب بالأقرب
    SELECT * INTO v_exam FROM mock_exams
    WHERE is_active = true
      AND starts_at + (duration_min || ' minutes')::interval >= now()
    ORDER BY starts_at ASC
    LIMIT 1;

    IF v_exam.id IS NULL THEN
        -- لا يوجد قادم — fallback للأحدث ماضياً (لو يبي يشوف نتيجة)
        SELECT * INTO v_exam FROM mock_exams
        WHERE is_active = true
        ORDER BY starts_at DESC
        LIMIT 1;
    END IF;

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

-- تحقّق
SELECT 'Migration 39 ready — ambiguity fixed + active exam picks soonest' AS status;
