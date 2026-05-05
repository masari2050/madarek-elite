-- ============================================================
-- Migration 41 — صفع صارم على عدد الأسئلة + تبسيط _pick_balanced_questions
-- ============================================================
-- المشكلة: الاختبار جدّوله admin بـ 160 سؤال، لكن الطالب وصله 526.
-- السبب: _pick_balanced_questions في إصدار SQL 38/39 قد يُرجع أكثر من
-- p_total لو سياق الـ sub_sections فيه حواف غير متوقّعة، أو لو فرع
-- "no sub_sections" يفترض أن questions في القسم أقل من المطلوب.
--
-- الحلّ (طبقتان دفاع):
--   1. إعادة كتابة _pick_balanced_questions بطريقة بسيطة وصارمة:
--      - ROW_NUMBER لكل sub_section + cap واحد + LIMIT p_total خارجي
--   2. start_mock_exam_attempt: lف كل INSERT داخل subquery مع LIMIT
--      v_exam.questions_count صريح — حتى لو الدالة الفرعية أعطت أكثر،
--      لا يصل للجدول إلا العدد المطلوب بالضبط.
--
-- يُشغّل مرّة واحدة في Supabase SQL Editor.
-- ============================================================

-- ── 1. إعادة كتابة _pick_balanced_questions بطريقة قوية ─────────
DROP FUNCTION IF EXISTS _pick_balanced_questions(TEXT, INT);

CREATE OR REPLACE FUNCTION _pick_balanced_questions(p_section TEXT, p_total INT)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_n INT;
    v_per_sub INT;
BEGIN
    IF p_total IS NULL OR p_total <= 0 THEN RETURN; END IF;

    -- كم sub_section نشط في هذا القسم؟
    SELECT COUNT(DISTINCT sub_section)::INT INTO v_n
    FROM questions
    WHERE section = p_section
      AND COALESCE(disabled, false) = false
      AND COALESCE(status, 'active') = 'active'
      AND sub_section IS NOT NULL
      AND sub_section <> '';

    IF v_n IS NULL OR v_n = 0 THEN
        -- لا توجد sub_sections → اختيار عشوائي مباشر بـ LIMIT صارم
        RETURN QUERY
        SELECT q.id FROM questions q
        WHERE q.section = p_section
          AND COALESCE(q.disabled, false) = false
          AND COALESCE(q.status, 'active') = 'active'
        ORDER BY random()
        LIMIT p_total;
        RETURN;
    END IF;

    -- خذ ceiling(p_total / v_n) من كل sub_section + LIMIT خارجي صارم
    v_per_sub := CEIL(p_total::NUMERIC / v_n)::INT;

    RETURN QUERY
    WITH ranked AS (
        SELECT q.id, q.sub_section,
               ROW_NUMBER() OVER (PARTITION BY q.sub_section ORDER BY random()) AS rn
        FROM questions q
        WHERE q.section = p_section
          AND COALESCE(q.disabled, false) = false
          AND COALESCE(q.status, 'active') = 'active'
          AND q.sub_section IS NOT NULL
          AND q.sub_section <> ''
    )
    SELECT r.id FROM ranked r
    WHERE r.rn <= v_per_sub
    ORDER BY random()
    LIMIT p_total;
END;
$$;

GRANT EXECUTE ON FUNCTION _pick_balanced_questions(TEXT, INT) TO authenticated;


-- ── 2. start_mock_exam_attempt: LIMIT صريح في كل INSERT ────────
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

    -- 🔒 التسجيل + قفل
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
        -- 🧹 تنظيف صفوف يتيمة من محاولة فاشلة سابقة
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


-- ── 3. تنظيف الاختبار الحالي اللي وصله 526 ─────────────────────
-- (يحذف answers لأي تسجيل started_at بدون submitted_at — يسمح
-- لـ start_mock_exam_attempt يعيد البناء بـ 160 سؤال)
DO $$
DECLARE
    v_count INT;
BEGIN
    -- احصل على التسجيلات المفتوحة (لم تُسلّم) للاختبارات النشطة
    SELECT COUNT(*) INTO v_count
    FROM mock_exam_answers a
    JOIN mock_exam_registrations r ON r.id = a.registration_id
    JOIN mock_exams e ON e.id = r.exam_id
    WHERE r.submitted_at IS NULL
      AND e.is_active = true
      AND e.starts_at + (e.duration_min || ' minutes')::interval >= now();

    RAISE NOTICE 'Cleaning % orphan answer rows (registrations not submitted)...', v_count;

    DELETE FROM mock_exam_answers
    WHERE registration_id IN (
        SELECT r.id FROM mock_exam_registrations r
        JOIN mock_exams e ON e.id = r.exam_id
        WHERE r.submitted_at IS NULL
          AND e.is_active = true
          AND e.starts_at + (e.duration_min || ' minutes')::interval >= now()
    );

    UPDATE mock_exam_registrations
    SET started_at = NULL
    WHERE submitted_at IS NULL
      AND started_at IS NOT NULL
      AND exam_id IN (
          SELECT id FROM mock_exams WHERE is_active = true
            AND starts_at + (duration_min || ' minutes')::interval >= now()
      );
END;
$$;

-- تحقّق
SELECT 'Migration 41 ready — strict cap on questions count + cleanup' AS status;
