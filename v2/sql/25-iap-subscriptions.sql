-- ═══════════════════════════════════════════════════════════════
-- Migration 25 — اشتراكات Apple IAP و Google Play Billing
-- ═══════════════════════════════════════════════════════════════
--
-- الخلفية:
--   • Apple Guideline 3.1.1: أي اشتراك رقمي داخل iOS app يجب أن يستخدم
--     نظام Apple In-App Purchase (IAP). MyFatoorah ممنوعة في iOS app.
--   • Google Play لها نفس القانون (Play Billing Library).
--   • النسبة لـ Small Business Program: 15% فقط (دخل سنوي < $1M).
--
-- التصميم:
--   1. جدول جديد `iap_subscriptions` — يخزّن:
--      - receipt_data من Apple/Google
--      - transaction_id الفريد لكل عملية
--      - product_id (monthly_subscription / quarterly_subscription / yearly_subscription)
--      - platform (ios | android)
--      - expires_at لمعرفة متى ينتهي
--      - status للتفعيل/الإلغاء/الاسترداد
--   2. RPC `record_iap_purchase` — يستدعى من Edge Function بعد التحقّق من Apple
--   3. RPC `expire_iap_subscriptions_cron` — cron يومي لإغلاق المنتهية
--   4. ربط بـ `profiles.subscription_type` و `subscription_end` (نفس الأعمدة الحالية)
--
-- القاعدة الذهبية:
--   • CREATE TABLE IF NOT EXISTS فقط — لا حذف ولا تعديل لجدول موجود
--   • إضافات على profiles عبر ADD COLUMN IF NOT EXISTS
--   • MyFatoorah للويب يبقى يشتغل بدون أي تأثير
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1) جدول الاشتراكات IAP ──
CREATE TABLE IF NOT EXISTS public.iap_subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform            TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    product_id          TEXT NOT NULL,                   -- مثلاً: monthly_subscription
    plan_type           TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'yearly')),
    transaction_id      TEXT NOT NULL UNIQUE,            -- فريد لكل معاملة Apple/Google
    original_transaction_id TEXT,                        -- للتجديدات — يبقى ثابتاً
    receipt_data        TEXT NOT NULL,                   -- الـ receipt الخام من Apple/Google
    purchase_date       TIMESTAMPTZ NOT NULL,
    expires_at          TIMESTAMPTZ NOT NULL,
    auto_renew_status   BOOLEAN DEFAULT TRUE,            -- المستخدم لم يلغِ التجديد
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'cancelled', 'refunded', 'in_grace_period')),
    environment         TEXT DEFAULT 'production'
                        CHECK (environment IN ('production', 'sandbox')),
    last_verified_at    TIMESTAMPTZ DEFAULT now(),
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- فهارس للاستعلامات الشائعة
CREATE INDEX IF NOT EXISTS idx_iap_user
  ON public.iap_subscriptions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_iap_expires
  ON public.iap_subscriptions (expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_iap_orig_tx
  ON public.iap_subscriptions (original_transaction_id);

-- RLS — المستخدم يقرأ اشتراكاته فقط، الـ service_role يكتب
ALTER TABLE public.iap_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='iap_subscriptions' AND policyname='iap_user_read'
    ) THEN
        CREATE POLICY iap_user_read ON public.iap_subscriptions
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
    END IF;
END $$;

COMMENT ON TABLE public.iap_subscriptions IS
  'اشتراكات Apple IAP و Google Play Billing — مفصولة عن payments الخاصة بـ MyFatoorah للويب.';

-- ── 2) إضافات على profiles لتمييز مصدر الاشتراك ──
-- subscription_type و subscription_end موجودان مسبقاً — نضيف فقط مصدر الاشتراك
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_source TEXT
  CHECK (subscription_source IN ('myfatoorah', 'apple_iap', 'google_play', 'admin'))
  DEFAULT NULL;

