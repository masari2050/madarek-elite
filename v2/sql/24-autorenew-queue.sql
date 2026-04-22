-- ═══════════════════════════════════════════════════════════════
-- Migration 24 — طابور التجديد التلقائي + جدولة الـ cron
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية:
--   • SQL 21 أضاف `auto_renew_enabled` + view `v_autorenew_due_today`
--   • هذا الـ migration يبني طبقة البيانات لتتبّع محاولات التجديد:
--     - جدول `autorenew_attempts` يسجّل كل محاولة + رابط الدفع
--     - helpers لمعرفة المستخدمين المستحقّين + تسجيل النجاح/الفشل
--     - cron يومي يستدعي Edge Function `autorenew-charge`
--
-- تصميم التدفّق:
--   Day -1  (قبل الانتهاء)  → محاولة #1: إنشاء فاتورة + تذكير
--   Day 0   (يوم الانتهاء)  → محاولة #2 (إن لم تُدفع #1)
--   Day +1                  → محاولة #3 أخيرة
--   Day +2                  → تحويل للـ free plan (fallback)
--
-- القاعدة الذهبية:
--   • CREATE OR REPLACE و IF NOT EXISTS فقط
--   • لا تعديل على جدول profiles — نعتمد view v_autorenew_due_today كما هو
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) جدول محاولات التجديد ──
CREATE TABLE IF NOT EXISTS public.autorenew_attempts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
    plan_type       TEXT NOT NULL,                   -- monthly / quarterly / yearly
    amount          NUMERIC(10,2) NOT NULL,
    mf_invoice_id   TEXT,                            -- من MyFatoorah (للربط مع payments table لاحقاً)
    mf_invoice_url  TEXT,                            -- رابط الدفع الذي يُرسل للمستخدم
    status          TEXT NOT NULL DEFAULT 'created', -- created / paid / expired / failed / skipped
    notified_at     TIMESTAMPTZ,                     -- متى أُرسل التذكير
    paid_at         TIMESTAMPTZ,                     -- متى دفع المستخدم (إن دفع)
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autorenew_attempts_user
    ON public.autorenew_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autorenew_attempts_status
    ON public.autorenew_attempts(status)
    WHERE status IN ('created', 'failed');  -- الصفوف النشطة فقط

-- RLS: المستخدم يرى محاولاته فقط، الأدمن يرى الكل
ALTER TABLE public.autorenew_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'autorenew_attempts'
          AND policyname = 'autorenew_attempts_self_select'
    ) THEN
        CREATE POLICY "autorenew_attempts_self_select" ON public.autorenew_attempts
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'autorenew_attempts'
          AND policyname = 'autorenew_attempts_admin_all'
    ) THEN
        CREATE POLICY "autorenew_attempts_admin_all" ON public.autorenew_attempts
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE id = auth.uid() AND role IN ('admin', 'staff')
                )
            );
    END IF;
END $$;

