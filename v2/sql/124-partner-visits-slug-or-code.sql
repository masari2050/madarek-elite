-- ══════════════════════════════════════════════════════════════
--  124 — إصلاح عدّ زيارات الشريك حين يختلف الرابط المختصر (slug) عن الكود
--  تاريخ: 2026-11-13
--  السبب: رابط الطلاب /p/CODE يضع utm_source = الكود، والدالتان كانتا تطابقان utm_source مع slug فقط
--         → شريك slug=moath وكوده M20 كانت زياراته تظهر صفراً. الآن المطابقة مع slug أو الكود.
--  CREATE OR REPLACE فقط — لا تغيير بيانات
-- ══════════════════════════════════════════════════════════════
BEGIN;

CREATE OR REPLACE FUNCTION public.get_partner_stats(p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND lower(coalesce(metadata->>'utm_source', '')) IN (lower(pr.slug), lower(pr.coupon_code))
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_partners()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_out JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'unauthorized: admin role required';
  END IF;

  SELECT coalesce(jsonb_agg(
           to_jsonb(t)
           || jsonb_build_object(
                'commission_total', round(t.revenue * t.commission_pct / 100),
                'pending',          greatest(round(t.revenue * t.commission_pct / 100) - t.paid_total, 0),
                'coupon_expired',   (t.coupon_expires_at IS NOT NULL AND t.coupon_expires_at < now())
              )
           ORDER BY t.is_active DESC, t.revenue DESC, t.created_at DESC
         ), '[]'::jsonb)
    INTO v_out
  FROM (
    SELECT
      pr.id, pr.slug, pr.name, upper(pr.coupon_code) AS code,
      pr.commission_pct, pr.access_key, pr.iban, pr.notes,
      pr.paid_total, pr.last_payout_at, pr.is_active, pr.created_at,
      c.discount_value, c.discount_type, c.expires_at AS coupon_expires_at,
      c.used_count, c.max_uses,
      (SELECT count(DISTINCT coalesce(ae.user_id::text, ae.anonymous_id))
         FROM analytics_events ae
        WHERE ae.event_type = 'page_view'
          AND lower(coalesce(ae.metadata->>'utm_source', '')) IN (lower(pr.slug), lower(pr.coupon_code))
          AND ae.created_at >= pr.created_at)                                   AS visits,
      (SELECT count(DISTINCT p.user_id) FROM payments p
        WHERE upper(p.coupon_code) = upper(pr.coupon_code)
          AND p.created_at >= pr.created_at)                                    AS code_users,
      (SELECT count(*) FROM payments p
        WHERE upper(p.coupon_code) = upper(pr.coupon_code)
          AND p.status = 'paid' AND p.created_at >= pr.created_at)             AS paid_count,
      (SELECT coalesce(sum(p.amount), 0) FROM payments p
        WHERE upper(p.coupon_code) = upper(pr.coupon_code)
          AND p.status = 'paid' AND p.created_at >= pr.created_at)             AS revenue,
      (SELECT coalesce(jsonb_object_agg(s.plan_type, s.cnt), '{}'::jsonb)
         FROM (SELECT p.plan_type, count(*) AS cnt FROM payments p
                WHERE upper(p.coupon_code) = upper(pr.coupon_code)
                  AND p.status = 'paid' AND p.created_at >= pr.created_at
                GROUP BY p.plan_type) s)                                        AS by_plan,
      (SELECT max(coalesce(p.paid_at, p.created_at)) FROM payments p
        WHERE upper(p.coupon_code) = upper(pr.coupon_code)
          AND p.status = 'paid' AND p.created_at >= pr.created_at)             AS last_sale_at,
      (SELECT coalesce(jsonb_agg(jsonb_build_object(
                 'amount', pp.amount, 'note', pp.note,
                 'date', to_char(pp.created_at AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM-DD'))
                 ORDER BY pp.created_at DESC), '[]'::jsonb)
         FROM (SELECT * FROM partner_payouts WHERE partner_id = pr.id
                ORDER BY created_at DESC LIMIT 20) pp)                          AS payouts
    FROM partners pr
    LEFT JOIN coupons c ON upper(c.code) = upper(pr.coupon_code)
  ) t;

  RETURN v_out;
END;
$function$;

GRANT EXECUTE ON FUNCTION get_partner_stats(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_list_partners() TO authenticated;

COMMIT;