COMMENT ON COLUMN public.profiles.subscription_source IS
  'مصدر الاشتراك: myfatoorah=ويب · apple_iap=iOS · google_play=Android · admin=يدوي من الإدارة';

-- ── 3) RPC: record_iap_purchase ──
-- يستدعى من Edge Function `verify-iap-receipt` بعد التحقّق من Apple/Google API
-- يحدّث profiles + يسجّل في iap_subscriptions في معاملة واحدة
CREATE OR REPLACE FUNCTION public.record_iap_purchase(
    p_user_id            UUID,
    p_platform           TEXT,         -- 'ios' أو 'android'
    p_product_id         TEXT,
    p_plan_type          TEXT,         -- 'monthly' | 'quarterly' | 'yearly'
    p_transaction_id     TEXT,
    p_original_tx_id     TEXT,
    p_receipt_data       TEXT,
    p_purchase_date      TIMESTAMPTZ,
    p_expires_at         TIMESTAMPTZ,
    p_auto_renew         BOOLEAN DEFAULT TRUE,
    p_environment        TEXT DEFAULT 'production'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
BEGIN
    -- معاملة موجودة مسبقاً؟ (تجديد لنفس transaction_id) → نحدّث فقط
    SELECT id INTO v_existing_id
    FROM iap_subscriptions
    WHERE transaction_id = p_transaction_id;

    IF v_existing_id IS NOT NULL THEN
        UPDATE iap_subscriptions
        SET expires_at        = p_expires_at,
            auto_renew_status = p_auto_renew,
            status            = 'active',
            last_verified_at  = now(),
            updated_at        = now()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO iap_subscriptions (
            user_id, platform, product_id, plan_type,
            transaction_id, original_transaction_id, receipt_data,
            purchase_date, expires_at, auto_renew_status,
            status, environment
        ) VALUES (
            p_user_id, p_platform, p_product_id, p_plan_type,
            p_transaction_id, p_original_tx_id, p_receipt_data,
            p_purchase_date, p_expires_at, p_auto_renew,
            'active', p_environment
        );
    END IF;

    -- حدّث profiles — هذي هي اللي تحدّد إذا المستخدم مشترك
    UPDATE profiles
    SET subscription_type   = p_plan_type,
        subscription_end    = p_expires_at,
        subscription_source = CASE p_platform
                                WHEN 'ios' THEN 'apple_iap'
                                WHEN 'android' THEN 'google_play'
                                ELSE subscription_source
                              END,
        auto_renew_enabled  = p_auto_renew
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', p_transaction_id,
        'expires_at', p_expires_at,
        'plan_type', p_plan_type
    );
END;
$$;

