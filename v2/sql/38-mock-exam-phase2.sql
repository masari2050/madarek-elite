-- ============================================================
-- Migration 38 — Phase 2: نظام الاختبار المحاكي الكامل
-- ============================================================
-- يُكمل Migration 36/37: يضيف جدول الإجابات + RPCs لإدارة متعدّدة + أسئلة عشوائية متوازنة + النتائج
--
-- ⚠️ ملاحظة: لا يحذف ولا يعدّل أعمدة موجودة (golden rule)
-- يُشغَّل مرّة واحدة في Supabase SQL Editor

-- ── 0. توسعة mock_exams (آمن — IF NOT EXISTS فقط) ─────────────
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS quant_count INT;
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS verbal_count INT;
ALTER TABLE mock_exams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ════════════════════════════════════════════════════════════
-- 0b. دالة مساعدة: توزيع متساوٍ على sub_sections داخل قسم
-- ════════════════════════════════════════════════════════════
-- ترجع p_total سؤال موزّعة بالتساوي على كل sub_section متوفّر داخل القسم.
-- لو ما فيه sub_sections → اختيار عشوائي عام من القسم.
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION _pick_balanced_questions(p_section TEXT, p_total INT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        -- لا توجد sub_sections — عشوائي من القسم
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
               (p_total / v_n) + CASE WHEN idx <= (p_total - (p_total/v_n)*v_n) THEN 1 ELSE 0 END AS q
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
        LIMIT qu.q
    ) q;
END;
$$;

GRANT EXECUTE ON FUNCTION _pick_balanced_questions(TEXT, INT) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 0c. RPC: معاينة التوزيع (admin يشوف كم سؤال متوفّر لكل sub_section قبل الحفظ)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_get_section_breakdown(p_section TEXT)
RETURNS TABLE (sub_section TEXT, available INT)
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
        COALESCE(NULLIF(q.sub_section,''),'(غير محدّد)') AS sub_section,
        COUNT(*)::INT AS available
    FROM questions q
    WHERE q.section = p_section
      AND COALESCE(q.disabled, false) = false
      AND COALESCE(q.status, 'active') = 'active'
    GROUP BY 1
    ORDER BY 1;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_section_breakdown(TEXT) TO authenticated;

