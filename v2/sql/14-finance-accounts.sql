-- ============================================================
-- Migration 14 — صندوقا المالية: البنك والخزينة
-- إضافات فقط — لا تعديل على جداول موجودة
-- ============================================================

-- ── 1. جدول أرصدة الأولى للحسابين ──
CREATE TABLE IF NOT EXISTS finance_accounts (
    account_type TEXT PRIMARY KEY CHECK (account_type IN ('bank','treasury')),
    initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    label TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES profiles(id)
);

-- seed — يضمن وجود السجلين
INSERT INTO finance_accounts (account_type, initial_balance, label) VALUES
    ('bank', 0, 'البنك (الحساب الجاري)'),
    ('treasury', 0, 'الخزينة (الادخار)')
ON CONFLICT (account_type) DO NOTHING;

-- ── 2. التحويلات اليدوية بين الصندوقين ──
CREATE TABLE IF NOT EXISTS finance_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account TEXT NOT NULL CHECK (from_account IN ('bank','treasury')),
    to_account TEXT NOT NULL CHECK (to_account IN ('bank','treasury')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id),
    CONSTRAINT different_accounts CHECK (from_account <> to_account)
);

CREATE INDEX IF NOT EXISTS idx_finance_transfers_created_at ON finance_transfers(created_at DESC);

-- ── 3. نسب رسوم وسائل الدفع ──
CREATE TABLE IF NOT EXISTS payment_fees (
    payment_method TEXT PRIMARY KEY,
    fee_percent NUMERIC(5,2) NOT NULL DEFAULT 2.75,
    fee_fixed NUMERIC(6,2) NOT NULL DEFAULT 0,
    label TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO payment_fees (payment_method, fee_percent, fee_fixed, label) VALUES
    ('visa',      2.75, 1.00, 'فيزا / ماستركارد'),
    ('apple_pay', 2.50, 0.00, 'Apple Pay'),
    ('mada',      1.00, 0.00, 'مدى'),
    ('stc_pay',   2.50, 0.00, 'STC Pay'),
    ('default',   2.75, 0.00, 'افتراضي')
ON CONFLICT (payment_method) DO NOTHING;

-- ── 4. RLS ──
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_accounts_admin_all ON finance_accounts;
CREATE POLICY finance_accounts_admin_all ON finance_accounts
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff'))
    );

DROP POLICY IF EXISTS finance_transfers_admin_all ON finance_transfers;
CREATE POLICY finance_transfers_admin_all ON finance_transfers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff'))
    );

DROP POLICY IF EXISTS payment_fees_admin_all ON payment_fees;
CREATE POLICY payment_fees_admin_all ON payment_fees
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','staff'))
    );

-- ── تحقق ──
SELECT * FROM finance_accounts ORDER BY account_type;
SELECT * FROM payment_fees ORDER BY payment_method;
