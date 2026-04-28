-- ═══════════════════════════════════════════════════════════════
-- Migration 27 — تصلب أمني لـ RPC functions القديمة في SQL 05
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية (audit 2026-04-28 — جلسة المساء الثانية):
--
-- Migration 05 يحوي 8 RPC functions كلها SECURITY DEFINER، كلها تأخذ
-- `p_user_id UUID` بدون أي تحقّق من `auth.uid()`. النتيجة:
--
-- 🔴 update_user_xp(p_user_id, p_xp_amount):
--    - أي مصادَق يقدر يمنح نفسه XP غير محدودة → تخريب الـ leaderboard
--    - الإصلاح: auth.uid() check + MAX_XP_PER_CALL = 200 (الأعلى الشرعي 100)
--    - + رفض p_xp_amount السلبي (لا يقدر ينتقم بإنقاص XP من ضحية)
--
-- 🔴 update_daily_streak(p_user_id):
--    - يقدر يحدّث streak أي مستخدم
--    - الإصلاح: auth.uid() check
--
-- 🟠 check_achievements(p_user_id):
--    - يقدر يحرّك achievements لأي مستخدم
--    - الإصلاح: auth.uid() check
--
-- 🟠 get_my_referral_stats(p_user_id):
--    - يكشف stats أي مستخدم (PII قديم — bonus_days)
--    - الإصلاح: auth.uid() check
--
-- 🔴 apply_referral(p_new_user_id, p_referral_code):
--    - النظام القديم (bonus_days) — لا يزال callable من register-v2
--    - يقدر مهاجم يخترع referrals وهمية لأي UUID
--    - الإصلاح: auth.uid() check
--
-- 🟢 log_activity(p_user_id, p_action, ...):
--    - تلوّث activity_log بأسماء مستخدمين آخرين
--    - الإصلاح: auth.uid() check
--
-- 🟠 get_user_leaks(p_user_id):
--    - يكشف progress التسريبات لأي مستخدم
--    - الإصلاح: auth.uid() check
--
-- 🟠 get_home_stats(p_user_id):
--    - يكشف XP، streak، الترتيب، referral_code (مهم! المهاجم يستخدم الكود في إحالات وهمية)
--    - الإصلاح: auth.uid() check
--
-- استراتيجية:
--   • جميع الدوال SECURITY DEFINER — نضيف check في أول كل دالة
--   • CREATE OR REPLACE فقط (لا حذف)
--   • العميل (Expo + v2 web) يمرّر auth.uid() صح → الإصلاح لا يكسر شي
--
-- ملاحظة معماريّة (مؤجّلة):
--   update_user_xp مع cap 200 لا يزال يقبل ~10 calls/min = 2000 XP/min.
--   الحل النهائي: نقل XP logic لـ Edge Function يحسبها server-side من attempts
--   الفعلية. حالياً نضع cap كحماية وسطية. (موثّق في Post-Launch Hardening Plan)
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) update_user_xp — حماية حرجة ──
CREATE OR REPLACE FUNCTION public.update_user_xp(
    p_user_id UUID,
    p_xp_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_level_name TEXT;
    v_result JSONB;
    -- 🛡️ NEW: حدّ أقصى لكل استدعاء (الأعلى الشرعي = 100 لـ ACHIEVEMENT_UNLOCK)
    -- نعطي 200 كـ safety margin للمكافآت المركّبة
    MAX_XP_PER_CALL CONSTANT INTEGER := 200;
BEGIN
    -- 🛡️ NEW: حماية auth — لا يحقّ لمصادَق منح XP لمستخدم آخر
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    -- 🛡️ NEW: حماية ضد p_xp_amount السلبي أو الصفري أو الكبير
    IF p_xp_amount IS NULL OR p_xp_amount <= 0 OR p_xp_amount > MAX_XP_PER_CALL THEN
        RETURN jsonb_build_object('success', false, 'error',
            'p_xp_amount يجب أن يكون بين 1 و ' || MAX_XP_PER_CALL);
    END IF;

    UPDATE profiles
    SET xp = COALESCE(xp, 0) + p_xp_amount
    WHERE id = p_user_id
    RETURNING xp INTO v_new_xp;

    v_new_level := GREATEST(1, (v_new_xp / 200) + 1);

    v_level_name := CASE
        WHEN v_new_level <= 2 THEN 'مبتدئ'
        WHEN v_new_level <= 4 THEN 'متدرب'
        WHEN v_new_level <= 6 THEN 'متقدم'
        WHEN v_new_level <= 8 THEN 'متميز'
        ELSE 'خبير'
    END;

    UPDATE profiles
    SET level = v_new_level, level_name = v_level_name
    WHERE id = p_user_id;

    v_result := jsonb_build_object(
        'success', true,
        'xp', v_new_xp,
        'level', v_new_level,
        'level_name', v_level_name,
        'xp_added', p_xp_amount
    );

    RETURN v_result;
END;
$$;

-- ── 2) update_daily_streak ──
CREATE OR REPLACE FUNCTION public.update_daily_streak(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - 1;
    v_streak INTEGER;
    v_already_done BOOLEAN;
BEGIN
    -- 🛡️ NEW: auth check
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM daily_streaks
        WHERE user_id = p_user_id AND streak_date = v_today AND completed = true
    ) INTO v_already_done;

    IF v_already_done THEN
        SELECT streak_days INTO v_streak FROM profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('streak', COALESCE(v_streak, 0), 'already_done', true);
    END IF;

    INSERT INTO daily_streaks (user_id, streak_date, completed, questions_solved)
    VALUES (p_user_id, v_today, true, 1)
    ON CONFLICT (user_id, streak_date) DO UPDATE
    SET completed = true, questions_solved = daily_streaks.questions_solved + 1;

    IF EXISTS (
        SELECT 1 FROM daily_streaks
        WHERE user_id = p_user_id AND streak_date = v_yesterday AND completed = true
    ) THEN
        UPDATE profiles
        SET streak_days = COALESCE(streak_days, 0) + 1,
            streak_last_date = v_today
        WHERE id = p_user_id;
    ELSE
        UPDATE profiles
        SET streak_days = 1,
            streak_last_date = v_today
        WHERE id = p_user_id;
    END IF;

    SELECT streak_days INTO v_streak FROM profiles WHERE id = p_user_id;

    RETURN jsonb_build_object('streak', v_streak, 'already_done', false);
