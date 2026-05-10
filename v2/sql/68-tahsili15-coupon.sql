-- ═══════════════════════════════════════════════════════════════
-- Migration 68 — كوبون TAHSILI15 لحملة TikTok التحصيلي 1447
-- ═══════════════════════════════════════════════════════════════
--
-- الهدف:
--   كوبون 15% خصم لحملة الإعلانات على TikTok قبل اختبار التحصيلي.
--   يبدأ الاختبار يوم الخميس 14 مايو 2026 لمدة 3 أيام.
--   الكوبون نشط من اليوم حتى نهاية أيام الاختبار + يومين (للمتأخرين).
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

INSERT INTO coupons (
  code,
  discount_type,
  discount_value,
  plan_type,
  duration_months,
  max_uses,
  used_count,
  expires_at,
  description,
  is_active
)
VALUES (
  'TAHSILI15',
  'percentage',
  15,
  'all',           -- ينطبق على كل الباقات
  NULL,            -- لا يغيّر مدة الاشتراك
  500,             -- حد 500 استخدام (عشان نراقب الـROI)
  0,
  '2026-05-18 23:59:59+03'::timestamptz,  -- ينتهي بعد آخر يوم اختبار + يومين
  'حملة TikTok — تحصيلي 1447 (خصم 15% لزوار صفحة tahsili-top-400)',
  true
)
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  plan_type = EXCLUDED.plan_type,
  expires_at = EXCLUDED.expires_at,
  description = EXCLUDED.description,
  is_active = true;

-- ═══════════════════════════════════════════════════════════════
-- التحقّق:
-- SELECT code, discount_type, discount_value, plan_type, max_uses,
--        used_count, expires_at, is_active
-- FROM coupons
-- WHERE code = 'TAHSILI15';
--
-- المتوقّع: صف واحد بـpercentage 15% / all plans / max 500 / active
-- ═══════════════════════════════════════════════════════════════
