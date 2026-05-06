-- ============================================================
-- مدارك النخبة v2 — Migration 53
-- إضافة عمود used_coupon على profiles (مفقود من schema)
-- ============================================================
-- السبب: admin_get_users() RPC في SQL 52 يقرأ p.used_coupon
-- وكذلك JS في admin.html القديمة + admin-v2-sections.js + profile-v2.html
-- لكن العمود لم يُضَف رسمياً في أي migration سابق.
-- آمن تماماً: IF NOT EXISTS لو موجود فعلياً (تم إضافته يدوياً قديماً)
-- لن يسوي شيئاً.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS used_coupon TEXT;

COMMENT ON COLUMN profiles.used_coupon IS
  'كود الكوبون المستخدم في تفعيل الاشتراك (للعرض في اللوحة)';