END;
$$;

-- ── 3) check_achievements ──
CREATE OR REPLACE FUNCTION public.check_achievements(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_achievement RECORD;
    v_current INTEGER;
    v_newly_unlocked JSONB := '[]'::jsonb;
BEGIN
    -- 🛡️ NEW: auth check
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    FOR v_achievement IN SELECT * FROM achievements WHERE is_active = true LOOP
        v_current := CASE v_achievement.achievement_type
            WHEN 'questions' THEN COALESCE(v_profile.total_questions_solved, 0)
            WHEN 'sessions'  THEN COALESCE(v_profile.total_sessions, 0)
            WHEN 'streak'    THEN COALESCE(v_profile.streak_days, 0)
            WHEN 'accuracy'  THEN CASE
                WHEN COALESCE(v_profile.total_questions_solved, 0) > 0
                THEN (COALESCE(v_profile.total_correct, 0) * 100 / v_profile.total_questions_solved)
                ELSE 0
            END
            ELSE 0
        END;

        INSERT INTO user_achievements (user_id, achievement_id, current_value, unlocked, unlocked_at)
        VALUES (
            p_user_id,
            v_achievement.id,
            v_current,
            v_current >= v_achievement.target_value,
            CASE WHEN v_current >= v_achievement.target_value THEN now() ELSE NULL END
        )
        ON CONFLICT (user_id, achievement_id) DO UPDATE
        SET current_value = v_current,
            unlocked = CASE
                WHEN user_achievements.unlocked THEN true
                ELSE v_current >= v_achievement.target_value
            END,
            unlocked_at = CASE
                WHEN user_achievements.unlocked THEN user_achievements.unlocked_at
                WHEN v_current >= v_achievement.target_value THEN now()
                ELSE NULL
            END;

        IF v_current >= v_achievement.target_value THEN
            IF NOT EXISTS (
                SELECT 1 FROM user_achievements
                WHERE user_id = p_user_id
                AND achievement_id = v_achievement.id
                AND unlocked = true
                AND unlocked_at < now() - interval '5 seconds'
            ) THEN
                v_newly_unlocked := v_newly_unlocked || jsonb_build_object(
                    'name', v_achievement.name,
                    'icon', v_achievement.icon,
                    'description', v_achievement.description
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('newly_unlocked', v_newly_unlocked);
END;
$$;

-- ── 4) get_my_referral_stats ──
CREATE OR REPLACE FUNCTION public.get_my_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_shared INTEGER;
    v_subscribed INTEGER;
    v_days_earned INTEGER;
BEGIN
    -- 🛡️ NEW: auth check
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    SELECT referral_code INTO v_code FROM profiles WHERE id = p_user_id;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE referred_status = 'subscribed'),
        COALESCE(SUM(bonus_days), 0)
    INTO v_shared, v_subscribed, v_days_earned
    FROM referrals
    WHERE referrer_id = p_user_id;

    RETURN jsonb_build_object(
        'referral_code', v_code,
        'shared_count', COALESCE(v_shared, 0),
        'subscribed_count', COALESCE(v_subscribed, 0),
        'days_earned', COALESCE(v_days_earned, 0)
    );
END;
$$;

