-- ============================================================
-- Migration 36 — نظام الاختبار المحاكي (Phase 1: التسجيل)
-- ============================================================
-- Phase 1 يغطّي: جدول الاختبارات + التسجيل + RPCs + seed أوّلي
-- Phase 2 يضيف: mock_exam_answers + شاشة الاختبار + النتائج

-- ── 1. جدول الاختبارات ──
CREATE TABLE IF NOT EXISTS mock_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type TEXT NOT NULL CHECK (exam_type IN ('tahsili','qudurat_computer','qudurat_paper','custom')),
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    duration_min INT NOT NULL CHECK (duration_min > 0),
    questions_count INT NOT NULL CHECK (questions_count > 0),
    questions_filter JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_active_starts ON mock_exams(is_active, starts_at DESC);

-- ── 2. جدول التسجيل ──
CREATE TABLE IF NOT EXISTS mock_exam_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    -- يُملأ بعد الاختبار (Phase 2-3):
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    score_correct INT,
    score_total INT,
    rank_position INT,
    show_in_leaderboard BOOLEAN DEFAULT true,
    UNIQUE (exam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_reg_exam ON mock_exam_registrations(exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_reg_user ON mock_exam_registrations(user_id);

-- ── 3. RLS ──
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mock_exams_public_read ON mock_exams;
CREATE POLICY mock_exams_public_read ON mock_exams FOR SELECT USING (true);

DROP POLICY IF EXISTS mock_exams_admin_write ON mock_exams;
CREATE POLICY mock_exams_admin_write ON mock_exams FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS mock_reg_user_read ON mock_exam_registrations;
CREATE POLICY mock_reg_user_read ON mock_exam_registrations FOR SELECT
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS mock_reg_user_insert ON mock_exam_registrations;
CREATE POLICY mock_reg_user_insert ON mock_exam_registrations FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS mock_reg_user_delete ON mock_exam_registrations;
CREATE POLICY mock_reg_user_delete ON mock_exam_registrations FOR DELETE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS mock_reg_admin_update ON mock_exam_registrations;
CREATE POLICY mock_reg_admin_update ON mock_exam_registrations FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS mock_reg_user_update_optin ON mock_exam_registrations;
CREATE POLICY mock_reg_user_update_optin ON mock_exam_registrations FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ── 4. RPC: حالة الاختبار النشط (للجميع، حتى الزوّار) ──
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
        (SELECT COUNT(*)::INT FROM mock_exam_registrations WHERE exam_id = v_exam.id),
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM mock_exam_registrations
            WHERE exam_id = v_exam.id AND user_id = auth.uid()
        ));
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_mock_exam_status() TO authenticated, anon;

-- ── 5. RPC: تسجيل المستخدم في الاختبار النشط ──
CREATE OR REPLACE FUNCTION register_for_active_mock_exam()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exam_id UUID;
    v_reg_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_exam_id FROM mock_exams
    WHERE is_active = true
    ORDER BY starts_at DESC
    LIMIT 1;

    IF v_exam_id IS NULL THEN
        RAISE EXCEPTION 'no_active_exam';
    END IF;

    INSERT INTO mock_exam_registrations (exam_id, user_id)
    VALUES (v_exam_id, auth.uid())
    ON CONFLICT (exam_id, user_id) DO NOTHING
    RETURNING id INTO v_reg_id;

    IF v_reg_id IS NULL THEN
        SELECT id INTO v_reg_id FROM mock_exam_registrations
        WHERE exam_id = v_exam_id AND user_id = auth.uid();
    END IF;

    RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_for_active_mock_exam() TO authenticated;

-- ── 6. RPC للأدمن: قائمة المسجّلين ──
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

-- ── 6b. RPC للأدمن: upsert الاختبار النشط (للتزامن مع banner config) ──
CREATE OR REPLACE FUNCTION admin_upsert_active_mock_exam(
    p_exam_type TEXT,
    p_title TEXT,
    p_exam_date DATE,
    p_duration_min INT,
    p_questions_count INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_starts_at TIMESTAMPTZ;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    v_starts_at := (p_exam_date::text || ' 09:00:00+03')::timestamptz;

    SELECT id INTO v_id FROM mock_exams
    WHERE is_active = true
    ORDER BY starts_at DESC
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO mock_exams (exam_type, title, starts_at, duration_min, questions_count)
        VALUES (p_exam_type, p_title, v_starts_at, p_duration_min, p_questions_count)
        RETURNING id INTO v_id;
    ELSE
        UPDATE mock_exams SET
            exam_type = p_exam_type,
            title = p_title,
            starts_at = v_starts_at,
            duration_min = p_duration_min,
            questions_count = p_questions_count
        WHERE id = v_id;
    END IF;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_upsert_active_mock_exam(TEXT, TEXT, DATE, INT, INT) TO authenticated;

-- ── 7. seed: استورد البيانات من banners.mock_exam الحالي (لو موجود) ──
DO $$
DECLARE
    v_cfg JSONB;
    v_exam_type TEXT;
    v_title TEXT;
    v_date DATE;
    v_questions INT;
    v_duration INT;
BEGIN
    SELECT config INTO v_cfg FROM banners WHERE banner_type = 'mock_exam' LIMIT 1;

    IF v_cfg IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mock_exams WHERE is_active = true) THEN
        v_exam_type := COALESCE(v_cfg->>'exam_type', 'tahsili');
        v_title := COALESCE(v_cfg->>'title', 'محاكي التحصيلي');
        v_date := COALESCE((v_cfg->>'exam_date')::date, CURRENT_DATE + INTERVAL '7 days');
        v_questions := COALESCE((v_cfg->>'questions')::int, 160);
        v_duration := COALESCE((v_cfg->>'duration_min')::int, 125);

        INSERT INTO mock_exams (exam_type, title, starts_at, duration_min, questions_count)
        VALUES (
            v_exam_type,
            v_title,
            (v_date::text || ' 09:00:00+03')::timestamptz,
            v_duration,
            v_questions
        );
    END IF;
END $$;

-- ── تحقق ──
SELECT id, exam_type, title, starts_at, duration_min, questions_count, is_active
FROM mock_exams
ORDER BY starts_at DESC;
