-- ============================================================
-- مدارك النخبة v7 — Migration 05
-- دوال RPC جديدة (لا تمس الدوال الموجودة)
-- ============================================================

-- ────────────────────────────────────────────
-- 1. تحديث XP ومستوى المستخدم
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_user_xp(
    p_user_id UUID,
    p_xp_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
    v_level_name TEXT;
    v_result JSONB;
BEGIN
    UPDATE profiles
    SET xp = COALESCE(xp, 0) + p_xp_amount
    WHERE id = p_user_id
    RETURNING xp INTO v_new_xp;

    -- حساب المستوى (كل 200 XP = مستوى)
    v_new_level := GREATEST(1, (v_new_xp / 200) + 1);

    -- اسم المستوى
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
        'xp', v_new_xp,
        'level', v_new_level,
        'level_name', v_level_name,
        'xp_added', p_xp_amount
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 2. تحديث السلسلة اليومية (Streak)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - 1;
    v_streak INTEGER;
    v_already_done BOOLEAN;
BEGIN
    -- هل المستخدم تدرب اليوم؟
    SELECT EXISTS (
        SELECT 1 FROM daily_streaks
        WHERE user_id = p_user_id AND streak_date = v_today AND completed = true
    ) INTO v_already_done;

    IF v_already_done THEN
        SELECT streak_days INTO v_streak FROM profiles WHERE id = p_user_id;
        RETURN jsonb_build_object('streak', COALESCE(v_streak, 0), 'already_done', true);
    END IF;

    -- سجل اليوم
    INSERT INTO daily_streaks (user_id, streak_date, completed, questions_solved)
    VALUES (p_user_id, v_today, true, 1)
    ON CONFLICT (user_id, streak_date) DO UPDATE
    SET completed = true, questions_solved = daily_streaks.questions_solved + 1;

    -- هل تدرب أمس؟
    IF EXISTS (
        SELECT 1 FROM daily_streaks
        WHERE user_id = p_user_id AND streak_date = v_yesterday AND completed = true
    ) THEN
        -- استمرار السلسلة
        UPDATE profiles
        SET streak_days = COALESCE(streak_days, 0) + 1,
            streak_last_date = v_today
        WHERE id = p_user_id;
    ELSE
        -- بداية سلسلة جديدة
        UPDATE profiles
        SET streak_days = 1,
            streak_last_date = v_today
        WHERE id = p_user_id;
    END IF;

    SELECT streak_days INTO v_streak FROM profiles WHERE id = p_user_id;

    RETURN jsonb_build_object('streak', v_streak, 'already_done', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 3. فحص وفتح الإنجازات
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_achievement RECORD;
    v_current INTEGER;
    v_newly_unlocked JSONB := '[]'::jsonb;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    FOR v_achievement IN SELECT * FROM achievements WHERE is_active = true LOOP
        -- حساب القيمة الحالية حسب نوع الإنجاز
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

        -- تحديث أو إدراج
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
                WHEN user_achievements.unlocked THEN true  -- لا نعيد قفل شارة مفتوحة
                ELSE v_current >= v_achievement.target_value
            END,
            unlocked_at = CASE
                WHEN user_achievements.unlocked THEN user_achievements.unlocked_at
                WHEN v_current >= v_achievement.target_value THEN now()
                ELSE NULL
            END;

        -- إذا فُتحت الآن لأول مرة
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 4. جلب إحصائيات الإحالة للمستخدم
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_referral_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_code TEXT;
    v_shared INTEGER;
    v_subscribed INTEGER;
    v_days_earned INTEGER;
BEGIN
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
        'shared', v_shared,
        'subscribed', v_subscribed,
        'days_earned', v_days_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 5. تطبيق إحالة عند التسجيل
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION apply_referral(
    p_new_user_id UUID,
    p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_referrer_id UUID;
    v_settings RECORD;
BEGIN
    -- ابحث عن المُحيل
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = UPPER(TRIM(p_referral_code));

    IF v_referrer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'كود الإحالة غير صالح');
    END IF;

    IF v_referrer_id = p_new_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكنك إحالة نفسك');
    END IF;

    -- جلب إعدادات الإحالة
    SELECT * INTO v_settings FROM referral_settings LIMIT 1;

    -- سجل الإحالة
    INSERT INTO referrals (referrer_id, referred_user_id, bonus_days)
    VALUES (v_referrer_id, p_new_user_id, COALESCE(v_settings.referrer_bonus_days, 10));

    RETURN jsonb_build_object(
        'success', true,
        'referrer_bonus_days', v_settings.referrer_bonus_days,
        'referred_bonus_days', v_settings.referred_bonus_days
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 6. جلب المتصدرين v2 (مع XP والمنصة)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_leaderboard_v2(
    p_period TEXT DEFAULT 'week',
    p_limit INTEGER DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF p_period = 'week' THEN
        SELECT jsonb_agg(row_data ORDER BY xp DESC)
        INTO v_result
        FROM (
            SELECT jsonb_build_object(
                'user_id', lw.user_id,
                'name', p.full_name,
                'avatar', p.avatar_emoji,
                'xp', lw.xp_earned,
                'rank', ROW_NUMBER() OVER (ORDER BY lw.xp_earned DESC)
            ) AS row_data, lw.xp_earned
            FROM leaderboard_weekly lw
            JOIN profiles p ON p.id = lw.user_id
            WHERE lw.week_start = date_trunc('week', CURRENT_DATE)::date
            ORDER BY lw.xp_earned DESC
            LIMIT p_limit
        ) sub;
    ELSE
        SELECT jsonb_agg(row_data ORDER BY xp DESC)
        INTO v_result
        FROM (
            SELECT jsonb_build_object(
                'user_id', p.id,
                'name', p.full_name,
                'avatar', p.avatar_emoji,
                'xp', COALESCE(p.xp, 0),
                'rank', ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC)
            ) AS row_data, COALESCE(p.xp, 0) as xp
            FROM profiles p
            WHERE p.role = 'user'
            ORDER BY p.xp DESC NULLS LAST
            LIMIT p_limit
        ) sub;
    END IF;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 7. تسجيل نشاط (Activity Log)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
    INSERT INTO activity_log (user_id, action_type, description, metadata)
    VALUES (p_user_id, p_action, p_description, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 8. جلب تقدم التسريبات للمستخدم
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_leaks(p_user_id UUID)
RETURNS JSONB AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 9. إحصائيات الرئيسية (Home Stats)
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_home_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_week_correct INTEGER;
    v_week_total INTEGER;
    v_week_sessions INTEGER;
    v_streak RECORD;
    v_rank INTEGER;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    -- إحصائيات الأسبوع
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

    -- الترتيب
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
