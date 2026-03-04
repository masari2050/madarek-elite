-- =============================================
-- جدول تتبع أحداث الكوبونات
-- =============================================

CREATE TABLE IF NOT EXISTS coupon_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_code TEXT NOT NULL,
  event_type TEXT NOT NULL,       -- 'copy' | 'view' | 'use'
  source TEXT DEFAULT 'popup',     -- 'popup' | 'pricing' | 'direct'
  user_id UUID,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- فهارس للاستعلامات السريعة
CREATE INDEX IF NOT EXISTS idx_coupon_events_code ON coupon_events(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_events_type ON coupon_events(event_type);
CREATE INDEX IF NOT EXISTS idx_coupon_events_created ON coupon_events(created_at);

-- تفعيل RLS
ALTER TABLE coupon_events ENABLE ROW LEVEL SECURITY;

-- السماح بالإدخال للجميع (لتتبع النسخ من الزوار)
CREATE POLICY "Allow public inserts on coupon_events"
  ON coupon_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- الأدمن والموظفين فقط يقدرون يقرأون الإحصائيات
CREATE POLICY "Admin can read coupon_events"
  ON coupon_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- دالة لجلب إحصائيات الكوبونات
CREATE OR REPLACE FUNCTION get_coupon_stats(target_code TEXT DEFAULT NULL)
RETURNS TABLE(
  coupon_code TEXT,
  views BIGINT,
  copies BIGINT,
  uses BIGINT
)
AS $$
  SELECT
    ce.coupon_code,
    COUNT(*) FILTER (WHERE ce.event_type = 'view'),
    COUNT(*) FILTER (WHERE ce.event_type = 'copy'),
    COUNT(*) FILTER (WHERE ce.event_type = 'use')
  FROM coupon_events ce
  WHERE (target_code IS NULL OR ce.coupon_code = target_code)
  GROUP BY ce.coupon_code
  ORDER BY COUNT(*) DESC;
$$ LANGUAGE sql SECURITY DEFINER;
