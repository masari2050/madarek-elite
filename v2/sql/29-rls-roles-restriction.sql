-- ═══════════════════════════════════════════════════════════════
-- Migration 29 — تقييد policies بـ TO service_role صراحة
-- ═══════════════════════════════════════════════════════════════
--
-- اكتشاف audit عميق (2026-04-28 ليلي):
--   عدّة policies اسمها يقول "service_role_*" لكن الـ roles array الفعلي
--   عندها = public (افتراضي عند CREATE POLICY بدون TO clause).
--
-- النتيجة العملية: أي مصادَق (وأحياناً anon) يقدر يستخدم هذه policies
-- التي كان يُفترض أنها مقصورة لـ service_role.
--
-- الثغرات المؤكّدة (verified بـ pg_policies.roles):
--
-- 🔴 1. profiles :: service_role_can_update_profiles
--    cmd=UPDATE, qual=true, roles=public
--    الخطر الكارثي: أي شخص (anon!) يقدر يحدّث أي profile.
--    الاستغلال:
--      UPDATE profiles SET role='admin' WHERE id=auth.uid()
--      → المهاجم يعطي نفسه صلاحيات admin
--      UPDATE profiles SET email='attacker@x.com' WHERE id=victim_id
--      → سرقة الحساب عبر تغيير البريد
--
-- 🔴 2. profiles :: allow_trigger_insert
--    cmd=INSERT, with_check=true, roles=public
--    الخطر: أي شخص يدخل profile بأي UUID + أي role
--    تستخدم بشكل شرعي للـ auth trigger، لكن الـ trigger SECURITY DEFINER
--    يتجاوز RLS أصلاً → الـ policy غير ضرورية.
--
-- 🔴 3. coupon_redemptions :: service_role_insert_redemptions
--    cmd=INSERT, roles=public
--    الخطر: تزوير سجل redemption لتجاوز usage limits على الكوبونات
--
-- 🟠 4. activity_log :: al_system_insert
--    roles=public — أي شخص يدخل activity_log بأي user_id
--    الخطر: تلويث activity_log + نسبة عمليات لمستخدمين آخرين
--
-- 🟠 5. user_notifications :: un_system_insert
--    roles=public — أي شخص يرسل إشعار لأي user
--    الخطر: spam/phishing داخل التطبيق
--
-- 🟢 6. visitor_stats :: vs_system_insert
--    roles=public — أي شخص ينفخ visitor_stats
--    الخطر: cosmetic (تشويه إحصائيات)
--
-- استراتيجية الإصلاح:
--   • DROP الـ policy الحالية
--   • CREATE جديدة بـ TO service_role — تقتصر على service_role فقط
--   • التطبيق يكتب هذه الجداول حصراً عبر Edge Functions (service_role)
--     → الإصلاح لا يكسر أي flow
--   • للـ profiles INSERT: DROP بدون استبدال (SECURITY DEFINER trigger يكفي)
-- ═══════════════════════════════════════════════════════════════

-- ── 1) profiles :: service_role_can_update_profiles — كارثة ──
DROP POLICY IF EXISTS "service_role_can_update_profiles" ON public.profiles;

CREATE POLICY "service_role_can_update_profiles" ON public.profiles
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── 2) profiles :: allow_trigger_insert — حذف نهائي ──
-- الـ auth trigger handle_new_user يعمل SECURITY DEFINER → يتجاوز RLS تلقائياً
-- + لدينا profiles_insert_self من SQL 28 يغطّي الإدراج الشرعي للمستخدم
DROP POLICY IF EXISTS "allow_trigger_insert" ON public.profiles;

-- نتأكّد من بقاء profiles_insert_self (من SQL 28) — لو فُقد، نُعيده
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='profiles'
          AND policyname='profiles_insert_self'
    ) THEN
        EXECUTE 'CREATE POLICY "profiles_insert_self" ON public.profiles
            FOR INSERT
            WITH CHECK (id = auth.uid() OR auth.uid() IS NULL)';
    END IF;
END $$;

-- ── 3) coupon_redemptions :: service_role_insert_redemptions ──
DROP POLICY IF EXISTS "service_role_insert_redemptions" ON public.coupon_redemptions;

CREATE POLICY "service_role_insert_redemptions" ON public.coupon_redemptions
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ── 4) activity_log :: al_system_insert ──
DROP POLICY IF EXISTS "al_system_insert" ON public.activity_log;

CREATE POLICY "al_system_insert" ON public.activity_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- المستخدم العادي يستدعي log_activity() RPC (SECURITY DEFINER) — لا يحتاج RLS

-- ── 5) user_notifications :: un_system_insert ──
DROP POLICY IF EXISTS "un_system_insert" ON public.user_notifications;

CREATE POLICY "un_system_insert" ON public.user_notifications
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ── 6) visitor_stats :: vs_system_insert ──
DROP POLICY IF EXISTS "vs_system_insert" ON public.visitor_stats;

CREATE POLICY "vs_system_insert" ON public.visitor_stats
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- ملاحظة: 3 policies تركناها كما هي (مقصودة بـ design):
--
-- ✅ analytics_events :: "Anyone can insert analytics"
--    → تتبّع pageviews — يجب يقبل من anon + authenticated
--    → الخطر العملي: noise في analytics. نضيف rate limiting لاحقاً عبر
--       Edge Function intermediary لو لزم.
--
-- ✅ coupon_events :: "Allow public inserts on coupon_events"
--    → تتبّع views/clicks للكوبونات — يحتاج يقبل عام
--    → الخطر: cosmetic. مفصول عن coupon_redemptions الفعلي.
--
-- ✅ questions :: "questions_read_all"
--    → المحتوى التعليمي عام بطبيعته (المنصّة تستعرض أسئلة قبل التسجيل
--       لتحفيز الاشتراك). UI gates محتوى المشترك.
--
-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) profiles :: service_role_can_update_profiles مقيّدة:
--    SELECT roles FROM pg_policies
--    WHERE tablename='profiles' AND policyname='service_role_can_update_profiles';
--    -- المتوقّع: {service_role}
--
-- 2) profiles :: allow_trigger_insert محذوفة:
--    SELECT COUNT(*) FROM pg_policies
--    WHERE tablename='profiles' AND policyname='allow_trigger_insert';
--    -- المتوقّع: 0
--
-- 3) إعادة الـ audit الكلّية:
--    SELECT COUNT(*) FROM pg_policies
--    WHERE schemaname='public' AND (qual='true' OR with_check='true')
--      AND 'public' = ANY(roles)
--      AND tablename IN ('profiles','activity_log','coupon_redemptions',
--                        'user_notifications','visitor_stats');
--    -- المتوقّع: 0
-- ═══════════════════════════════════════════════════════════════
