-- ══════════════════════════════════════════════════════════════
--  106 — نظام الشركاء (أكواد المدربين) + حملة اليوم الوطني 96
--  تاريخ: 2026-09-10
--  المحتوى:
--    1) جدول partners + RPC get_partner_stats(access_key) — لوحة الشريك بلا PII
--    2) كوبون KSA96 (عام، 20%، حتى 27 سبتمبر)
--    3) كوبون ABAAD (د. علي الرويس، 30% → 15% بعد المناسبة عبر pg_cron)
--    4) بنر حملة مجدول (index + pricing) 20-27 سبتمبر — يقرأه get_active_banners
--  كل شيء إضافي: IF NOT EXISTS / ON CONFLICT — لا حذف ولا تعديل أعمدة
-- ══════════════════════════════════════════════════════════════
BEGIN;

-- ─── (1) جدول الشركاء ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,                     -- يظهر في الرابط /p/SLUG وفي utm_source
  name            TEXT NOT NULL,
  coupon_code     TEXT NOT NULL,                            -- كود الكوبون المرتبط (جدول coupons)
  commission_pct  NUMERIC NOT NULL DEFAULT 20,              -- نسبة العمولة من أول دفعة فعلية
  access_key      TEXT UNIQUE NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text || random()::text),
  iban            TEXT,
  notes           TEXT,
  paid_total      NUMERIC NOT NULL DEFAULT 0,               -- ما صُرف له فعلياً (يحدّثه الأدمن)
  last_payout_at  TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
-- بلا policies عمداً: القراءة عبر RPC بالمفتاح السري فقط، والكتابة بـservice_role/SQL

-- ─── RPC: إحصائيات الشريك (بدون أي بيانات شخصية للطلاب) ───
CREATE OR REPLACE FUNCTION get_partner_stats(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr              partners%ROWTYPE;
  v_visits        INTEGER := 0;
  v_entries       INTEGER := 0;
  v_entry_users   INTEGER := 0;
  v_paid_count    INTEGER := 0;
  v_revenue       NUMERIC := 0;
  v_commission    NUMERIC := 0;
  v_by_plan       JSONB := '{}'::jsonb;
  v_recent        JSONB := '[]'::jsonb;
  v_discount      NUMERIC;
  v_discount_type TEXT;
  v_coupon_exp    TIMESTAMPTZ;
BEGIN
  IF p_key IS NULL OR length(p_key) < 8 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO pr FROM partners WHERE access_key = p_key AND is_active = true;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- زوار وصلوا عبر رابطه (utm_source = slug) — زائر فريد يُحسب مرة
  SELECT count(DISTINCT coalesce(user_id::text, anonymous_id)) INTO v_visits
  FROM analytics_events
  WHERE event_type = 'page_view'
    AND lower(coalesce(metadata->>'utm_source', '')) = lower(pr.slug)
    AND created_at >= pr.created_at;

  -- كل من أدخل كوده ووصل لمرحلة الدفع (أي حالة)
  SELECT count(*), count(DISTINCT user_id) INTO v_entries, v_entry_users
  FROM payments
  WHERE upper(coupon_code) = upper(pr.coupon_code)
    AND created_at >= pr.created_at;

  -- الاشتراكات المدفوعة فعلياً
  SELECT count(*), coalesce(sum(amount), 0) INTO v_paid_count, v_revenue
  FROM payments
  WHERE upper(coupon_code) = upper(pr.coupon_code)
    AND status = 'paid'
    AND created_at >= pr.created_at;

  SELECT coalesce(jsonb_object_agg(plan_type, cnt), '{}'::jsonb) INTO v_by_plan
  FROM (
    SELECT plan_type, count(*) AS cnt
    FROM payments
    WHERE upper(coupon_code) = upper(pr.coupon_code)
      AND status = 'paid'
      AND created_at >= pr.created_at
    GROUP BY plan_type
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'date',       to_char(r.ts AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD'),
           'plan',       r.plan_type,
           'amount',     r.amount,
           'commission', round(r.amount * pr.commission_pct / 100)
         ) ORDER BY r.ts DESC), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT coalesce(paid_at, created_at) AS ts, plan_type, amount
    FROM payments
    WHERE upper(coupon_code) = upper(pr.coupon_code)
      AND status = 'paid'
      AND created_at >= pr.created_at
    ORDER BY coalesce(paid_at, created_at) DESC
    LIMIT 30
  ) r;

  v_commission := round(v_revenue * pr.commission_pct / 100);

  SELECT discount_value, discount_type, expires_at
    INTO v_discount, v_discount_type, v_coupon_exp
  FROM coupons WHERE upper(code) = upper(pr.coupon_code) LIMIT 1;

  RETURN jsonb_build_object(
    'name',              pr.name,
    'slug',              pr.slug,
    'code',              upper(pr.coupon_code),
    'commission_pct',    pr.commission_pct,
    'discount_value',    v_discount,
    'discount_type',     v_discount_type,
    'coupon_expires_at', v_coupon_exp,
    'since',             pr.created_at,
    'visits',            v_visits,
    'code_entries',      v_entries,
    'code_users',        v_entry_users,
    'paid_count',        v_paid_count,
    'revenue',           v_revenue,
    'by_plan',           v_by_plan,
    'commission_total',  v_commission,
    'paid_total',        pr.paid_total,
    'pending',           greatest(v_commission - pr.paid_total, 0),
    'last_payout_at',    pr.last_payout_at,
    'recent',            v_recent
  );