-- ── 2) دالة: جلب المستخدمين المستحقّين للتجديد ──
-- ترتيب الأولوية:
--   1. اليوم = انتهاء الاشتراك (Day 0) — محاولة #2 أو #3
--   2. غداً = انتهاء الاشتراك (Day -1) — محاولة #1 (الأهم)
--   3. أمس = انتهاء الاشتراك (Day +1) — محاولة #3 الأخيرة
--
-- نستبعد:
--   • auto_renew_enabled = FALSE
--   • مستخدم عنده محاولة `paid` مسبقة لنفس دورة الاشتراك (منع التكرار)
--   • مستخدم عنده 3 محاولات فاشلة بالفعل
CREATE OR REPLACE FUNCTION public.get_autorenew_queue()
RETURNS TABLE (
    user_id          UUID,
    email            TEXT,
    phone            TEXT,
    full_name        TEXT,
    subscription_end TIMESTAMPTZ,
    plan_type        TEXT,
    next_attempt     INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH due_users AS (
        SELECT
            p.id,
            p.email,
            p.phone,
            p.full_name,
            p.subscription_end,
            p.subscription_type
        FROM profiles p
        WHERE p.auto_renew_enabled = TRUE
          AND p.subscription_type IN ('monthly', 'quarterly', 'yearly')
          AND p.subscription_end IS NOT NULL
          -- نافذة -1 إلى +1 أيام حول تاريخ الانتهاء
          AND p.subscription_end >= (now() - INTERVAL '1 day')
          AND p.subscription_end <= (now() + INTERVAL '2 days')
    ),
    attempt_stats AS (
        SELECT
            aa.user_id,
            COUNT(*) FILTER (WHERE aa.status IN ('created', 'failed')) AS pending_count,
            BOOL_OR(aa.status = 'paid') AS has_paid_this_cycle
        FROM autorenew_attempts aa
        -- نعدّ فقط المحاولات منذ آخر تجديد (آخر 35 يوم — يغطي شهري + هامش)
        WHERE aa.created_at > (now() - INTERVAL '35 days')
        GROUP BY aa.user_id
    )
    SELECT
        du.id,
        du.email,
        du.phone,
        du.full_name,
        du.subscription_end,
        du.subscription_type,
        COALESCE(ast.pending_count, 0)::INTEGER + 1 AS next_attempt
    FROM due_users du
    LEFT JOIN attempt_stats ast ON ast.user_id = du.id
    WHERE COALESCE(ast.has_paid_this_cycle, FALSE) = FALSE
      AND COALESCE(ast.pending_count, 0) < 3
    ORDER BY du.subscription_end ASC;
END;
$$;

-- service_role فقط
REVOKE ALL ON FUNCTION public.get_autorenew_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_autorenew_queue() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_autorenew_queue() TO service_role;

COMMENT ON FUNCTION public.get_autorenew_queue() IS
  'يُرجع قائمة المستخدمين المستحقّين للتجديد (نافذة -1 إلى +1 أيام، أقصى 3 محاولات).';

-- ── 3) دالة: تسجيل محاولة تجديد جديدة ──
CREATE OR REPLACE FUNCTION public.log_autorenew_attempt(
    p_user_id        UUID,
    p_attempt_number INTEGER,
    p_plan_type      TEXT,
    p_amount         NUMERIC,
    p_mf_invoice_id  TEXT,
    p_mf_invoice_url TEXT,
    p_error          TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt_id UUID;
    v_status     TEXT := CASE WHEN p_error IS NULL THEN 'created' ELSE 'failed' END;
BEGIN
    INSERT INTO autorenew_attempts (
        user_id, attempt_number, plan_type, amount,
        mf_invoice_id, mf_invoice_url, status, error_message
    ) VALUES (
        p_user_id, p_attempt_number, p_plan_type, p_amount,
        p_mf_invoice_id, p_mf_invoice_url, v_status, p_error
    )
    RETURNING id INTO v_attempt_id;

    RETURN v_attempt_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_autorenew_attempt(UUID, INTEGER, TEXT, NUMERIC, TEXT, TEXT, TEXT)
    TO service_role;

-- ── 4) دالة: تحويل المستخدم لخطة مجانية بعد فشل كل المحاولات ──
-- تُستدعى يدوياً من cron بعد 3 أيام من تاريخ الانتهاء دون دفع
CREATE OR REPLACE FUNCTION public.expire_failed_autorenews()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- المستخدمين الذين:
    --   • اشتراكهم انتهى قبل يومين أو أكثر
    --   • عندهم 3 محاولات فاشلة
    --   • لا تزال خطتهم ليست free
    WITH expired AS (
        UPDATE profiles p
        SET subscription_type = 'free',
            subscription_end  = NULL,
            auto_renew_enabled = FALSE,
            auto_renew_cancelled_at = COALESCE(auto_renew_cancelled_at, now())
        WHERE p.subscription_type IN ('monthly', 'quarterly', 'yearly')
          AND p.subscription_end IS NOT NULL
          AND p.subscription_end < (now() - INTERVAL '2 days')
          AND p.auto_renew_enabled = TRUE
          AND EXISTS (
              SELECT 1 FROM autorenew_attempts aa
              WHERE aa.user_id = p.id
                AND aa.created_at > (now() - INTERVAL '10 days')
              GROUP BY aa.user_id
              HAVING COUNT(*) FILTER (WHERE aa.status IN ('created', 'failed')) >= 3
          )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    -- log
    INSERT INTO cron_logs (job_name, result, notes)
    VALUES (
        'expire-failed-autorenews',
        jsonb_build_object('downgraded_count', v_count),
        'تحويل مستخدمين لـ free plan بعد فشل 3 محاولات تجديد'
    );

    RETURN jsonb_build_object('success', true, 'downgraded_count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_failed_autorenews() TO service_role;

-- ── 5) جدولة cron يومية لاستدعاء Edge Function autorenew-charge ──
-- ملاحظة: pg_net يجب أن يكون مفعّلاً (Supabase يفعّله افتراضياً)
-- الـ cron يستدعي Edge Function بالـ service_role key
--
-- التشغيل: ذا يتطلّب إعدادات manual من Dashboard (لا يمكن تخزين الـ key في SQL)
-- الأسهل: نجدول الـ cron هنا، لكن يبقى الاستدعاء HTTP عبر pg_net
--
-- لتفعيل الـ cron: يجب تعبئة URL + service_role key في vault.
-- نوفّر التعليمات للمستخدم في COMMENT:

CREATE OR REPLACE FUNCTION public.invoke_autorenew_charge()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_url         TEXT;
    v_anon_key    TEXT;
    v_response_id BIGINT;
BEGIN
    -- قراءة الإعدادات من vault (يجب إعدادها من Dashboard → Vault → New Secret)
    -- أو fallback: من site_settings
    SELECT value INTO v_url FROM public.site_settings WHERE key = 'edge_functions_base_url';
    IF v_url IS NULL THEN
        v_url := 'https://czzcmbxejxbotjemyuqf.supabase.co/functions/v1';
    END IF;

    -- نستخدم anon key لأن pg_net ما يقدر يقرأ service_role بسهولة
    -- الـ Edge Function تقبل هذا لأنها تستخدم service_role داخلياً
    SELECT value INTO v_anon_key FROM public.site_settings WHERE key = 'supabase_anon_key';

    IF v_anon_key IS NULL THEN
        -- لا نستدعي — نسجّل تحذير
        INSERT INTO cron_logs (job_name, result, notes)
        VALUES (
            'autorenew-charge-daily',
            jsonb_build_object('error', 'supabase_anon_key مفقود في site_settings'),
            'لا يمكن استدعاء Edge Function بدون anon key. أضفه عبر admin أو SQL.'
        );
        RETURN jsonb_build_object('success', false, 'error', 'anon_key missing');
    END IF;

    -- استدعاء غير متزامن عبر pg_net
    SELECT net.http_post(
        url := v_url || '/autorenew-charge',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'apikey', v_anon_key
        ),
        body := jsonb_build_object('trigger', 'cron-daily')
    ) INTO v_response_id;

    INSERT INTO cron_logs (job_name, result, notes)
    VALUES (
        'autorenew-charge-daily',
        jsonb_build_object('request_id', v_response_id),
        'تم استدعاء Edge Function autorenew-charge'
    );

    RETURN jsonb_build_object('success', true, 'request_id', v_response_id);
