-- 77: product_purchases table for one-time bundle purchases (e.g., period1 - 29 SAR)
-- Independent from subscription system. A user may own multiple products + a subscription.

BEGIN;

CREATE TABLE IF NOT EXISTS product_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug    TEXT NOT NULL,                  -- e.g. 'tahsili_period1_1447'
  payment_id      TEXT,                           -- MyFatoorah InvoiceId
  amount          NUMERIC(10,2),                  -- paid amount in SAR
  leak_group_ids  UUID[] NOT NULL DEFAULT '{}',   -- the leak_groups unlocked by this purchase
  status          TEXT NOT NULL DEFAULT 'paid',   -- 'paid' | 'pending' | 'failed' | 'refunded'
  purchased_at    TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_product_purchases_user ON product_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_product_purchases_slug ON product_purchases(product_slug);
CREATE INDEX IF NOT EXISTS idx_product_purchases_pid  ON product_purchases(payment_id) WHERE payment_id IS NOT NULL;

ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;

-- A user can read their own purchases
DROP POLICY IF EXISTS pp_select_own ON product_purchases;
CREATE POLICY pp_select_own ON product_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert/update (via Edge Functions)
DROP POLICY IF EXISTS pp_insert_service ON product_purchases;
CREATE POLICY pp_insert_service ON product_purchases
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS pp_update_service ON product_purchases;
CREATE POLICY pp_update_service ON product_purchases
  FOR UPDATE
  USING (false);

-- ─────────────────────────────────────────────────────────────
-- Helper: does the calling user own product X (with paid status)?
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_owns_product(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_product BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT EXISTS(
    SELECT 1 FROM product_purchases
    WHERE user_id = auth.uid()
      AND product_slug = p_slug
      AND status = 'paid'
  ) INTO has_product;
  RETURN COALESCE(has_product, FALSE);
END;
$$;
GRANT EXECUTE ON FUNCTION user_owns_product(TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Helper: does the calling user have access to leak_group X
-- (either via active subscription OR a product that includes it)?
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION user_can_access_leak_group(p_leak_group UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  has_sub BOOLEAN;
  has_product BOOLEAN;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN FALSE; END IF;

  -- 1) Active subscription
  SELECT EXISTS(
    SELECT 1 FROM profiles
    WHERE id = uid
      AND (role IN ('admin','staff')
           OR subscription_type IN ('monthly','quarterly','yearly')
              AND (subscription_end IS NULL OR subscription_end > NOW()))
  ) INTO has_sub;

  IF has_sub THEN RETURN TRUE; END IF;

  -- 2) Owns a product that includes this leak_group
  SELECT EXISTS(
    SELECT 1 FROM product_purchases
    WHERE user_id = uid
      AND status = 'paid'
      AND p_leak_group = ANY(leak_group_ids)
  ) INTO has_product;

  RETURN COALESCE(has_product, FALSE);
END;
$$;
GRANT EXECUTE ON FUNCTION user_can_access_leak_group(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Server-side helper for Edge Functions (service_role): record a purchase
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_product_purchase(
  p_user_id UUID,
  p_slug TEXT,
  p_payment_id TEXT,
  p_amount NUMERIC,
  p_leak_group_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
  new_id UUID;
BEGIN
  -- Idempotency: if a row with same payment_id exists, return it
  IF p_payment_id IS NOT NULL THEN
    SELECT id INTO existing_id FROM product_purchases
    WHERE payment_id = p_payment_id LIMIT 1;
    IF existing_id IS NOT NULL THEN
      UPDATE product_purchases SET status = 'paid' WHERE id = existing_id;
      RETURN existing_id;
    END IF;
  END IF;

  INSERT INTO product_purchases (user_id, product_slug, payment_id, amount, leak_group_ids, status)
  VALUES (p_user_id, p_slug, p_payment_id, p_amount, p_leak_group_ids, 'paid')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
-- Only callable from service_role (no GRANT to authenticated/anon)

COMMIT;