END;
$$;
GRANT EXECUTE ON FUNCTION get_partner_stats(TEXT) TO anon, authenticated;
COMMENT ON FUNCTION get_partner_stats(TEXT) IS
  'لوحة الشريك: أرقام مجمّعة فقط (زيارات/إدخال الكود/اشتراكات/عمولة) بلا أي PII. المفتاح السري = partners.access_key';

-- ─── (2) الكود العام لليوم الوطني 96 — 20% على كل الباقات ───
INSERT INTO coupons (code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at)
VALUES ('KSA96', 'all', 'percentage', 20, 1, 500, 0, '2026-09-27 20:59:59+00')
ON CONFLICT (code) DO UPDATE SET
  plan_type = 'all', discount_type = 'percentage', discount_value = 20,
  max_uses = 500, expires_at = EXCLUDED.expires_at;

-- ─── (3) كود د. علي الرويس — 30% الآن، 15% بعد المناسبة ───
INSERT INTO coupons (code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at)
VALUES ('ABAAD', 'all', 'percentage', 30, 1, 2000, 0, '2026-12-31 20:59:59+00')
ON CONFLICT (code) DO UPDATE SET
  plan_type = 'all', discount_type = 'percentage', discount_value = 30,
  max_uses = 2000, expires_at = EXCLUDED.expires_at;

INSERT INTO partners (slug, name, coupon_code, commission_pct, notes)
VALUES ('abaad', 'د. علي الرويس', 'ABAAD', 35, 'شريك الإطلاق — تيك توك @abaad1.com — العمولة على أول دفعة فقط')
ON CONFLICT (slug) DO NOTHING;

-- خفض كود الدكتور لـ15% بعد المناسبة: مهمة pg_cron مجدولة مباشرة عبر Management API (خارج هذا الملف —
--   الـCLI لا يهضم dollar-quoting المتداخل). انظر CLAUDE.md جلسة 2026-09-10.

-- ─── (4) بنر الحملة المجدول — الرئيسية وصفحة الأسعار (الأعضاء والتطبيق لا يرونه) ───
INSERT INTO banners (banner_type, is_active, config, target_pages, sort_order, schedule_start, schedule_end)
SELECT 'campaign', true,
       '{
         "badge": "اليوم الوطني 96",
         "title": "خصم 20% على كل الباقات",
         "subtitle": "بكود KSA96 حتى 27 سبتمبر — شهري 79 · 3 شهور 199 · سنوي 639",
         "code": "KSA96",
         "cta_text": "اشترك بالخصم",
         "link": "/pricing.html?coupon=KSA96",
         "bg_left": "#4C1D95",
         "bg_right": "#7C3AED",
         "badge_bg": "#16A34A"
       }'::jsonb,
       '["index","pricing"]'::jsonb, 0,
       '2026-09-19 21:00:00+00', '2026-09-27 20:59:59+00'
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE banner_type = 'campaign');

COMMIT;

-- ─── تحقق ───
-- SELECT slug, name, coupon_code, commission_pct, access_key FROM partners;
-- SELECT code, discount_type, discount_value, max_uses, expires_at FROM coupons WHERE code IN ('KSA96','ABAAD');
-- SELECT banner_type, schedule_start, schedule_end, target_pages FROM banners WHERE banner_type='campaign';
-- SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'abaad%';
