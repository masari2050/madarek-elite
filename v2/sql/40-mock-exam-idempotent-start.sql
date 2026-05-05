-- ============================================================
-- Migration 40 — start_mock_exam_attempt: idempotent + ON CONFLICT
-- ============================================================
-- المشكلة: "duplicate key value violates unique constraint
--   mock_exam_answers_registration_id_question_id_key"
--
-- السبب: تنفيذ سابق فشل بعد INSERT جزئي (سواء بسبب SQL 37/39 ambiguity
-- أو إعادة استدعاء قبل تحديث started_at). الصفوف بقيت في الجدول لكن
-- started_at بقي NULL → الاستدعاء التالي يحاول إعادة الإدراج.
--
-- الحل (طبقتان):
--   1. SELECT FOR UPDATE على registration → يقفل الصف ضد race
--   2. تنظيف answers قديمة لو started_at IS NULL (آثار محاولة فاشلة)
--   3. ON CONFLICT DO NOTHING — أمان إضافي
--
-- يُشغّل مرة واحدة في Supabase SQL Editor.
-- ============================================================

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

    -- 🔒 التسجيل + قفل الصف لمنع race condition
    SELECT * INTO v_reg FROM mock_exam_registrations
    WHERE exam_id = p_exam_id AND user_id = v_user_id
    FOR UPDATE;
    IF v_reg.id IS NULL THEN RAISE EXCEPTION 'not_registered'; END IF;

    -- 🔒 لو مسلّم بالفعل
    IF v_reg.submitted_at IS NOT NULL THEN
        RAISE EXCEPTION 'already_submitted';
    END IF;

    -- لو ما بدأ بعد → اختر أسئلة
    IF v_reg.started_at IS NULL THEN
        -- 🧹 تنظيف صفوف يتيمة من محاولة فاشلة سابقة
        DELETE FROM mock_exam_answers WHERE registration_id = v_reg.id;

        IF v_exam.exam_type IN ('qudurat_computer','qudurat_paper') THEN
            v_q_count := COALESCE(v_exam.quant_count, v_exam.questions_count / 2);
            v_v_count := COALESCE(v_exam.verbal_count, v_exam.questions_count - v_q_count);

            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM _pick_balanced_questions('quant', v_q_count)
                UNION ALL
                SELECT id FROM _pick_balanced_questions('verbal', v_v_count)
            ) x
            ON CONFLICT (registration_id, question_id) DO NOTHING;

        ELSIF v_exam.exam_type = 'tahsili' THEN
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, x.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM _pick_balanced_questions('tahsili', v_exam.questions_count) x
            ON CONFLICT (registration_id, question_id) DO NOTHING;

        ELSE -- custom: مزيج كامل
            INSERT INTO mock_exam_answers (registration_id, question_id, question_order)
            SELECT v_reg.id, q.id, ROW_NUMBER() OVER (ORDER BY random())
            FROM (
                SELECT id FROM questions
                WHERE COALESCE(disabled, false) = false
                  AND COALESCE(status, 'active') = 'active'
                ORDER BY random()
                LIMIT v_exam.questions_count
            ) q
            ON CONFLICT (registration_id, question_id) DO NOTHING;
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

-- تحقّق
SELECT 'Migration 40 ready — idempotent start (FOR UPDATE + cleanup + ON CONFLICT)' AS status;
