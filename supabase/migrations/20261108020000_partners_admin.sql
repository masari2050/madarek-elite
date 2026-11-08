-- ══════════════════════════════════════════════════════════════
--  123 — تبويب «الشركاء» في لوحة الإدارة (مذيعو لايف تيك توك والمدربون)
--  تاريخ: 2026-11-08
--  المحتوى:
--    1) جدول partner_payouts — سجل كل صرف لشريك (تدقيق مالي)
--    2) admin_list_partners()            — كل الشركاء بأرقامهم (زيارات/اشتراكات/إيراد/عمولة/مصروف/متبقٍ)
--    3) admin_upsert_partner(...)         — إضافة شريك (ينشئ الكوبون معه) أو تعديل بياناته
--    4) admin_partner_payout(...)         — تسجيل صرف لشريك (يحدّث paid_total ويكتب السجل)
--    5) admin_set_partner_active(...)     — إيقاف/تشغيل الشريك (يوقف كوده بتاريخ انتهاء الآن)
--  كلها SECURITY DEFINER + is_admin() — لا كتابة مباشرة من المتصفح على partners/coupons
--  كل شيء إضافي: IF NOT EXISTS / CREATE OR REPLACE — لا حذف
-- ══════════════════════════════════════════════════════════════
BEGIN;

-- ─── (1) سجل صرف الشركاء ───────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_payouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  note        TEXT,
  paid_by     UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON partner_payouts(partner_id, created_at DESC);
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
-- بلا policies عمداً: القراءة والكتابة عبر الـRPCs أدناه فقط

-- ─── (2) قائمة الشركاء بأرقامهم ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_list_partners()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
          AND lower(coalesce(ae.metadata->>'utm_source', '')) = lower(pr.slug)
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
$$;
GRANT EXECUTE ON FUNCTION admin_list_partners() TO authenticated;

