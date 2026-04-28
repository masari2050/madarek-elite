-- ═══════════════════════════════════════════════════════════════
-- Migration 28 — إصلاحات RLS حرجة (audit مساء 2026-04-28)
-- ═══════════════════════════════════════════════════════════════
--
-- الـ audit الحيّ في Supabase كشف عدّة ثغرات حرجة:
--
-- 🔴 1. questions :: "allow update delete for authenticated" qual=true
--    الخطر: أي مصادَق يقدر يحذف/يعدّل كل الأسئلة في قاعدة البيانات
--    أي حساب فري يُفرغ منصّة الدراسة بسطر واحد:
--      delete from questions where 1=1
--
-- 🔴 2. questions :: "allow insert for authenticated" qual=∅
--    الخطر: أي مصادَق يدخل أسئلة وهمية مع إجابات مغلوطة
--
-- 🔴 3. profiles :: "Anyone can read leaderboard data" qual=true
--    الخطر: أي مصادَق يقرأ كل أعمدة profiles لكل المستخدمين:
--    email, phone, stc_pay_number (IBAN!), subscription_type, referral_code
--    هذا أكبر PII leak في النظام كله.
--    الحل: نخلق view محدودة `v_leaderboard_public` تكشف full_name + xp + level فقط
--    ونحذف الـ policy المفتوحة.
--
-- 🔴 4. payments :: "Users can insert own payments" qual=∅
--    الخطر: أي مصادَق يدخل سجل payment وهمي (status='paid')
--    التطبيق فعلياً يكتب payments عبر service_role من Edge Function.
--    الـ INSERT من العميل غير ضروري.
--    الحل: نحذف الـ policy، نحصرها لـ service_role.
--
-- 🔴 5. referrals :: "ref_insert" qual=∅ with_check=true
--    SQL 26 حاول DROP "referrals_insert_on_signup" لكن الـ policy الفعلية
--    اسمها "ref_insert". لذا الثغرة لا تزال نشطة.
--    الحل: DROP "ref_insert" — يبقى "referrals_no_direct_insert" (false)
--
-- 🔴 6. coupons :: anon_read_coupons + Authenticated can read coupons (qual=true)
--    الخطر: أي شخص (حتى غير مسجّل!) يسحب كل أكواد الكوبونات
--    يقدر يستفيد من خصومات لم تُروَّج بعد، أو يتحقّق من صحّة الكوبون قبل الاستخدام
--    الحل: حذف policies المفتوحة. الـ apply_coupon RPC يتحقّق server-side.
--
-- 🟠 7. admin_activity_log :: "Staff can read logs" qual=true
--    الخطر: أي مصادَق يقرأ سجل عمليات الإدارة (يكشف من فعل ماذا)
--    الحل: قَيّد بـ is_admin()
--
-- 🟠 8. تنظيف policies المكرّرة في questions (13 policy متداخلة)
--    الخطر العملي: محدود (read-only) لكن سهولة الخطأ المستقبلي مرتفعة
--    الحل: نُبقي 2 policy واضحتين فقط
--
-- استراتيجية:
--   • DROP POLICY IF EXISTS — آمن، يعالج الـ policies الموجودة فقط
--   • CREATE POLICY الجديدة بدلاً من المحذوفة لو لزم
--   • لا تأثير على flow التطبيق الحقيقي — كل العمليات الشرعية تتم
--     عبر service_role أو SECURITY DEFINER (تتجاوز RLS)
-- ═══════════════════════════════════════════════════════════════

-- ── 1) questions — حذف الـ policies الكارثيّة + تنظيف ──
-- الحذف الكامل ثم إعادة بناء بـ policy واحدة آمنة
DROP POLICY IF EXISTS "allow update delete for authenticated" ON public.questions;
DROP POLICY IF EXISTS "allow insert for authenticated" ON public.questions;
DROP POLICY IF EXISTS "allow select for all" ON public.questions;
DROP POLICY IF EXISTS "allow_public_read_questions" ON public.questions;
DROP POLICY IF EXISTS "questions_read_all" ON public.questions;
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
DROP POLICY IF EXISTS "read questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
DROP POLICY IF EXISTS "Students can read all questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can delete questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Admin can update questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can do everything on questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- إعادة البناء — 2 policies فقط واضحتين
-- (أ) قراءة: للجميع (المحتوى التعليمي عام بطبيعته)
CREATE POLICY "questions_read_all" ON public.questions
    FOR SELECT
    USING (true);

-- (ب) كتابة/حذف: للأدمن فقط
CREATE POLICY "questions_admin_write" ON public.questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- ── 2) profiles — حذف PII leak الكبير ──
-- الـ policy "Anyone can read leaderboard data" تُمكّن أي مصادَق من قراءة
-- جميع أعمدة profiles (email/phone/stc_pay_number/...). نحذفها ونستبدلها بـ view محدود.

DROP POLICY IF EXISTS "Anyone can read leaderboard data" ON public.profiles;

-- إنشاء view عام لـ leaderboard — يكشف فقط الحقول العامة الآمنة
CREATE OR REPLACE VIEW public.v_leaderboard_public AS
SELECT
    id AS user_id,
    full_name,
    avatar_emoji,
    COALESCE(xp, 0) AS xp,
    COALESCE(level, 1) AS level,
    COALESCE(level_name, 'مبتدئ') AS level_name
FROM public.profiles
WHERE COALESCE(role, 'user') = 'user';  -- نخفي admin/staff من الـ leaderboard

GRANT SELECT ON public.v_leaderboard_public TO authenticated, anon;

