-- Fix stuck subscriptions + missing RPC functions
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS activate_subscription_by_coupon(text, integer);

CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE code = p_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION activate_subscription_by_coupon(
  p_subscription_type TEXT, p_duration_months INT DEFAULT 1
) RETURNS VOID AS $$
DECLARE end_date TIMESTAMPTZ;
BEGIN
  end_date := now() + (p_duration_months || ' months')::INTERVAL;
  UPDATE profiles SET subscription_type = p_subscription_type, subscription_end = end_date
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fix_stuck_subscriptions()
RETURNS TABLE(fixed_user_id UUID, plan_type TEXT, payment_id TEXT, coupon_code TEXT, fixed_at TIMESTAMPTZ)
AS $$
DECLARE rec RECORD; end_date TIMESTAMPTZ; dur_months INT;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (pay.user_id) pay.user_id, pay.plan_type AS p_plan,
      pay.payment_id AS p_payment_id, pay.coupon_code AS p_coupon, pay.paid_at,
      pr.subscription_type, pr.subscription_end
    FROM payments pay JOIN profiles pr ON pr.id = pay.user_id
    WHERE pay.status = 'paid' AND pay.paid_at > now() - INTERVAL '30 days'
      AND (pr.subscription_type IS NULL OR pr.subscription_type = 'free'
           OR pr.subscription_end IS NULL OR pr.subscription_end < now())
    ORDER BY pay.user_id, pay.paid_at DESC
  LOOP
    dur_months := CASE WHEN rec.p_plan = 'yearly' THEN 12 ELSE 1 END;
    end_date := now() + (dur_months || ' months')::INTERVAL;
    UPDATE profiles SET subscription_type = rec.p_plan, subscription_end = end_date WHERE id = rec.user_id;
    fixed_user_id := rec.user_id; plan_type := rec.p_plan;
    payment_id := rec.p_payment_id; coupon_code := rec.p_coupon; fixed_at := now();
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
