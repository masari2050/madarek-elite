-- ═══════════════════════════════════════════════════════
-- 🔒 مدارك النخبة — سياسات الأمان الشاملة (RLS)
-- شغّل هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ═══ 1. جدول questions — الأسئلة ═══
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- الكل يقدر يقرأ الأسئلة (مطلوب للتدريب)
DROP POLICY IF EXISTS "Anyone can read questions" ON questions;
CREATE POLICY "Anyone can read questions" ON questions
    FOR SELECT TO anon, authenticated
    USING (true);

-- فقط الأدمن يقدر يضيف/يعدل/يحذف
DROP POLICY IF EXISTS "Admin can insert questions" ON questions;
CREATE POLICY "Admin can insert questions" ON questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can update questions" ON questions;
CREATE POLICY "Admin can update questions" ON questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can delete questions" ON questions;
CREATE POLICY "Admin can delete questions" ON questions
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 2. جدول profiles — الملفات الشخصية ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ ملفه فقط + الأدمن يقرأ الكل
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- المستخدم يعدّل ملفه فقط (بدون تغيير role أو subscription_type)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- الأدمن يعدّل أي ملف
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
CREATE POLICY "Admin can update any profile" ON profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- السماح بإنشاء profile عند التسجيل
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- قراءة محدودة للـ leaderboard (الاسم والإيموجي فقط)
DROP POLICY IF EXISTS "Anyone can read leaderboard data" ON profiles;
CREATE POLICY "Anyone can read leaderboard data" ON profiles
    FOR SELECT TO anon
    USING (true);


-- ═══ 3. جدول attempts — المحاولات ═══
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- المستخدم يقرأ محاولاته فقط + الأدمن يقرأ الكل
DROP POLICY IF EXISTS "Users can read own attempts" ON attempts;
CREATE POLICY "Users can read own attempts" ON attempts
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- المستخدم يضيف محاولات لنفسه فقط
DROP POLICY IF EXISTS "Users can insert own attempts" ON attempts;
CREATE POLICY "Users can insert own attempts" ON attempts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- الأدمن يحذف المحاولات (عند حذف سؤال)
DROP POLICY IF EXISTS "Admin can delete attempts" ON attempts;
CREATE POLICY "Admin can delete attempts" ON attempts
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 4. جدول coupons — الكوبونات ═══
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- الكل يقدر يقرأ كوبون بالكود (للتحقق)
DROP POLICY IF EXISTS "Anyone can read coupons" ON coupons;
CREATE POLICY "Anyone can read coupons" ON coupons
    FOR SELECT TO anon, authenticated
    USING (true);

-- المستخدم المسجّل يقدر يحدّث used_count فقط
DROP POLICY IF EXISTS "Authenticated can update coupon usage" ON coupons;
CREATE POLICY "Authenticated can update coupon usage" ON coupons
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- فقط الأدمن يضيف/يحذف كوبونات
DROP POLICY IF EXISTS "Admin can insert coupons" ON coupons;
CREATE POLICY "Admin can insert coupons" ON coupons
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can delete coupons" ON coupons;
CREATE POLICY "Admin can delete coupons" ON coupons
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 5. جدول reports — البلاغات ═══
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- المستخدم يقدر يبلّغ
DROP POLICY IF EXISTS "Users can insert reports" ON reports;
CREATE POLICY "Users can insert reports" ON reports
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- الأدمن يقرأ ويحذف البلاغات
DROP POLICY IF EXISTS "Admin can read reports" ON reports;
CREATE POLICY "Admin can read reports" ON reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can delete reports" ON reports;
CREATE POLICY "Admin can delete reports" ON reports
    FOR DELETE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 6. جدول site_settings — إعدادات الموقع ═══
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- الكل يقرأ الإعدادات (مطلوب للبنرات والأسعار)
DROP POLICY IF EXISTS "Anyone can read settings" ON site_settings;
CREATE POLICY "Anyone can read settings" ON site_settings
    FOR SELECT TO anon, authenticated
    USING (true);

-- فقط الأدمن يعدّل/يضيف الإعدادات
DROP POLICY IF EXISTS "Admin can insert settings" ON site_settings;
CREATE POLICY "Admin can insert settings" ON site_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can update settings" ON site_settings;
CREATE POLICY "Admin can update settings" ON site_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 7. جدول practice_sessions — جلسات التدريب ═══
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own sessions" ON practice_sessions;
CREATE POLICY "Users can manage own sessions" ON practice_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- الأدمن يقرأ كل الجلسات
DROP POLICY IF EXISTS "Admin can read all sessions" ON practice_sessions;
CREATE POLICY "Admin can read all sessions" ON practice_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══ 8. جدول admin_activity_log — سجل نشاط الأدمن ═══
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can insert activity" ON admin_activity_log;
CREATE POLICY "Admin can insert activity" ON admin_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admin can read activity" ON admin_activity_log;
CREATE POLICY "Admin can read activity" ON admin_activity_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ═══════════════════════════════════════════════════════
-- ✅ تم! جميع الجداول محمية بسياسات RLS
-- ═══════════════════════════════════════════════════════