-- ── 1. جدول الإجابات (سؤال واحد لكل صف) ──────────────────────
CREATE TABLE IF NOT EXISTS mock_exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES mock_exam_registrations(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INT NOT NULL,
    selected_index INT,
    is_correct BOOLEAN,
    answered_at TIMESTAMPTZ,
    UNIQUE (registration_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_ans_reg ON mock_exam_answers(registration_id);
CREATE INDEX IF NOT EXISTS idx_mock_ans_q ON mock_exam_answers(question_id);

ALTER TABLE mock_exam_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mock_ans_user_read ON mock_exam_answers;
CREATE POLICY mock_ans_user_read ON mock_exam_answers FOR SELECT
USING (
    EXISTS (SELECT 1 FROM mock_exam_registrations r
            WHERE r.id = registration_id
              AND (r.user_id = auth.uid()
                   OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')))
);

-- لا insert/update مباشر — كل التعديلات عبر RPCs (SECURITY DEFINER)
DROP POLICY IF EXISTS mock_ans_no_direct_write ON mock_exam_answers;
CREATE POLICY mock_ans_no_direct_write ON mock_exam_answers FOR INSERT WITH CHECK (false);

-- ════════════════════════════════════════════════════════════
-- 2. RPC: admin يُنشئ اختباراً جديداً (يدعم اختبارات متعدّدة)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_create_mock_exam(
    p_exam_type TEXT,
    p_title TEXT,
    p_starts_at TIMESTAMPTZ,
    p_duration_min INT,
    p_questions_count INT,
    p_quant_count INT DEFAULT NULL,
    p_verbal_count INT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_q INT;
    v_v INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    IF p_exam_type NOT IN ('tahsili','qudurat_computer','qudurat_paper','custom') THEN
        RAISE EXCEPTION 'invalid_exam_type';
    END IF;

    -- لقدرات: نحسب توزيع quant/verbal تلقائياً 50/50 لو ما حُدّد
    IF p_exam_type IN ('qudurat_computer','qudurat_paper') THEN
        IF p_quant_count IS NULL OR p_verbal_count IS NULL THEN
            v_q := p_questions_count / 2;
            v_v := p_questions_count - v_q;
        ELSE
            v_q := p_quant_count;
            v_v := p_verbal_count;
            IF (v_q + v_v) <> p_questions_count THEN
                RAISE EXCEPTION 'quant_verbal_must_sum_to_total';
            END IF;
        END IF;
    ELSE
        v_q := NULL;
        v_v := NULL;
    END IF;

    INSERT INTO mock_exams (
        exam_type, title, starts_at, duration_min, questions_count,
        quant_count, verbal_count, is_active, created_by
    )
    VALUES (
        p_exam_type, p_title, p_starts_at, p_duration_min, p_questions_count,
        v_q, v_v, true, auth.uid()
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_create_mock_exam(TEXT, TEXT, TIMESTAMPTZ, INT, INT, INT, INT) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 3. RPC: admin يُعدّل/يحذف اختباراً
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_update_mock_exam(
    p_exam_id UUID,
    p_title TEXT,
    p_starts_at TIMESTAMPTZ,
    p_duration_min INT,
    p_questions_count INT,
    p_quant_count INT DEFAULT NULL,
    p_verbal_count INT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
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

    UPDATE mock_exams SET
        title = COALESCE(p_title, title),
        starts_at = COALESCE(p_starts_at, starts_at),
        duration_min = COALESCE(p_duration_min, duration_min),
        questions_count = COALESCE(p_questions_count, questions_count),
        quant_count = COALESCE(p_quant_count, quant_count),
        verbal_count = COALESCE(p_verbal_count, verbal_count),
        is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_mock_exam(UUID, TEXT, TIMESTAMPTZ, INT, INT, INT, INT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION admin_delete_mock_exam(p_exam_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    DELETE FROM mock_exams WHERE id = p_exam_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_mock_exam(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 4. RPC: admin يقرأ كل الاختبارات (قادمة + ماضية)
-- ════════════════════════════════════════════════════════════
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
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
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

-- ════════════════════════════════════════════════════════════
-- 5. RPC: admin يقرأ اختباراً واحداً + إحصائياته الكاملة
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_get_mock_exam_detail(p_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exam JSONB;
    v_stats JSONB;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    SELECT to_jsonb(e.*) INTO v_exam FROM mock_exams e WHERE e.id = p_exam_id;
    IF v_exam IS NULL THEN RETURN NULL; END IF;

    SELECT jsonb_build_object(
        'total_registered', (SELECT COUNT(*) FROM mock_exam_registrations WHERE exam_id = p_exam_id),
        'total_completed', (SELECT COUNT(*) FROM mock_exam_registrations WHERE exam_id = p_exam_id AND submitted_at IS NOT NULL),
        'avg_correct_pct', (SELECT ROUND(AVG((score_correct::NUMERIC / NULLIF(score_total,0)) * 100), 1)
                            FROM mock_exam_registrations WHERE exam_id = p_exam_id AND submitted_at IS NOT NULL),
        'avg_duration_min', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))/60), 1)
                             FROM mock_exam_registrations WHERE exam_id = p_exam_id AND submitted_at IS NOT NULL AND started_at IS NOT NULL),
        'top_score', (SELECT MAX(score_correct) FROM mock_exam_registrations WHERE exam_id = p_exam_id AND submitted_at IS NOT NULL),
        'lowest_score', (SELECT MIN(score_correct) FROM mock_exam_registrations WHERE exam_id = p_exam_id AND submitted_at IS NOT NULL)
    ) INTO v_stats;

    RETURN jsonb_build_object('exam', v_exam, 'stats', v_stats);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_mock_exam_detail(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 6. RPC: admin يقرأ المؤدّون (completed) لاختبار
-- ════════════════════════════════════════════════════════════
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
BEGIN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
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

-- ════════════════════════════════════════════════════════════
-- 7. RPC: متصدّرو اختبار (للأدمن وللطلاب — show_in_leaderboard)
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- 8. RPC: الطالب يبدأ الاختبار → يحجز الأسئلة المتوازنة
-- ════════════════════════════════════════════════════════════
-- منطق:
--   • تحقّق الوقت بدأ (now() >= starts_at) ولم ينتهِ (now() < starts_at + duration)
--   • تحقّق الطالب مسجّل
--   • لو ما بدأ بعد → سجّل started_at وأنشئ صفوف mock_exam_answers (لكن selected_index NULL)
--   • لو بدأ قبل → ارجع نفس الأسئلة المحفوظة (لا يتغيّر الترتيب أو الاختيار)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION start_mock_exam_attempt(p_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_exam mock_exams%ROWTYPE;
    v_reg mock_exam_registrations%ROWTYPE;
    v_now TIMESTAMPTZ := now();
    v_q_count INT;
    v_v_count INT;
    v_remaining_min INT;
    v_questions JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_exam FROM mock_exams WHERE id = p_exam_id;
    IF v_exam.id IS NULL THEN RAISE EXCEPTION 'exam_not_found'; END IF;

    -- 🔒 الوقت
    IF v_now < v_exam.starts_at THEN
        RAISE EXCEPTION 'exam_not_started_yet';
    END IF;
    IF v_now >= v_exam.starts_at + (v_exam.duration_min || ' minutes')::interval THEN
        RAISE EXCEPTION 'exam_ended';
    END IF;

    -- 🔒 التسجيل
    SELECT * INTO v_reg FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = v_user_id;
    IF v_reg.id IS NULL THEN RAISE EXCEPTION 'not_registered'; END IF;

    -- 🔒 لو مسلّم بالفعل
    IF v_reg.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'already_submitted';
    END IF;

    -- لو ما بدأ بعد → اختر أسئلة عشوائية متوازنة (موزّعة على المواد/الأنواع داخل كل قسم)
    IF v_reg.started_at IS NULL THEN
        IF v_exam.exam_type IN ('qudurat_computer','qudurat_paper') THEN
            v_q_count := COALESCE(v_exam.quant_count, v_exam.questions_count / 2);
            v_v_count := COALESCE(v_exam.verbal_count, v_exam.questions_count - v_q_count);

            -- توزيع quant على sub_sections + verbal على sub_sections
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM _pick_balanced_questions('quant', v_q_count)
                UNION ALL
                SELECT id FROM _pick_balanced_questions('verbal', v_v_count)
            ) x;

        ELSIF v_exam.exam_type = 'tahsili' THEN
            -- توزيع متساوٍ على المواد (sub_section) داخل تحصيلي
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM _pick_balanced_questions('tahsili', v_exam.questions_count) x;

        ELSE -- custom: مزيج كامل
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, q.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM questions
                WHERE COALESCE(disabled, false) = false
                  AND COALESCE(status, 'active') = 'active'
                ORDER BY random()
                LIMIT v_exam.questions_count
            ) q;
        END IF;

        UPDATE mock_exam_registrations SET started_at = v_now WHERE id = v_reg.id;
        v_reg.started_at := v_now;
    END IF;

    -- اجمع الأسئلة بنفس الترتيب
    SELECT jsonb_agg(jsonb_build_object(
        'order', a.question_order,
        'id', q.id,
        'text', q.question_text,
        'choices', q.choices,
        'image_url', q.image_url,
        'section', q.section,
        'selected_index', a.selected_index
    ) ORDER BY a.question_order) INTO v_questions
    FROM mock_exam_answers a
    JOIN questions q ON q.id = a.question_id
    WHERE a.registration_id = v_reg.id;

    v_remaining_min := GREATEST(0,
        FLOOR(EXTRACT(EPOCH FROM (v_exam.starts_at + (v_exam.duration_min || ' minutes')::interval - v_now))/60)::INT);

    RETURN jsonb_build_object(
        'registration_id', v_reg.id,
        'exam_id', v_exam.id,
        'exam_type', v_exam.exam_type,
        'title', v_exam.title,
        'duration_min', v_exam.duration_min,
        'remaining_min', v_remaining_min,
        'starts_at', v_exam.starts_at,
        'started_at', v_reg.started_at,
        'questions', COALESCE(v_questions, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION start_mock_exam_attempt(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 9. RPC: الطالب يحفظ إجابة (auto-save)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION save_mock_exam_answer(
    p_registration_id UUID,
    p_question_id UUID,
    p_selected_index INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner UUID;
BEGIN
    SELECT user_id INTO v_owner FROM mock_exam_registrations WHERE id = p_registration_id;
    IF v_owner IS NULL OR v_owner <> auth.uid() THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    UPDATE mock_exam_answers
    SET selected_index = p_selected_index, answered_at = now()
    WHERE registration_id = p_registration_id AND question_id = p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_mock_exam_answer(UUID, UUID, INT) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 10. RPC: تسليم الاختبار → يحسب النتيجة
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION submit_mock_exam(p_registration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reg mock_exam_registrations%ROWTYPE;
    v_correct INT;
    v_total INT;
    v_rank INT;
BEGIN
    SELECT * INTO v_reg FROM mock_exam_registrations WHERE id = p_registration_id;
    IF v_reg.id IS NULL OR v_reg.user_id <> auth.uid() THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;
    IF v_reg.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'already_submitted';
    END IF;

    -- احسب الإجابات
    UPDATE mock_exam_answers a
    SET is_correct = (a.selected_index IS NOT NULL AND a.selected_index = q.correct_index)
    FROM questions q
    WHERE a.registration_id = p_registration_id AND a.question_id = q.id;

    SELECT
        COUNT(*) FILTER (WHERE is_correct = true),
        COUNT(*)
    INTO v_correct, v_total
    FROM mock_exam_answers WHERE registration_id = p_registration_id;

    UPDATE mock_exam_registrations
    SET submitted_at = now(),
        score_correct = v_correct,
        score_total = v_total
    WHERE id = p_registration_id;

    -- احسب المرتبة
    SELECT COUNT(*) + 1 INTO v_rank
    FROM mock_exam_registrations
    WHERE exam_id = v_reg.exam_id
      AND submitted_at IS NOT NULL
      AND id <> p_registration_id
      AND (score_correct > v_correct
           OR (score_correct = v_correct AND submitted_at < now()));

    UPDATE mock_exam_registrations SET rank_position = v_rank WHERE id = p_registration_id;

    RETURN jsonb_build_object(
        'score_correct', v_correct,
        'score_total', v_total,
        'score_pct', ROUND((v_correct::NUMERIC / NULLIF(v_total,0)) * 100, 1),
        'rank_position', v_rank
    );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_mock_exam(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- 11. RPC: نتيجة الطالب بعد التسليم (للعرض في صفحة النتيجة)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_my_mock_exam_result(p_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reg mock_exam_registrations%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;

    SELECT * INTO v_reg FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = auth.uid();
    IF v_reg.id IS NULL OR v_reg.submitted_at IS NULL THEN RETURN NULL; END IF;

    RETURN jsonb_build_object(
        'registration_id', v_reg.id,
        'score_correct', v_reg.score_correct,
        'score_total', v_reg.score_total,
        'score_pct', ROUND((v_reg.score_correct::NUMERIC / NULLIF(v_reg.score_total,0)) * 100, 1),
        'rank_position', v_reg.rank_position,
        'started_at', v_reg.started_at,
        'submitted_at', v_reg.submitted_at,
        'duration_min', ROUND(EXTRACT(EPOCH FROM (v_reg.submitted_at - v_reg.started_at))/60, 1)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_mock_exam_result(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════
-- تحقق
-- ════════════════════════════════════════════════════════════
SELECT 'Migration 38 ready — Phase 2 mock exam system' AS status;
