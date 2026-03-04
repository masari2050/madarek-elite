-- ═══════════════════════════════════════════════════════
-- 🔒 مدارك النخبة — دوال الأمان (Security Functions)
-- شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ═══ 1. دالة التحقق من الإجابة (سيرفر) ═══
-- بدل ما الأجوبة تنرسل للمتصفح، الطالب يرسل اختياره والسيرفر يتحقق
CREATE OR REPLACE FUNCTION check_answer(q_id UUID, selected_answer INT)
RETURNS JSON AS $$
DECLARE
    correct INT;
    is_correct BOOLEAN;
    explanation_text TEXT;
    explanation_img TEXT;
    choices_arr JSONB;
    correct_answer_text TEXT;
BEGIN
    -- جلب الإجابة الصحيحة من السيرفر (ما تنرسل للمتصفح أبداً)
    SELECT correct_index, explanation, explanation_image, choices
    INTO correct, explanation_text, explanation_img, choices_arr
    FROM questions WHERE id = q_id;

    IF correct IS NULL THEN
        RETURN json_build_object('error', 'السؤال غير موجود');
    END IF;

    is_correct := (selected_answer = correct);
    correct_answer_text := choices_arr->>correct;

    RETURN json_build_object(
        'is_correct', is_correct,
        'correct_index', correct,
        'explanation', COALESCE(explanation_text, ''),
        'explanation_image', COALESCE(explanation_img, ''),
        'correct_answer', COALESCE(correct_answer_text, '')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 2. دالة التحقق + حفظ المحاولة (ذرّية — atomic) ═══
-- تتحقق من الإجابة + تحفظ المحاولة + تتحقق من حد الاشتراك المجاني
CREATE OR REPLACE FUNCTION submit_answer(
    p_question_id UUID,
    p_selected_answer INT
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_sub_type TEXT;
    v_attempt_count INT;
    v_correct INT;
    v_is_correct BOOLEAN;
    v_explanation TEXT;
    v_explanation_img TEXT;
    v_choices JSONB;
    v_correct_text TEXT;
    v_free_limit INT := 10;
BEGIN
    -- جلب المستخدم الحالي
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'يجب تسجيل الدخول');
    END IF;

    -- التحقق من الاشتراك
    SELECT COALESCE(subscription_type, 'free')
    INTO v_sub_type
    FROM profiles WHERE id = v_user_id;

    -- لو مجاني — نتحقق من الحد
    IF v_sub_type = 'free' THEN
        SELECT COUNT(*) INTO v_attempt_count
        FROM attempts WHERE user_id = v_user_id;

        IF v_attempt_count >= v_free_limit THEN
            RETURN json_build_object('error', 'free_limit_reached', 'count', v_attempt_count);
        END IF;
    END IF;

    -- جلب الإجابة الصحيحة
    SELECT correct_index, explanation, explanation_image, choices
    INTO v_correct, v_explanation, v_explanation_img, v_choices
    FROM questions WHERE id = p_question_id;

    IF v_correct IS NULL THEN
        RETURN json_build_object('error', 'السؤال غير موجود');
    END IF;

    v_is_correct := (p_selected_answer = v_correct);
    v_correct_text := v_choices->>v_correct;

    -- حفظ المحاولة
    INSERT INTO attempts (user_id, question_id, selected_answer, is_correct, answered_at)
    VALUES (v_user_id, p_question_id, p_selected_answer, v_is_correct, now());

    RETURN json_build_object(
        'is_correct', v_is_correct,
        'correct_index', v_correct,
        'explanation', COALESCE(v_explanation, ''),
        'explanation_image', COALESCE(v_explanation_img, ''),
        'correct_answer', COALESCE(v_correct_text, '')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══ 3. دالة تطبيق الكوبون الذرّية (ضد السباق) ═══
-- تتحقق من الكوبون + تزيد العداد ذرّياً (ما تسمح بتجاوز الحد)
CREATE OR REPLACE FUNCTION apply_coupon(p_code TEXT)
RETURNS JSON AS $$
DECLARE
    v_coupon RECORD;
    v_user_id UUID;
    v_already_used BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('error', 'يجب تسجيل الدخول');
    END IF;

    -- جلب الكوبون
    SELECT * INTO v_coupon
    FROM coupons WHERE code = UPPER(TRIM(p_code));

    IF v_coupon IS NULL THEN
        RETURN json_build_object('error', 'الكوبون غير موجود');
    END IF;

    -- تحقق من الصلاحية
    IF v_coupon.is_active = false THEN
        RETURN json_build_object('error', 'الكوبون منتهي الصلاحية');
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
        RETURN json_build_object('error', 'الكوبون منتهي الصلاحية');
    END IF;

    -- تحقق من حد الاستخدام (ذرّي — atomic)
    IF v_coupon.max_uses IS NOT NULL AND v_coupon.max_uses > 0 THEN
        UPDATE coupons
        SET used_count = used_count + 1
        WHERE id = v_coupon.id AND (used_count < max_uses)
        RETURNING * INTO v_coupon;

        IF v_coupon IS NULL THEN
            RETURN json_build_object('error', 'الكوبون وصل حد الاستخدام');
        END IF;
    ELSE
        UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1
        WHERE id = v_coupon.id;
    END IF;

    -- تسجيل حدث الاستخدام
    INSERT INTO coupon_events (coupon_code, event_type, source, user_id, page)
    VALUES (v_coupon.code, 'use', 'pricing', v_user_id, 'pricing.html');

    RETURN json_build_object(
        'success', true,
        'code', v_coupon.code,
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'plan_type', COALESCE(v_coupon.plan_type, 'all')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════
-- ✅ تم! شغّل هذا في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════
