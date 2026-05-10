-- ============================================================
-- مدارك النخبة v2 — Migration 56
-- إصلاح admin_get_finance: payment_fees قد يفتقد عمود payment_method
-- ============================================================
-- السبب: production عنده payment_fees بدون عمود payment_method
-- → الـ JOIN في خطوتَي الإيرادات (period + all-time) يكسر.
-- الحل: لفّ كل CTE بـ BEGIN/EXCEPTION + استعلام بديل بدون JOIN
-- يحسب الرسوم بالنسبة الافتراضية (2.75%).
--
-- آمن: CREATE OR REPLACE فقط، لا يعدّل أي جدول.
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
    DEFAULT_FEE_PCT      CONSTANT NUMERIC := 2.75;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized: admin role required'
          USING ERRCODE = '42501';
    END IF;

    since_ts := CASE
        WHEN p_period_days > 0 THEN NOW() - (p_period_days || ' days')::INTERVAL
        ELSE '1970-01-01'::TIMESTAMPTZ
    END;

    -- 1. الأرصدة الأولية
    BEGIN
        SELECT
            COALESCE(SUM(CASE WHEN account_type = 'bank'     THEN initial_balance ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN account_type = 'treasury' THEN initial_balance ELSE 0 END), 0)
        INTO init_bank, init_treasury
        FROM finance_accounts;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        init_bank := 0; init_treasury := 0;
    END;

    -- 2. الإيرادات للفترة (محاولة JOIN، fallback لرسوم افتراضية)
    BEGIN
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
                   (pp.amount * COALESCE(pf.fee_percent, DEFAULT_FEE_PCT) / 100
                              + COALESCE(pf.fee_fixed, 0)) AS fee
            FROM period_payments pp
            LEFT JOIN payment_fees pf ON pf.payment_method = pp.payment_method
        )
        SELECT COALESCE(SUM(amount), 0),
               COALESCE(SUM(fee), 0),
               COUNT(*)::INT
        INTO total_inc_gross, total_fees, inc_count
        FROM with_fees;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        -- fallback: بدون payment_fees → نسبة افتراضية 2.75%
        SELECT COALESCE(SUM(p.amount), 0),
               COALESCE(SUM(p.amount * DEFAULT_FEE_PCT / 100), 0),
               COUNT(*)::INT
        INTO total_inc_gross, total_fees, inc_count
        FROM payments p
        WHERE p.status = 'paid'
          AND p.paid_at >= since_ts
          AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
          AND p.amount > 0;
    END;

    total_inc_net := total_inc_gross - total_fees;

    -- 3. المصروفات للفترة
    BEGIN
        SELECT COALESCE(SUM(amount), 0), COUNT(*)::INT
        INTO total_exp, exp_count
        FROM expenses
        WHERE expense_date >= since_ts::DATE;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        total_exp := 0; exp_count := 0;
    END;

    -- 4. الإيرادات الصافية كاملة الوقت
    BEGIN
        WITH all_payments AS (
            SELECT p.amount, p.payment_method
            FROM payments p
            WHERE p.status = 'paid'
              AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
              AND p.amount > 0
        ),
        all_with_fees AS (
            SELECT (ap.amount - (ap.amount * COALESCE(pf.fee_percent, DEFAULT_FEE_PCT) / 100
                                           + COALESCE(pf.fee_fixed, 0))) AS net
            FROM all_payments ap
            LEFT JOIN payment_fees pf ON pf.payment_method = ap.payment_method
        )
        SELECT COALESCE(SUM(net), 0)
        INTO total_inc_net_all
        FROM all_with_fees;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        SELECT COALESCE(SUM(p.amount * (1 - DEFAULT_FEE_PCT / 100)), 0)
        INTO total_inc_net_all
        FROM payments p
        WHERE p.status = 'paid'
          AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
          AND p.amount > 0;
    END;

    -- 5. المصروفات كاملة الوقت
    BEGIN
        SELECT COALESCE(SUM(amount), 0) INTO total_exp_all FROM expenses;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        total_exp_all := 0;
    END;

    -- 6. التحويلات
    BEGIN
        SELECT
            COALESCE(SUM(CASE WHEN from_account = 'bank'     THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN to_account   = 'bank'     THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN from_account = 'treasury' THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN to_account   = 'treasury' THEN amount ELSE 0 END), 0)
        INTO xfers_from_bank, xfers_to_bank, xfers_from_treasury, xfers_to_treasury
        FROM finance_transfers;
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        NULL;
    END;

    bank_balance     := init_bank + total_inc_net_all - total_exp_all
                                  - xfers_from_bank + xfers_to_bank;
    treasury_balance := init_treasury - xfers_from_treasury + xfers_to_treasury;

    -- 7. آخر 50 دفعة (مع fallback إن payments.payment_method مفقود)
    BEGIN
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
    EXCEPTION WHEN undefined_column THEN
        SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
        INTO payments_list
        FROM (
            SELECT p.id, p.user_id, p.amount, p.plan_type, p.status,
                   p.paid_at, p.created_at, p.payment_id, p.coupon_code,
                   NULL::TEXT AS payment_method, pr.full_name
            FROM payments p
            LEFT JOIN profiles pr ON pr.id = p.user_id
            WHERE p.status = 'paid'
              AND p.paid_at >= since_ts
              AND COALESCE(p.payment_id, '') NOT LIKE 'FREE-%'
              AND p.amount > 0
            ORDER BY p.paid_at DESC
            LIMIT 50
        ) t;
    END;

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