COMMENT ON VIEW public.v_leaderboard_public IS
  'view آمن لـ leaderboard — يكشف فقط الحقول العامة (full_name، xp، level). لا يكشف email/phone/IBAN/referral_code.';

-- ── 3) payments — حذف INSERT من العميل (يكتبها service_role فقط) ──
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;

-- نتأكّد إن service_role لا يزال يقدر يكتب (هو يتجاوز RLS تلقائياً، لكن للوضوح)
-- لا حاجة policy جديدة — service_role يتجاوز RLS بشكل افتراضي

COMMENT ON TABLE public.payments IS
  'payments تُكتب من Edge Functions (verify-payment / autorenew-charge) عبر service_role فقط. INSERT من العميل غير مسموح.';

-- ── 4) referrals :: حذف الـ policy المفتوحة الفعلية ──
-- SQL 26 حاول حذف "referrals_insert_on_signup" لكن الفعلية اسمها "ref_insert"
DROP POLICY IF EXISTS "ref_insert" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_on_signup" ON public.referrals;  -- مكرّر، آمن

-- نتأكّد إن referrals_no_direct_insert (من SQL 26) موجودة. لو فُقدت لأي سبب، نُعيدها.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='referrals'
          AND policyname='referrals_no_direct_insert'
    ) THEN
        EXECUTE 'CREATE POLICY "referrals_no_direct_insert" ON public.referrals
            FOR INSERT WITH CHECK (false)';
    END IF;
END $$;

-- ── 5) coupons — حذف open read access ──
DROP POLICY IF EXISTS "anon_read_coupons" ON public.coupons;
DROP POLICY IF EXISTS "Authenticated can read coupons" ON public.coupons;
DROP POLICY IF EXISTS "authenticated_read_coupons" ON public.coupons;

-- نُبقي "Admins can manage coupons" + "Admin can update coupons" + "Admin can delete coupons"
-- + "Admin can insert coupons" — كلها is_admin() check.
--
-- العميل لا يحتاج read مباشر — apply_coupon RPC تتحقّق server-side وتُرجع
-- النتيجة فقط (هل الكود صالح؟ + قيمة الخصم) دون كشف قائمة الأكواد الأخرى.

COMMENT ON TABLE public.coupons IS
  'لا قراءة مباشرة من العميل. تحقّق صحّة الكود فقط عبر apply_coupon() RPC.';

-- ── 6) admin_activity_log — قَيّد القراءة لـ is_admin() ──
DROP POLICY IF EXISTS "Staff can read logs" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Staff can insert logs" ON public.admin_activity_log;

CREATE POLICY "admin_activity_log_admin_read" ON public.admin_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

CREATE POLICY "admin_activity_log_admin_insert" ON public.admin_activity_log
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- ── 6.5) get_public_stats — استبدال count(profiles) المباشر ──
-- التطبيق و v2 يحتاجان عدد المستخدمين لشاشة الترحيب (marketing).
-- بعد حذف "Anyone can read leaderboard data"، count المباشر يفشل.
-- الحل: function آمنة تُرجع counts فقط دون أي بيانات شخصية.
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM profiles WHERE COALESCE(role, 'user') = 'user'),
        'total_questions', (SELECT COUNT(*) FROM questions WHERE COALESCE(disabled, FALSE) = FALSE)
    );
$$;

-- متاح للجميع (anon + authenticated) — لا يكشف أي PII
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_stats() IS
  'إحصائيات عامة لشاشة الترحيب — يُرجع counts فقط بدون أي بيانات شخصية.';

-- ── 7) profiles INSERT — تنظيف وتشديد ──
-- 3 policies INSERT متداخلة (Anyone + Users + allow_trigger_insert)
-- نُبقي واحدة نظيفة: المستخدم يُدخل profile id = auth.uid() الخاص به
DROP POLICY IF EXISTS "Anyone can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
-- "allow_trigger_insert" نتركها — التريغر التلقائي عند signup يحتاجها

-- إعادة بناء INSERT policy واحدة محكمة
CREATE POLICY "profiles_insert_self" ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);
    -- IS NULL يسمح للـ trigger (يعمل بدون auth context عند signup)

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) policies المفتوحة على questions اختفت:
--    SELECT policyname, cmd, qual, with_check
--    FROM pg_policies
--    WHERE tablename='questions' AND schemaname='public';
--    -- المتوقّع: 2 صفوف فقط (questions_read_all + questions_admin_write)
--
-- 2) Anyone can read leaderboard data اختفت:
--    SELECT COUNT(*) FROM pg_policies
--    WHERE tablename='profiles' AND policyname='Anyone can read leaderboard data';
--    -- المتوقّع: 0
--
-- 3) View جديد:
--    SELECT * FROM v_leaderboard_public LIMIT 5;
--    -- المتوقّع: 5 صفوف بـ user_id, full_name, avatar_emoji, xp, level فقط
--
-- 4) payments :: Users can insert اختفت:
--    SELECT COUNT(*) FROM pg_policies
--    WHERE tablename='payments' AND cmd='INSERT';
--    -- المتوقّع: 0 (لا insert policy = service_role فقط يكتب عبر تجاوز RLS)
--
-- 5) ref_insert اختفت:
--    SELECT COUNT(*) FROM pg_policies
--    WHERE tablename='referrals' AND policyname='ref_insert';
--    -- المتوقّع: 0
--
-- 6) coupons read مقيّد:
--    SELECT policyname, cmd, qual FROM pg_policies
--    WHERE tablename='coupons' AND cmd='SELECT';
--    -- المتوقّع: لا يوجد qual=true. فقط is_admin() أو مشابه
-- ═══════════════════════════════════════════════════════════════