-- ── 5) apply_referral (legacy bonus_days) ──
CREATE OR REPLACE FUNCTION public.apply_referral(
    p_new_user_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id UUID;
    v_settings RECORD;
BEGIN
    -- 🛡️ NEW: المستخدم يطبّق الإحالة لنفسه فقط
    IF auth.uid() IS NULL OR auth.uid() <> p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'غير مصرّح');
    END IF;

    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code));

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'كود الإحالة غير صالح');
    END IF;

    IF v_referrer_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك إحالة نفسك');
    END IF;

    SELECT * INTO v_settings FROM referral_settings LIMIT 1;

    INSERT INTO referrals (referrer_id, referred_user_id, bonus_days)
    VALUES (v_referrer_id, p_new_user_id, COALESCE(v_settings.referrer_bonus_days, 10));

    RETURN jsonb_build_object(
        'success', true,
        'referrer_bonus_days', v_settings.referrer_bonus_days,
        'referred_bonus_days', v_settings.referred_bonus_days
    );
END;
$$;

-- ── 6) log_activity ──
CREATE OR REPLACE FUNCTION public.log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 🛡️ NEW: auth check — المستخدم يسجّل نشاطه فقط
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'غير مصرّح' USING ERRCODE = '42501';
    END IF;

    INSERT INTO activity_log (user_id, action_type, description, metadata)
    VALUES (p_user_id, p_action, p_description, p_metadata);
END;
$$;

-- ── 7) get_user_leaks ──
CREATE OR REPLACE FUNCTION public.get_user_leaks(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 🛡️ NEW: auth check
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    RETURN (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', lg.id,
                'title', lg.title,
                'leak_date', lg.leak_date,
                'section', lg.section,
                'question_count', lg.question_count,
                'completed_count', COALESCE(ulp.completed_count, 0),
                'percentage', COALESCE(ulp.percentage, 0),
                'status', COALESCE(ulp.status, 'new')
            ) ORDER BY lg.leak_date DESC
        ), '[]'::jsonb)
        FROM leak_groups lg
        LEFT JOIN user_leak_progress ulp
            ON ulp.leak_group_id = lg.id AND ulp.user_id = p_user_id
        WHERE lg.is_active = true
    );
END;
$$;

-- ── 8) get_home_stats ──
-- 🚨 الأهم: هذه يكشف referral_code للمهاجم لو نفّذها على ضحية
--    → يستخدم الكود لإيقاع إحالات وهمية على نفسه
CREATE OR REPLACE FUNCTION public.get_home_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_week_correct INTEGER;
    v_week_total INTEGER;
    v_week_sessions INTEGER;
    v_streak RECORD;
    v_rank INTEGER;
BEGIN
    -- 🛡️ NEW: auth check
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RETURN jsonb_build_object('error', 'غير مصرّح');
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    SELECT
        COUNT(*) FILTER (WHERE is_correct = true),
        COUNT(*)
    INTO v_week_correct, v_week_total
    FROM attempts
    WHERE user_id = p_user_id
    AND created_at >= date_trunc('week', CURRENT_DATE);

    SELECT COUNT(*) INTO v_week_sessions
    FROM practice_sessions
    WHERE user_id = p_user_id
    AND started_at >= date_trunc('week', CURRENT_DATE);

    SELECT COUNT(*) + 1 INTO v_rank
    FROM profiles
    WHERE xp > COALESCE(v_profile.xp, 0) AND role = 'user';

    RETURN jsonb_build_object(
        'xp', COALESCE(v_profile.xp, 0),
        'level', COALESCE(v_profile.level, 1),
        'level_name', COALESCE(v_profile.level_name, 'مبتدئ'),
        'streak_days', COALESCE(v_profile.streak_days, 0),
        'total_solved', COALESCE(v_profile.total_questions_solved, 0),
        'total_correct', COALESCE(v_profile.total_correct, 0),
        'week_correct', v_week_correct,
        'week_total', v_week_total,
        'week_accuracy', CASE WHEN v_week_total > 0 THEN ROUND((v_week_correct::numeric / v_week_total) * 100) ELSE 0 END,
        'week_sessions', v_week_sessions,
        'rank', v_rank,
        'referral_code', v_profile.referral_code
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) جميع الدوال أُعيد إنشاؤها (8 صفوف):
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema='public' AND routine_name IN (
--      'update_user_xp','update_daily_streak','check_achievements',
--      'get_my_referral_stats','apply_referral','log_activity',
--      'get_user_leaks','get_home_stats'
--    );
--
-- 2) اختبار سلبي (يجب يفشل):
--    SET ROLE authenticated;
--    SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
--    SELECT update_user_xp('99999999-9999-9999-9999-999999999999'::uuid, 100);
--    -- المتوقّع: { success: false, error: 'غير مصرّح' }
--
-- 3) اختبار XP cap:
--    SELECT update_user_xp(auth.uid(), 99999);  -- as logged-in user
--    -- المتوقّع: { success: false, error: 'p_xp_amount يجب...' }
--
-- 4) اختبار XP طبيعي:
--    SELECT update_user_xp(auth.uid(), 50);
--    -- المتوقّع: { success: true, xp: ..., level: ... }
-- ═══════════════════════════════════════════════════════════════
