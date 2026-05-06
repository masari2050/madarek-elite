-- ============================================================
-- مدارك النخبة v2 — Migration 54
-- RPC للمالية في لوحة الإدارة
-- ============================================================
-- يستبدل في loadFinance() هذي الـ queries:
--   - payment_fees (للحساب)
--   - payments period + all-time (للإيرادات والأرصدة)
--   - expenses period + all-time
--   - finance_accounts (الأرصدة الأولية)
--   - finance_transfers (التحويلات)
--   - profiles (لأسماء العملاء في قائمة الدفعات)
--
-- يرجع JSON واحد فيه كل أرقام صفحة المالية + قائمة آخر 50 دفعة.
-- محصّن بـ SECURITY DEFINER + admin check + يتعامل مع جداول مفقودة.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_finance(
    p_period_days INT DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result               json;
    since_ts             TIMESTAMPTZ;
    init_bank            NUMERIC := 0;
    init_treasury        NUMERIC := 0;
    total_inc_gross      NUMERIC := 0;
    total_fees           NUMERIC := 0;
    total_inc_net        NUMERIC := 0;
    inc_count            INT     := 0;
    total_exp            NUMERIC := 0;
    exp_count            INT     := 0;
    total_inc_net_all    NUMERIC := 0;
    total_exp_all        NUMERIC := 0;
    xfers_from_bank      NUMERIC := 0;
    xfers_to_bank        NUMERIC := 0;
    xfers_from_treasury  NUMERIC := 0;
    xfers_to_treasury    NUMERIC := 0;
    bank_balance         NUMERIC := 0;
    treasury_balance     NUMERIC := 0;
    payments_list        json;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized: admin role required'
          USING ERRCODE = '42501';
    END IF;

    since_ts := CASE
        WHEN p_period_days > 0 THEN NOW() - (p_period_days || ' days')::INTERVAL
        ELSE '1970-01-01'::TIMESTAMPTZ
    END;

    -- ─────────────────────────────────────────
    -- 1. الأرصدة الأولية (يتجاوز إن الجدول مفقود)
    -- ─────────────────────────────────────────
    BEGIN
        SELECT
            COALESCE(SUM(CASE WHEN account_type = 'bank'     THEN initial_balance ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN account_type = 'treasury' THEN initial_balance ELSE 0 END), 0)
        INTO init_bank, init_treasury
        FROM finance_accounts;
    EXCEPTION WHEN undefined_table THEN
        init_bank := 0; init_treasury := 0;
    END;

    -- ─────────────────────────────────────────
    -- 2. الإيرادات والرسوم للفترة المحددة
    --    استبعاد FREE-* + الدفعات بصفر
    -- ─────────────────────────────────────────
    WITH period_payments AS (
        SELECT p.amount, p.payment_method
        FROM payments p
        WHERE p.status = 'paid'
          AND p.paid_at >= since_ts
          AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
          AND p.amount > 0
    ),
    with_fees AS (
        SELECT pp.amount,
               (pp.amount * COALESCE(pf.fee_percent, 2.75) / 100
                          + COALESCE(pf.fee_fixed, 0)) AS fee
        FROM period_payments pp
        LEFT JOIN payment_fees pf ON pf.payment_method = pp.payment_method
    )
    SELECT COALESCE(SUM(amount), 0),
           COALESCE(SUM(fee), 0),
           COUNT(*)::INT
    INTO total_inc_gross, total_fees, inc_count
    FROM with_fees;

    total_inc_net := total_inc_gross - total_fees;

    -- ─────────────────────────────────────────
    -- 3. المصروفات للفترة (يتجاوز إن الجدول مفقود)
    -- ─────────────────────────────────────────
    BEGIN
        SELECT COALESCE(SUM(amount), 0), COUNT(*)::INT
        INTO total_exp, exp_count
        FROM expenses
        WHERE expense_date >= since_ts::DATE;
    EXCEPTION WHEN undefined_table THEN
        total_exp := 0; exp_count := 0;
    END;

    -- ─────────────────────────────────────────
    -- 4. الإيرادات الصافية كاملة الوقت (لرصيد البنك)
    -- ─────────────────────────────────────────
    WITH all_payments AS (
        SELECT p.amount, p.payment_method
        FROM payments p
        WHERE p.status = 'paid'
          AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
          AND p.amount > 0
    ),
    all_with_fees AS (
        SELECT (ap.amount - (ap.amount * COALESCE(pf.fee_percent, 2.75) / 100
                                       + COALESCE(pf.fee_fixed, 0))) AS net
        FROM all_payments ap
        LEFT JOIN payment_fees pf ON pf.payment_method = ap.payment_method
    )
    SELECT COALESCE(SUM(net), 0)
    INTO total_inc_net_all
    FROM all_with_fees;

    -- ─────────────────────────────────────────
    -- 5. المصروفات كاملة الوقت
    -- ─────────────────────────────────────────
    BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO total_exp_all FROM expenses;
    EXCEPTION WHEN undefined_table THEN
        total_exp_all := 0;
    END;

    -- ─────────────────────────────────────────
    -- 6. التحويلات بين الصناديق
    -- ─────────────────────────────────────────
    BEGIN
        SELECT
            COALESCE(SUM(CASE WHEN from_account = 'bank'     THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN to_account   = 'bank'     THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN from_account = 'treasury' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN to_account   = 'treasury' THEN amount ELSE 0 END), 0)
        INTO xfers_from_bank, xfers_to_bank, xfers_from_treasury, xfers_to_treasury
        FROM finance_transfers;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    bank_balance     := init_bank + total_inc_net_all - total_exp_all
                                  - xfers_from_bank + xfers_to_bank;
    treasury_balance := init_treasury - xfers_from_treasury + xfers_to_treasury;

    -- ─────────────────────────────────────────
    -- 7. آخر 50 دفعة فعلية للفترة + اسم العميل
    -- ─────────────────────────────────────────
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO payments_list
    FROM (
        SELECT p.id, p.user_id, p.amount, p.plan_type, p.status,
               p.paid_at, p.created_at, p.payment_id, p.coupon_code,
               p.payment_method, pr.full_name
        FROM payments p
        LEFT JOIN profiles pr ON pr.id = p.user_id
        WHERE p.status = 'paid'
          AND p.paid_at >= since_ts
          AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
          AND p.amount > 0
        ORDER BY p.paid_at DESC
        LIMIT 50
    ) t;

    -- ─────────────────────────────────────────
    -- النتيجة النهائية
    -- ─────────────────────────────────────────
    result := json_build_object(
        'period_days',         p_period_days,
        'total_inc_gross',     total_inc_gross,
        'total_fees',          total_fees,
        'total_inc_net',       total_inc_net,
        'inc_count',           inc_count,
        'total_exp',           total_exp,
        'exp_count',           exp_count,
        'net_profit',          total_inc_net - total_exp,
        'bank_balance',        bank_balance,
        'treasury_balance',    treasury_balance,
        'init_bank',           init_bank,
        'init_treasury',       init_treasury,
        'total_inc_net_all',   total_inc_net_all,
        'total_exp_all',       total_exp_all,
        'xfers_from_bank',     xfers_from_bank,
        'xfers_to_bank',       xfers_to_bank,
        'xfers_from_treasury', xfers_from_treasury,
        'xfers_to_treasury',   xfers_to_treasury,
        'payments',            payments_list
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_finance(INT) TO authenticated;

COMMENT ON FUNCTION public.admin_get_finance(INT) IS
  'كل أرقام صفحة المالية + آخر 50 دفعة في استدعاء واحد. SECURITY DEFINER + admin check.';
