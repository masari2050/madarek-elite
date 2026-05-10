-- ============================================================
-- مدارك النخبة v7 — Migration 02
-- الجداول الجديدة (لا تمس أي جدول موجود)
-- ============================================================

-- ────────────────────────────────────────────
-- 1. مجموعات التسريبات
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leak_groups (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL,
    leak_date     DATE NOT NULL,
    section       TEXT NOT NULL DEFAULT 'مختلط',
    question_count INTEGER DEFAULT 0,
    description   TEXT,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- ربط الـ FK بعد إنشاء الجدول
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_questions_leak_group'
    ) THEN
        ALTER TABLE questions
        ADD CONSTRAINT fk_questions_leak_group
        FOREIGN KEY (leak_group_id) REFERENCES leak_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ────────────────────────────────────────────
-- 2. تقدم المستخدم في التسريبات
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_leak_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leak_group_id   UUID NOT NULL REFERENCES leak_groups(id) ON DELETE CASCADE,
    completed_count INTEGER DEFAULT 0,
    total_count     INTEGER DEFAULT 0,
    percentage      NUMERIC(5,2) DEFAULT 0,
    status          TEXT DEFAULT 'new',  -- new / in_progress / completed
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, leak_group_id)
);

-- ────────────────────────────────────────────
-- 3. الأسئلة المحفوظة
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_questions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    saved_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, question_id)
);

-- ────────────────────────────────────────────
-- 4. تعريفات الإنجازات (الشارات)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    description  TEXT,
    icon         TEXT DEFAULT '🏆',
    target_value INTEGER NOT NULL DEFAULT 1,
    achievement_type TEXT NOT NULL DEFAULT 'questions',
    -- questions / sessions / streak / accuracy / leaks
    sort_order   INTEGER DEFAULT 0,
    is_active    BOOLEAN DEFAULT true,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 5. إنجازات المستخدم
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    current_value   INTEGER DEFAULT 0,
    unlocked        BOOLEAN DEFAULT false,
    unlocked_at     TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
);

-- ────────────────────────────────────────────
-- 6. الإحالات
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referred_status TEXT DEFAULT 'registered', -- registered / subscribed
    bonus_days      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 7. إعدادات نظام الإحالة
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_bonus_days INTEGER DEFAULT 10,
    referred_bonus_days INTEGER DEFAULT 7,
    is_active           BOOLEAN DEFAULT true,
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- إدخال صف افتراضي
INSERT INTO referral_settings (referrer_bonus_days, referred_bonus_days)
SELECT 10, 7
WHERE NOT EXISTS (SELECT 1 FROM referral_settings LIMIT 1);

-- ────────────────────────────────────────────
-- 8. السلسلة اليومية (Streak)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_streaks (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    questions_solved INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, streak_date)
);

-- ────────────────────────────────────────────
-- 9. البنرات والإعلانات (3 أنواع)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banner_type TEXT NOT NULL, -- ticker / image / main
    is_active  BOOLEAN DEFAULT false,
    config     JSONB NOT NULL DEFAULT '{}',
    -- ticker: { keyword, keyword_color, text, bg_color, text_color, speed, pinned }
    -- image:  { image_url }
    -- main:   { tag, cta_text, title, subtitle, bg_left, bg_right, btn_color, btn_text_color }
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 10. النصائح اليومية
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tips (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emoji      TEXT DEFAULT '💡',
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active  BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 11. إشعارات المستخدم
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT,
    notif_type TEXT DEFAULT 'info', -- info / achievement / streak / subscription / system
    is_read    BOOLEAN DEFAULT false,
    metadata   JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 12. الترتيب الأسبوعي
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard_weekly (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    xp_earned  INTEGER DEFAULT 0,
    rank       INTEGER,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, week_start)
);

-- ────────────────────────────────────────────
-- 13. الصفحات التعريفية (أدمن)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       TEXT NOT NULL UNIQUE,  -- privacy / terms / about / custom-xxx
    title      TEXT NOT NULL,
    description TEXT,
    content    TEXT DEFAULT '',  -- HTML content
    logo_url   TEXT,
    is_active  BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 14. خطط الاشتراك
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,          -- شهري / ربع سنوي / سنوي
    slug            TEXT NOT NULL UNIQUE,    -- monthly / quarterly / yearly
    price           NUMERIC(10,2) NOT NULL,
    duration_days   INTEGER NOT NULL,
    features        JSONB DEFAULT '[]',     -- مصفوفة الميزات
    is_active       BOOLEAN DEFAULT true,
    is_featured     BOOLEAN DEFAULT false,  -- الخطة المميزة (الأوفر)
    savings_text    TEXT,                   -- "وفر 55 ريال"
    subscriber_count INTEGER DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- إدخال الخطط الافتراضية
INSERT INTO plans (name, slug, price, duration_days, is_featured, savings_text, sort_order)
SELECT * FROM (VALUES
    ('شهري',      'monthly',   115.00, 30,  false, NULL,            1),
    ('3 أشهر',    'quarterly', 290.00, 90,  true,  'وفّر 55 ريال',  2),
    ('سنوي',      'yearly',    900.00, 365, false, 'وفّر 480 ريال', 3)
) AS v(name, slug, price, duration_days, is_featured, savings_text, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM plans LIMIT 1);

-- ────────────────────────────────────────────
-- 15. إحصائيات الموظفين
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_stats (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_role      TEXT DEFAULT 'موظف',
    questions_added   INTEGER DEFAULT 0,
    quality_score     NUMERIC(5,2) DEFAULT 0,
    tickets_resolved  INTEGER DEFAULT 0,
    rating            NUMERIC(3,1) DEFAULT 0,
    custom_permissions JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 16. إعدادات SEO
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_settings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_tag        TEXT DEFAULT 'مدارك النخبة — تدريب الرخصة المهنية',
    meta_description TEXT DEFAULT '',
    keywords         TEXT DEFAULT '',
    og_title         TEXT DEFAULT '',
    og_description   TEXT DEFAULT '',
    og_image_url     TEXT DEFAULT '',
    updated_at       TIMESTAMPTZ DEFAULT now()
);

INSERT INTO seo_settings (title_tag)
SELECT 'مدارك النخبة — تدريب الرخصة المهنية'
WHERE NOT EXISTS (SELECT 1 FROM seo_settings LIMIT 1);

-- ────────────────────────────────────────────
-- 17. تحليلات الزوار (تجميع بالساعة)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitor_stats (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_date  DATE NOT NULL,
    hour_slot  INTEGER,  -- 0-23
    source     TEXT DEFAULT 'direct', -- direct / twitter / tiktok / instagram / google / referral
    visits     INTEGER DEFAULT 0,
    signups    INTEGER DEFAULT 0,
    subscriptions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────
-- 18. سجل النشاطات (Activity Feed للأدمن)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    -- signup / subscribe / practice / report / visit / login / achievement
    description TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- فهارس الأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leak_groups_date ON leak_groups(leak_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_leak_progress_user ON user_leak_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_questions_user ON saved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_date ON daily_streaks(user_id, streak_date DESC);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active, banner_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_week ON leaderboard_weekly(week_start, xp_earned DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_stats_date ON visitor_stats(stat_date, hour_slot);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(action_type);
