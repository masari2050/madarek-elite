-- ═══════════════════════════════════════════════════════════════
-- نظام الفواتير الضريبي — مدارك النخبة
-- نفّذ هذا الملف في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ١. جدول الفواتير
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,           -- تسلسلي: INV-2025-0001
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_tax_number TEXT,                      -- اختياري للأفراد
  plan_name TEXT NOT NULL,                       -- شهري / سنوي
  amount_before_tax NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,             -- 15% ضريبة القيمة المضافة
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  payment_id TEXT,                               -- MyFatoorah InvoiceId
  payment_status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ٢. تأمين الجدول بـ RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- المستخدم يشوف فواتيره فقط
CREATE POLICY "user_own_invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- الأدمن يشوف ويتحكم بالكل
CREATE POLICY "admin_all"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ٣. Function: توليد رقم فاتورة تسلسلي (INV-YYYY-XXXX)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  last_seq INT;
  new_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;

  -- جلب آخر رقم تسلسلي لهذه السنة
  SELECT COALESCE(
    MAX(
      CAST(
        SPLIT_PART(invoice_number, '-', 3) AS INT
      )
    ), 0
  ) INTO last_seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || current_year || '-%';

  -- التسلسل الجديد
  new_number := 'INV-' || current_year || '-' || LPAD((last_seq + 1)::TEXT, 4, '0');

  RETURN new_number;
END;
$$;

-- ٤. Function: إنشاء فاتورة (SECURITY DEFINER — يتجاوز RLS)
CREATE OR REPLACE FUNCTION create_invoice(
  p_user_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_plan_name TEXT,
  p_total_amount NUMERIC,
  p_payment_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_number TEXT;
  v_before_tax NUMERIC(10,2);
  v_tax NUMERIC(10,2);
  v_invoice_id UUID;
BEGIN
  -- توليد رقم الفاتورة
  v_invoice_number := generate_invoice_number();

  -- حساب الضريبة (المبلغ شامل الضريبة 15%)
  v_before_tax := ROUND(p_total_amount / 1.15, 2);
  v_tax := ROUND(p_total_amount - v_before_tax, 2);

  -- إدخال الفاتورة
  INSERT INTO invoices (
    invoice_number, user_id, customer_name, customer_phone,
    plan_name, amount_before_tax, tax_amount, total_amount,
    payment_id, payment_status
  ) VALUES (
    v_invoice_number, p_user_id, p_customer_name, p_customer_phone,
    p_plan_name, v_before_tax, v_tax, p_total_amount,
    p_payment_id, 'paid'
  )
  RETURNING id INTO v_invoice_id;

  RETURN json_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'before_tax', v_before_tax,
    'tax', v_tax,
    'total', p_total_amount
  );
END;
$$;