-- ─── (3) إضافة / تعديل شريك ─────────────────────────────────
--  p_id فارغ → إضافة: ينشئ الكوبون (percentage على كل الباقات) والشريك معاً ويرجع مفتاح لوحته
--  p_id موجود → تعديل: الاسم، العمولة، الآيبان، الملاحظات، نسبة الخصم وتاريخ انتهاء الكود
--  الرابط (slug) والكود لا يتغيّران بعد الإنشاء — تغييرهما يكسر الروابط المنشورة
CREATE OR REPLACE FUNCTION admin_upsert_partner(
  p_id                UUID,
  p_slug              TEXT,
  p_name              TEXT,
  p_coupon_code       TEXT,
  p_discount_pct      NUMERIC,
  p_commission_pct    NUMERIC,
  p_iban              TEXT,
  p_notes             TEXT,
  p_coupon_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug  TEXT := lower(trim(coalesce(p_slug, '')));
  v_code  TEXT := upper(trim(coalesce(p_coupon_code, '')));
  v_name  TEXT := trim(coalesce(p_name, ''));
  v_iban  TEXT := nullif(upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g')), '');
  v_exp   TIMESTAMPTZ := coalesce(p_coupon_expires_at, now() + interval '1 year');
  v_row   partners%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
  END IF;

  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'اسم الشريك مطلوب');
  END IF;
  IF p_commission_pct IS NULL OR p_commission_pct < 0 OR p_commission_pct > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'نسبة العمولة بين 0 و100');
  END IF;
  IF p_discount_pct IS NULL OR p_discount_pct < 1 OR p_discount_pct > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'نسبة الخصم بين 1 و100');
  END IF;
  IF v_iban IS NOT NULL AND v_iban !~ '^SA[0-9]{22}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الآيبان غير صحيح — يبدأ بـSA ويتبعه 22 رقماً');
  END IF;

  IF p_id IS NULL THEN
    -- ── إضافة ──
    IF v_slug !~ '^[a-z0-9][a-z0-9-]{1,29}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'الرابط المختصر: حروف إنجليزية صغيرة وأرقام وشرطة فقط (2-30)');
    END IF;
    IF v_code !~ '^[A-Z0-9]{3,20}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'الكود: حروف إنجليزية كبيرة وأرقام فقط (3-20)');
    END IF;
    IF EXISTS (SELECT 1 FROM partners WHERE slug = v_slug) THEN
      RETURN jsonb_build_object('success', false, 'error', 'الرابط المختصر مستخدم لشريك آخر');
    END IF;
    IF EXISTS (SELECT 1 FROM partners WHERE upper(coupon_code) = v_code) THEN
      RETURN jsonb_build_object('success', false, 'error', 'هذا الكود مربوط بشريك آخر');
    END IF;

    INSERT INTO coupons (code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at, is_active)
    VALUES (v_code, 'all', 'percentage', p_discount_pct, 1, 5000, 0, v_exp, true)
    ON CONFLICT (code) DO UPDATE SET
      plan_type = 'all', discount_type = 'percentage', discount_value = EXCLUDED.discount_value,
      expires_at = EXCLUDED.expires_at, is_active = true;

    INSERT INTO partners (slug, name, coupon_code, commission_pct, iban, notes)
    VALUES (v_slug, v_name, v_code, p_commission_pct, v_iban, nullif(trim(coalesce(p_notes, '')), ''))
    RETURNING * INTO v_row;
  ELSE
    -- ── تعديل ──
    SELECT * INTO v_row FROM partners WHERE id = p_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'الشريك غير موجود');
    END IF;

    UPDATE partners SET
      name = v_name,
      commission_pct = p_commission_pct,
      iban = v_iban,
      notes = nullif(trim(coalesce(p_notes, '')), '')
    WHERE id = p_id
    RETURNING * INTO v_row;

    UPDATE coupons SET
      discount_type = 'percentage',
      discount_value = p_discount_pct,
      expires_at = coalesce(p_coupon_expires_at, expires_at)
    WHERE upper(code) = upper(v_row.coupon_code);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_row.id, 'slug', v_row.slug, 'name', v_row.name,
    'code', upper(v_row.coupon_code), 'access_key', v_row.access_key
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin_upsert_partner(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- ─── (4) تسجيل صرف لشريك ────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_partner_payout(p_partner_id UUID, p_amount NUMERIC, p_note TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM partners WHERE id = p_partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الشريك غير موجود');
  END IF;

  INSERT INTO partner_payouts (partner_id, amount, note, paid_by)
  VALUES (p_partner_id, p_amount, nullif(trim(coalesce(p_note, '')), ''), auth.uid());

  UPDATE partners
     SET paid_total = paid_total + p_amount,
         last_payout_at = now()
   WHERE id = p_partner_id
  RETURNING paid_total INTO v_total;

  RETURN jsonb_build_object('success', true, 'paid_total', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_partner_payout(UUID, NUMERIC, TEXT) TO authenticated;

-- ─── (5) إيقاف / تشغيل شريك ─────────────────────────────────
--  الإيقاف: is_active=false + انتهاء الكود الآن (create-payment وapply-coupon يفحصان expires_at)
--  التشغيل: is_active=true + تمديد الكود للتاريخ المعطى أو سنة من الآن
CREATE OR REPLACE FUNCTION admin_set_partner_active(p_partner_id UUID, p_active BOOLEAN, p_coupon_expires_at TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'غير مسموح');
  END IF;

  UPDATE partners SET is_active = coalesce(p_active, false)
   WHERE id = p_partner_id
  RETURNING coupon_code INTO v_code;
  IF v_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'الشريك غير موجود');
  END IF;

  IF coalesce(p_active, false) THEN
    UPDATE coupons SET is_active = true,
                       expires_at = coalesce(p_coupon_expires_at, now() + interval '1 year')
     WHERE upper(code) = upper(v_code);
  ELSE
    UPDATE coupons SET expires_at = least(coalesce(expires_at, now()), now())
     WHERE upper(code) = upper(v_code);
  END IF;

  RETURN jsonb_build_object('success', true, 'is_active', coalesce(p_active, false));
END;
$$;
GRANT EXECUTE ON FUNCTION admin_set_partner_active(UUID, BOOLEAN, TIMESTAMPTZ) TO authenticated;

COMMIT;

-- ─── تحقق ───
-- SELECT jsonb_pretty(admin_list_partners());   -- يحتاج جلسة أدمن؛ من SQL Editor يرجع unauthorized وهذا متوقع
-- SELECT proname FROM pg_proc WHERE proname IN ('admin_list_partners','admin_upsert_partner','admin_partner_payout','admin_set_partner_active');
