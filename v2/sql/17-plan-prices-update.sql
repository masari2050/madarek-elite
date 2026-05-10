-- ═══════════════════════════════════════════════════════════════
-- Migration 17 — تحديث أسعار الخطط + إضافة خطة quarterly
-- ═══════════════════════════════════════════════════════════════
-- الأسعار الجديدة المعتمدة:
--   شهري    → 99 ر.س
--   3 شهور  → 249 ر.س (خصم 16%)
--   سنوي    → 799 ر.س (خصم 33% — الأكثر توفيراً)
--
-- القاعدة الذهبية:
--   - لا نحذف ولا نعدّل أعمدة
--   - UPDATE على السجلات الحالية (لا INSERT إذا موجودة)
--   - INSERT فقط إذا السجل ما موجود (WHERE NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- 1) تحديث الشهري
UPDATE plans
SET price = 99.00,
    original_price = NULL,
    discount_percentage = 0,
    is_featured = false,
    savings_text = NULL,
    name = 'شهري',
    duration_days = 30,
    sort_order = 1,
    is_active = true
WHERE slug = 'monthly';

INSERT INTO plans (name, slug, price, duration_days, is_featured, savings_text, sort_order, is_active)
SELECT 'شهري', 'monthly', 99.00, 30, false, NULL, 1, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'monthly');

-- 2) تحديث الربع سنوي
UPDATE plans
SET price = 249.00,
    original_price = 297.00,             -- 99 × 3
    discount_percentage = 16,
    is_featured = false,
    savings_text = 'وفّر 48 ر.س',
    name = '3 شهور',
    duration_days = 90,
    sort_order = 2,
    is_active = true
WHERE slug = 'quarterly';

INSERT INTO plans (name, slug, price, original_price, discount_percentage, duration_days, is_featured, savings_text, sort_order, is_active)
SELECT '3 شهور', 'quarterly', 249.00, 297.00, 16, 90, false, 'وفّر 48 ر.س', 2, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'quarterly');

-- 3) تحديث السنوي (المميّز = الأكثر توفيراً)
UPDATE plans
SET price = 799.00,
    original_price = 1188.00,            -- 99 × 12
    discount_percentage = 33,
    is_featured = true,                  -- badge "الأكثر توفيراً"
    savings_text = 'وفّر 389 ر.س',
    name = 'سنوي',
    duration_days = 365,
    sort_order = 3,
    is_active = true
WHERE slug = 'yearly';

INSERT INTO plans (name, slug, price, original_price, discount_percentage, duration_days, is_featured, savings_text, sort_order, is_active)
SELECT 'سنوي', 'yearly', 799.00, 1188.00, 33, 365, true, 'وفّر 389 ر.س', 3, true
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE slug = 'yearly');

-- تحقّق (للاختبار بعد التشغيل):
-- SELECT slug, name, price, original_price, discount_percentage, is_featured, is_active, sort_order
-- FROM plans ORDER BY sort_order;
