-- ═══════════════════════════════════════════════════
-- 📊 نظام التتبع والإشعارات — مدارك النخبة
-- شغّل هذا في SQL Editor في لوحة Supabase
-- ═══════════════════════════════════════════════════

-- ──────────────────────────────────
-- 1) جدول أحداث التتبع (Analytics)
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    anonymous_id text,
    event_type text NOT NULL,
    page_path text,
    metadata jsonb DEFAULT '{}',
    device text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);

-- ──────────────────────────────────
-- 2) جدول إشعارات الأدمن
-- ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_read ON admin_notifications(is_read, created_at DESC);

-- ──────────────────────────────────
-- 3) سياسات الأمان (RLS)
-- ──────────────────────────────────
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- أي شخص يقدر يضيف أحداث (مسجّل أو زائر)
CREATE POLICY "Anyone can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- بس الأدمن يشوف البيانات
CREATE POLICY "Admin can read analytics" ON analytics_events
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));

-- إشعارات الأدمن: قراءة وتحديث فقط للأدمن
CREATE POLICY "Admin read notifications" ON admin_notifications
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));

CREATE POLICY "Admin update notifications" ON admin_notifications
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff')));

-- ──────────────────────────────────
-- 4) تريقر: إشعار عند تسجيل عضو جديد
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO admin_notifications (type, title, body, metadata)
    VALUES (
        'new_signup',
        '🎉 عضو جديد سجّل!',
        COALESCE(NEW.full_name, 'عضو جديد'),
        jsonb_build_object(
            'user_id', NEW.id,
            'email', NEW.email,
            'avatar', COALESCE(NEW.avatar_emoji, '👤'),
            'name', COALESCE(NEW.full_name, 'بدون اسم')
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_user_signup ON profiles;
CREATE TRIGGER on_new_user_signup
    AFTER INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION notify_new_signup();

-- ──────────────────────────────────
-- 5) إضافة حقل آخر دخول في profiles
-- ──────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ──────────────────────────────────
-- 6) دالة إحصائيات الأدمن المتقدمة
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_analytics(days_back int DEFAULT 30)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT count(*) FROM profiles WHERE role = 'user'),
        'new_users_today', (SELECT count(*) FROM profiles WHERE role = 'user' AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Riyadh'),
        'new_users_week', (SELECT count(*) FROM profiles WHERE role = 'user' AND created_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Riyadh')),
        'new_users_month', (SELECT count(*) FROM profiles WHERE role = 'user' AND created_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh')),
        'active_today', (SELECT count(DISTINCT user_id) FROM attempts WHERE answered_at >= CURRENT_DATE AT TIME ZONE 'Asia/Riyadh'),
        'active_week', (SELECT count(DISTINCT user_id) FROM attempts WHERE answered_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Riyadh')),
        'online_now', (SELECT count(*) FROM profiles WHERE last_seen_at > now() - interval '5 minutes'),
        'total_attempts_today', (SELECT count(*) FROM attempts WHERE answered_at >= CURRENT_DATE AT TIME ZONE 'Asia/Riyadh'),
        'total_page_views_today', (SELECT count(*) FROM analytics_events WHERE event_type = 'page_view' AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Riyadh'),
        'visitors_today', (SELECT count(DISTINCT COALESCE(user_id::text, anonymous_id)) FROM analytics_events WHERE event_type = 'page_view' AND created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Riyadh'),
        'top_pages', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
                SELECT page_path, count(*) as views
                FROM analytics_events
                WHERE event_type = 'page_view' AND created_at >= now() - (days_back || ' days')::interval
                GROUP BY page_path ORDER BY views DESC LIMIT 10
            ) t
        ),
        'signups_by_day', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
                SELECT (created_at AT TIME ZONE 'Asia/Riyadh')::date as day, count(*) as count
                FROM profiles WHERE role = 'user' AND created_at >= now() - (days_back || ' days')::interval
                GROUP BY day ORDER BY day
            ) t
        ),
        'device_breakdown', (
            SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
                SELECT device, count(*) as count
                FROM analytics_events
                WHERE event_type = 'page_view' AND created_at >= now() - (days_back || ' days')::interval AND device IS NOT NULL
                GROUP BY device ORDER BY count DESC
            ) t
        )
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────
-- 7) دالة تفاصيل المستخدمين للأدمن
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_users_details(page_num int DEFAULT 0, page_size int DEFAULT 50)
RETURNS jsonb AS $$
BEGIN
    RETURN (
        SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
            SELECT
                p.id,
                p.full_name,
                p.email,
                p.avatar_emoji,
                p.subscription_type,
                p.subscription_end,
                p.created_at,
                p.last_seen_at,
                COALESCE(a.total_attempts, 0) as total_attempts,
                COALESCE(a.correct_attempts, 0) as correct_attempts,
                CASE WHEN COALESCE(a.total_attempts, 0) > 0
                    THEN ROUND(a.correct_attempts::numeric / a.total_attempts * 100)
                    ELSE 0
                END as accuracy,
                a.last_practice
            FROM profiles p
            LEFT JOIN (
                SELECT
                    user_id,
                    count(*) as total_attempts,
                    count(*) FILTER (WHERE is_correct) as correct_attempts,
                    max(answered_at) as last_practice
                FROM attempts
                GROUP BY user_id
            ) a ON a.user_id = p.id
            WHERE p.role = 'user'
            ORDER BY p.created_at DESC
            LIMIT page_size OFFSET (page_num * page_size)
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- ✅ تم! شغّل هذا الكود في SQL Editor
-- ═══════════════════════════════════════════════════
