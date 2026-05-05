-- ============================================================
-- Migration 42 — توحيد منطق التسجيل مع منطق العرض
-- ============================================================
-- Bug:
--   • get_active_mock_exam_status (SQL 39) تجلب الأقرب موعداً (ASC)
--     من الاختبارات اللي ما انتهت → dashboard يعرض test1 (مباشر الآن)
--   • register_for_active_mock_exam (SQL 36) تجلب الأحدث (DESC) بدون
--     فلتر النهاية → تسجّل الطالب في اختبار آخر (مثلاً test بكرة)
--   النتيجة: الطالب يضغط LIVE في dashboard لـtest1، لكنه مسجّل في
--   test، فـstart_mock_exam_attempt(test1) ترجع not_registered.
--
-- الحلّ:
--   1. register_for_active_mock_exam — نفس منطق get_active_mock_exam_status
--      (الأقرب موعداً ولم ينتهِ، fallback للأحدث ماضياً)
--   2. start_mock_exam_attempt — auto-register إذا الاختبار live ولم
--      يُسلَّم (لتتطابق الحالة في الزر مع الفعل بدون round-trip ثانٍ)
--
-- يُشغّل مرة واحدة في Supabase SQL Editor.
-- ============================================================

-- ── 1. register_for_active_mock_exam — يطابق get_active_mock_exam_status ──
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

    -- الأقرب موعداً ولم ينتهِ
    SELECT id INTO v_exam_id FROM mock_exams
    WHERE is_active = true
      AND starts_at + (duration_min || ' minutes')::interval >= now()
    ORDER BY starts_at ASC
    LIMIT 1;

    -- fallback: لو لا يوجد قادم → الأحدث ماضياً (لا تسجيل عملياً، لكن لا نخفي خطأ)
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


-- ── 2. start_mock_exam_attempt — auto-register إذا غير مسجّل ──
CREATE OR REPLACE FUNCTION start_mock_exam_attempt(p_exam_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_user_id UUID := auth.uid();
    v_exam mock_exams%ROWTYPE;
    v_reg mock_exam_registrations%ROWTYPE;
    v_now TIMESTAMPTZ := now();
    v_q_count INT;
    v_v_count INT;
    v_total INT;
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

    -- 🤝 auto-register إذا غير مسجّل (نية الضغط على LIVE = نية الالتحاق)
    INSERT INTO mock_exam_registrations (exam_id, user_id)
    VALUES (p_exam_id, v_user_id)
    ON CONFLICT (exam_id, user_id) DO NOTHING;

    -- 🔒 جلب التسجيل + قفل
    SELECT * INTO v_reg FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = v_user_id
    FOR UPDATE;
    IF v_reg.id IS NULL THEN RAISE EXCEPTION 'not_registered'; END IF;

    IF v_reg.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'already_submitted';
    END IF;

    v_total := COALESCE(v_exam.questions_count, 0);
    IF v_total <= 0 THEN RAISE EXCEPTION 'invalid_questions_count'; END IF;

    IF v_reg.started_at IS NULL THEN
        DELETE FROM mock_exam_answers WHERE registration_id = v_reg.id;

        IF v_exam.exam_type IN ('qudurat_computer','qudurat_paper') THEN
            v_q_count := COALESCE(v_exam.quant_count, v_total / 2);
            v_v_count := COALESCE(v_exam.verbal_count, v_total - v_q_count);

            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM (
                    SELECT id FROM _pick_balanced_questions('quant', v_q_count) LIMIT v_q_count
                ) qq
                UNION ALL
                SELECT id FROM (
                    SELECT id FROM _pick_balanced_questions('verbal', v_v_count) LIMIT v_v_count
                ) vv
                LIMIT v_total
            ) x
            ON CONFLICT (registration_id, question_id) DO NOTHING;

        ELSIF v_exam.exam_type = 'tahsili' THEN
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM _pick_balanced_questions('tahsili', v_total)
                LIMIT v_total
            ) x
            ON CONFLICT (registration_id, question_id) DO NOTHING;

        ELSE
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, q.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM questions
                WHERE COALESCE(disabled, false) = false
                  AND COALESCE(status, 'active') = 'active'
                ORDER BY random()
                LIMIT v_total
            ) q
            ON CONFLICT (registration_id, question_id) DO NOTHING;
        END IF;

        UPDATE mock_exam_registrations SET started_at = v_now WHERE id = v_reg.id;
        v_reg.started_at := v_now;
    END IF;

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


-- تحقّق
SELECT 'Migration 42 ready — register/start aligned with active-status logic' AS status;
