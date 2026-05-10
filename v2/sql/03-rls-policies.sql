-- ============================================================
-- مدارك النخبة v7 — Migration 03
-- RLS Policies للجداول الجديدة
-- ============================================================

-- ────────────────────────────────────────────
-- دالة مساعدة: هل المستخدم أدمن؟
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'staff')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 1. leak_groups — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE leak_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leak_groups_select_all" ON leak_groups
    FOR SELECT USING (true);

CREATE POLICY "leak_groups_admin_insert" ON leak_groups
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "leak_groups_admin_update" ON leak_groups
    FOR UPDATE USING (is_admin());

CREATE POLICY "leak_groups_admin_delete" ON leak_groups
    FOR DELETE USING (is_admin());

-- ============================================================
-- 2. user_leak_progress — المستخدم يقرأ ويكتب بياناته فقط
-- ============================================================
ALTER TABLE user_leak_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_leak_progress_own_select" ON user_leak_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_leak_progress_own_insert" ON user_leak_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_leak_progress_own_update" ON user_leak_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_leak_progress_admin_all" ON user_leak_progress
    FOR ALL USING (is_admin());

-- ============================================================
-- 3. saved_questions — المستخدم يدير محفوظاته فقط
-- ============================================================
ALTER TABLE saved_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_questions_own_select" ON saved_questions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_questions_own_insert" ON saved_questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_questions_own_delete" ON saved_questions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. achievements — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_select_all" ON achievements
    FOR SELECT USING (true);

CREATE POLICY "achievements_admin_insert" ON achievements
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "achievements_admin_update" ON achievements
    FOR UPDATE USING (is_admin());

-- ============================================================
-- 5. user_achievements — المستخدم يقرأ بياناته، النظام يكتب
-- ============================================================
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_achievements_own_select" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_system_insert" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_achievements_system_update" ON user_achievements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_achievements_admin_all" ON user_achievements
    FOR ALL USING (is_admin());

-- ============================================================
-- 6. referrals — المحيل يقرأ إحالاته
-- ============================================================
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_own_select" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "referrals_insert_on_signup" ON referrals
    FOR INSERT WITH CHECK (true);
    -- الإدراج يتم عند التسجيل عبر RPC

CREATE POLICY "referrals_admin_all" ON referrals
    FOR ALL USING (is_admin());

-- ============================================================
-- 7. referral_settings — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_settings_select_all" ON referral_settings
    FOR SELECT USING (true);

CREATE POLICY "referral_settings_admin_update" ON referral_settings
    FOR UPDATE USING (is_admin());

-- ============================================================
-- 8. daily_streaks — المستخدم يدير سلسلته
-- ============================================================
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_streaks_own_select" ON daily_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_streaks_own_insert" ON daily_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_streaks_own_update" ON daily_streaks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "daily_streaks_admin_all" ON daily_streaks
    FOR ALL USING (is_admin());

-- ============================================================
-- 9. banners — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_select_active" ON banners
    FOR SELECT USING (true);

CREATE POLICY "banners_admin_insert" ON banners
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "banners_admin_update" ON banners
    FOR UPDATE USING (is_admin());

CREATE POLICY "banners_admin_delete" ON banners
    FOR DELETE USING (is_admin());

-- ============================================================
-- 10. tips — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_select_all" ON tips
    FOR SELECT USING (true);

CREATE POLICY "tips_admin_insert" ON tips
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "tips_admin_update" ON tips
    FOR UPDATE USING (is_admin());

CREATE POLICY "tips_admin_delete" ON tips
    FOR DELETE USING (is_admin());

-- ============================================================
-- 11. user_notifications — المستخدم يقرأ إشعاراته
-- ============================================================
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_own_select" ON user_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_notifications_own_update" ON user_notifications
    FOR UPDATE USING (auth.uid() = user_id);
    -- تحديث is_read فقط

CREATE POLICY "user_notifications_system_insert" ON user_notifications
    FOR INSERT WITH CHECK (true);
    -- النظام يرسل الإشعارات

CREATE POLICY "user_notifications_admin_all" ON user_notifications
    FOR ALL USING (is_admin());

-- ============================================================
-- 12. leaderboard_weekly — القراءة للجميع
-- ============================================================
ALTER TABLE leaderboard_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leaderboard_weekly_select_all" ON leaderboard_weekly
    FOR SELECT USING (true);

CREATE POLICY "leaderboard_weekly_system_upsert" ON leaderboard_weekly
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leaderboard_weekly_system_update" ON leaderboard_weekly
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "leaderboard_weekly_admin_all" ON leaderboard_weekly
    FOR ALL USING (is_admin());

-- ============================================================
-- 13. pages — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_select_all" ON pages
    FOR SELECT USING (true);

CREATE POLICY "pages_admin_insert" ON pages
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "pages_admin_update" ON pages
    FOR UPDATE USING (is_admin());

CREATE POLICY "pages_admin_delete" ON pages
    FOR DELETE USING (is_admin());

-- ============================================================
-- 14. plans — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all" ON plans
    FOR SELECT USING (true);

CREATE POLICY "plans_admin_insert" ON plans
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "plans_admin_update" ON plans
    FOR UPDATE USING (is_admin());

-- ============================================================
-- 15. staff_stats — الأدمن فقط
-- ============================================================
ALTER TABLE staff_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_stats_admin_all" ON staff_stats
    FOR ALL USING (is_admin());

CREATE POLICY "staff_stats_own_select" ON staff_stats
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 16. seo_settings — القراءة للجميع، الكتابة للأدمن
-- ============================================================
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_settings_select_all" ON seo_settings
    FOR SELECT USING (true);

CREATE POLICY "seo_settings_admin_update" ON seo_settings
    FOR UPDATE USING (is_admin());

-- ============================================================
-- 17. visitor_stats — الأدمن فقط + النظام يكتب
-- ============================================================
ALTER TABLE visitor_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_stats_admin_select" ON visitor_stats
    FOR SELECT USING (is_admin());

CREATE POLICY "visitor_stats_system_insert" ON visitor_stats
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- 18. activity_log — الأدمن يقرأ + النظام يكتب
-- ============================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_admin_select" ON activity_log
    FOR SELECT USING (is_admin());

CREATE POLICY "activity_log_system_insert" ON activity_log
    FOR INSERT WITH CHECK (true);