EXCEPTION WHEN OTHERS THEN
    INSERT INTO cron_logs (job_name, result, notes)
    VALUES (
        'autorenew-charge-daily',
        jsonb_build_object('error', SQLERRM),
        'فشل استدعاء Edge Function'
    );
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.invoke_autorenew_charge() TO service_role;

-- جدولة cron يومياً في 02:00 UTC (05:00 AST) — وقت هادئ
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- إلغاء أي جدولة سابقة بنفس الاسم (تفادي التكرار)
        PERFORM cron.unschedule('autorenew-charge-daily')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'autorenew-charge-daily'
        );

        -- جدولة جديدة — يومياً 02:00 UTC
        PERFORM cron.schedule(
            'autorenew-charge-daily',
            '0 2 * * *',
            $cron$ SELECT public.invoke_autorenew_charge(); $cron$
        );

        -- جدولة cron تنظيف — يومياً 03:00 UTC (بعد ساعة من الـ charge)
        PERFORM cron.unschedule('expire-failed-autorenews-daily')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'expire-failed-autorenews-daily'
        );

        PERFORM cron.schedule(
            'expire-failed-autorenews-daily',
            '0 3 * * *',
            $cron$ SELECT public.expire_failed_autorenews(); $cron$
        );
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- متطلبات التشغيل:
--
-- 1) احفظ anon_key في site_settings (عبر admin أو SQL):
--    INSERT INTO site_settings (key, value) VALUES
--      ('supabase_anon_key', '<anon-key-من-dashboard>'),
--      ('edge_functions_base_url', 'https://czzcmbxejxbotjemyuqf.supabase.co/functions/v1')
--    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- 2) انشر Edge Function autorenew-charge:
--    supabase functions deploy autorenew-charge
--
-- 3) تحقّق من الـ crons:
--    SELECT jobname, schedule, active FROM cron.job
--    WHERE jobname LIKE 'autorenew%' OR jobname LIKE 'expire%';
--    -- المتوقّع: 2 jobs active
--
-- 4) اختبار يدوي (لا تنتظر الـ cron):
--    SELECT public.invoke_autorenew_charge();
--    SELECT * FROM cron_logs WHERE job_name LIKE 'autorenew%' ORDER BY executed_at DESC LIMIT 5;
--
-- 5) مراقبة النتائج:
--    SELECT * FROM autorenew_attempts ORDER BY created_at DESC LIMIT 20;
-- ═══════════════════════════════════════════════════════════════