REVOKE ALL ON FUNCTION public.record_iap_purchase(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_iap_purchase(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,TEXT) TO service_role;

COMMENT ON FUNCTION public.record_iap_purchase(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,TEXT) IS
  'تسجيل/تحديث اشتراك IAP بعد التحقّق من Apple/Google. تُستدعى من Edge Function verify-iap-receipt فقط.';

-- ── 4) RPC: cancel_iap_subscription ──
-- لو المستخدم ألغى من Settings داخل iOS أو Play Store، نستلم Webhook
-- (App Store Server Notifications) ونعلّم الـ subscription كملغى
CREATE OR REPLACE FUNCTION public.cancel_iap_subscription(
    p_transaction_id TEXT,
    p_reason         TEXT DEFAULT 'user_cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    UPDATE iap_subscriptions
    SET status            = CASE p_reason
                              WHEN 'refund' THEN 'refunded'
                              ELSE 'cancelled'
                            END,
        auto_renew_status = FALSE,
        updated_at        = now()
    WHERE transaction_id = p_transaction_id
       OR original_transaction_id = p_transaction_id
    RETURNING user_id INTO v_user_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'transaction not found');
    END IF;

    -- لو الإلغاء = استرداد، نزّل المستخدم لـ free فوراً
    IF p_reason = 'refund' THEN
        UPDATE profiles
        SET subscription_type    = 'free',
            subscription_end     = NULL,
            auto_renew_enabled   = FALSE
        WHERE id = v_user_id;
    ELSE
        -- إلغاء عادي — يبقى مشترك حتى انتهاء الفترة المدفوعة
        UPDATE profiles
        SET auto_renew_enabled = FALSE,
            auto_renew_cancelled_at = COALESCE(auto_renew_cancelled_at, now())
        WHERE id = v_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'reason', p_reason);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_iap_subscription(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_iap_subscription(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.cancel_iap_subscription(TEXT, TEXT) IS
  'إلغاء اشتراك IAP (cancellation أو refund). تستدعى من Webhook ASSN.';

-- ── 5) RPC: expire_iap_cron — cron يومي ──
-- يحوّل اشتراكات IAP المنتهية إلى status='expired' + ينزّل profiles لـ free
-- (لو ما تجدّد المستخدم تلقائياً)
CREATE OR REPLACE FUNCTION public.expire_iap_cron()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user RECORD;
BEGIN
    -- اشتراكات active لكن expires_at قديمة (انتهى ما عرفنا)
    FOR v_user IN
        SELECT user_id, transaction_id
        FROM iap_subscriptions
        WHERE status = 'active'
          AND expires_at < now() - interval '1 day'  -- نعطي 24h grace قبل التحويل
    LOOP
        UPDATE iap_subscriptions
        SET status = 'expired', updated_at = now()
        WHERE transaction_id = v_user.transaction_id;

        -- نزّل المستخدم لـ free فقط لو ما عنده اشتراك آخر active
        UPDATE profiles
        SET subscription_type = 'free',
            subscription_end  = NULL
        WHERE id = v_user.user_id
          AND NOT EXISTS (
              SELECT 1 FROM iap_subscriptions
              WHERE user_id = v_user.user_id
                AND status = 'active'
                AND transaction_id <> v_user.transaction_id
          );

        v_count := v_count + 1;
    END LOOP;

    -- سجّل في cron_logs (الجدول أُنشئ في migration 22)
    BEGIN
        INSERT INTO cron_logs (job_name, result, notes)
        VALUES ('expire-iap-cron',
                jsonb_build_object('expired_count', v_count),
                'تحويل اشتراكات IAP المنتهية إلى expired');
    EXCEPTION WHEN undefined_table THEN
        NULL;  -- cron_logs غير موجود — تخطّي
    END;

    RETURN jsonb_build_object('success', true, 'expired_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.expire_iap_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_iap_cron() TO service_role;

COMMENT ON FUNCTION public.expire_iap_cron() IS
  'cron يومي يحوّل اشتراكات IAP المنتهية ولم تُجدّد إلى free.';

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) الجدول موجود + RLS مفعّل:
--    SELECT relrowsecurity FROM pg_class WHERE relname='iap_subscriptions';
--    -- المتوقّع: t
--
-- 2) الدوال موجودة:
--    SELECT proname FROM pg_proc
--    WHERE proname IN ('record_iap_purchase', 'cancel_iap_subscription', 'expire_iap_cron');
--    -- المتوقّع: 3 صفوف
--
-- 3) عمود subscription_source موجود:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name='profiles' AND column_name='subscription_source';
--    -- المتوقّع: 1 صف
--
-- 4) اختبار record_iap_purchase (sandbox):
--    SELECT record_iap_purchase(
--      'USER_UUID_HERE'::uuid, 'ios', 'monthly_subscription', 'monthly',
--      'TX_TEST_001', 'TX_TEST_001', 'fake_receipt',
--      now(), now() + interval '30 days', true, 'sandbox'
--    );
--    -- المتوقّع: { success: true, transaction_id: 'TX_TEST_001', ... }
-- ═══════════════════════════════════════════════════════════════
