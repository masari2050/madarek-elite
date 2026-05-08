-- ════════════════════════════════════════════════════════════════
-- 61-restore-mock-exam-register-rpc.sql                  2026-05-08
--
-- إعادة إنشاء الـRPC register_for_active_mock_exam
-- (محذوفة من DB حالياً → PGRST202 لمّا dashboard.html يستدعيها)
--
-- نفس تعريف SQL 36-line-118 (لا تغيير في المنطق).
-- + NOTIFY pgrst لإجبار PostgREST يحدّث schema cache.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_for_active_mock_exam()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_exam_id UUID;
    v_reg_id  UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
    END IF;

    -- آخر اختبار نشط
    SELECT id INTO v_exam_id
    FROM mock_exams
    WHERE is_active = true
    ORDER BY starts_at DESC
    LIMIT 1;

    IF v_exam_id IS NULL THEN
        RAISE EXCEPTION 'no_active_exam';
    END IF;

    -- تسجيل (idempotent — لو مسجَّل بالفعل، نرجع نفس الـID)
    INSERT INTO mock_exam_registrations (exam_id, user_id)
    VALUES (v_exam_id, auth.uid())
    ON CONFLICT (exam_id, user_id) DO NOTHING
    RETURNING id INTO v_reg_id;

    IF v_reg_id IS NULL THEN
        SELECT id INTO v_reg_id
        FROM mock_exam_registrations
        WHERE exam_id = v_exam_id AND user_id = auth.uid();
    END IF;

    RETURN v_reg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_active_mock_exam() TO authenticated;

-- إجبار PostgREST يحدّث schema cache فوراً (بدل ما يستنّى ~10 دقائق)
NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────
-- تحقق:
-- ─────────────────────────────────────────────────────────────────
SELECT proname, proargtypes::regtype[] AS args
FROM pg_proc
WHERE proname = 'register_for_active_mock_exam'
  AND pronamespace = 'public'::regnamespace;
-- ⇒ يجب يطلع 1 صف
