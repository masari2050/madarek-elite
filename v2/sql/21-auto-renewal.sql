-- 21-auto-renewal.sql — التجديد التلقائي للاشتراكات
-- الهدف: يفعّل المستخدم/يوقف التجديد التلقائي من داخل التطبيق (شاشة الملف الشخصي).
-- القاعدة المُحدَّثة: كل اشتراك جديد يُجدّد تلقائياً افتراضياً، ما لم يوقفه المستخدم.
-- شغّل مرة واحدة في Supabase SQL Editor.

-- ─── 1. إضافة الأعمدة إلى profiles (إضافة فقط — لا تعديل/حذف لأعمدة موجودة) ───

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_renew_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_renew_cancelled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.auto_renew_enabled
  IS 'true = يُجدّد الاشتراك تلقائياً قبل انتهاء المدة | false = المستخدم أوقف التجديد';
COMMENT ON COLUMN public.profiles.auto_renew_cancelled_at
  IS 'وقت آخر إيقاف للتجديد — للتحليلات (إحصاء churn) ولإعادة التفعيل لو بدّل رأيه';

-- ─── 2. فهرس مساعد لـ cron التجديد القادم ───
-- cron يبحث عن: الاشتراكات اللي على وشك تنتهي + التجديد مفعّل
CREATE INDEX IF NOT EXISTS idx_profiles_autorenew_due
  ON public.profiles (subscription_end)
  WHERE auto_renew_enabled = TRUE
    AND subscription_type IS NOT NULL
    AND subscription_type <> 'free';

-- ─── 3. RLS: المستخدم يقدر يحدّث auto_renew_enabled لنفسه ───
-- سياسة profiles الحالية "users update own" تكفي (UPDATE على أي عمود). لا نحتاج سياسة إضافية.
-- تأكيد فقط:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE NOTICE 'تنبيه: لم أجد سياسة UPDATE على profiles — تأكد من 03-rls-policies.sql';
  END IF;
END $$;

-- ─── 4. Helper view للـ cron (يوم واحد قبل الانتهاء) ───
-- التجديد الفعلي (خصم بالدولار/ريال) يحتاج webhook/function منفصلة تستخدم MyFatoorah recurring payment API.
-- هذا View يعطي الدفعة القادمة المستحقّة.
CREATE OR REPLACE VIEW public.v_autorenew_due_today AS
SELECT
  p.id              AS user_id,
  p.email,
  p.full_name,
  p.subscription_type,
  p.subscription_end
FROM public.profiles p
WHERE p.auto_renew_enabled = TRUE
  AND p.subscription_type IS NOT NULL
  AND p.subscription_type <> 'free'
  AND p.subscription_end IS NOT NULL
  AND p.subscription_end::date = (NOW() + INTERVAL '1 day')::date;

COMMENT ON VIEW public.v_autorenew_due_today
  IS 'الاشتراكات اللي تنتهي غداً + التجديد التلقائي مفعّل — يستخدمه cron يومياً لتحضير الدفعات التالية';

-- ─── 5. (اختياري — يُشغَّل لاحقاً لمّا نبني MyFatoorah recurring)
-- pg_cron job يومي يقرأ v_autorenew_due_today ويستدعي Edge Function تقوم بـ POST لـ MyFatoorah.
-- لم يُفعَّل هنا — عند الجاهزية:
--   SELECT cron.schedule('autorenew-due-daily', '0 3 * * *', $$
--     SELECT net.http_post(
--       url := 'https://czzcmbxejxbotjemyuqf.supabase.co/functions/v1/autorenew-charge',
--       headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE>"}'::jsonb
--     );
--   $$);

-- ✅ بعد التشغيل:
--   1. كل المستخدمين الحاليين: auto_renew_enabled = TRUE تلقائياً (الـ default).
--   2. التطبيق يقدر يكتب في auto_renew_enabled من ProfileScreen.
--   3. الـ backend cron للخصم الفعلي سيُربط لاحقاً (MyFatoorah recurring API أو Apple IAP بعد نقل التطبيق).
