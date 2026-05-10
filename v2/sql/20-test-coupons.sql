-- ══════════════════════════════════════════════════════════════
--  20 — كوبونات اختبار E2E للتطبيق
--  تاريخ: 2026-04-21
--  الغرض: اختبار تدفّق الدفع بريال واحد بدل ٧٩
-- ══════════════════════════════════════════════════════════════
--  ملاحظة: جدول coupons ما فيه عمود is_active
--  الأعمدة الفعلية: code, plan_type, discount_type, discount_value,
--                   duration_months, max_uses, used_count, expires_at
-- ══════════════════════════════════════════════════════════════

-- 🧪 كوبون 1: TEST01 → 1 ريال فقط (fixed discount)
--   خصم ثابت 78 ريال → الباقي = 1 ر.س (فوق الحد الأدنى لـMyFatoorah)
INSERT INTO coupons (code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at)
VALUES ('TEST01', 'all', 'fixed', 78, 1, 10, 0, now() + interval '7 days')
ON CONFLICT (code) DO UPDATE SET
  plan_type       = EXCLUDED.plan_type,
  discount_type   = EXCLUDED.discount_type,
  discount_value  = EXCLUDED.discount_value,
  duration_months = EXCLUDED.duration_months,
  max_uses        = EXCLUDED.max_uses,
  used_count      = 0,
  expires_at      = EXCLUDED.expires_at;

-- 🆓 كوبون 2: FREE01 → مجاني كلياً (يفعّل الاشتراك بدون MyFatoorah)
INSERT INTO coupons (code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at)
VALUES ('FREE01', 'all', 'free', 100, 1, 10, 0, now() + interval '7 days')
ON CONFLICT (code) DO UPDATE SET
  plan_type       = EXCLUDED.plan_type,
  discount_type   = EXCLUDED.discount_type,
  discount_value  = EXCLUDED.discount_value,
  duration_months = EXCLUDED.duration_months,
  max_uses        = EXCLUDED.max_uses,
  used_count      = 0,
  expires_at      = EXCLUDED.expires_at;

-- 📊 تحقّق
SELECT code, plan_type, discount_type, discount_value, duration_months, max_uses, used_count, expires_at
FROM coupons
WHERE code IN ('TEST01', 'FREE01')
ORDER BY code;
