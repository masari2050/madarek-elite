-- ═══════════════════════════════════════════════════════════════
-- Migration 67 — إضافة عمود referred_by المفقود في profiles
-- ═══════════════════════════════════════════════════════════════
--
-- الخطأ المُكتشف (2026-05-09):
--   apply_cash_referral RPC يحاول:
--     UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;
--   لكن العمود غير موجود في DB → الإحالة كلها تفشل بـerror:
--     'column "referred_by" of relation "profiles" does not exist'
--
-- السبب: SQL 16 افترض وجود referred_by (من schema قديم)، لكن في DB الفعلي مفقود.
--
-- الحل: إضافة العمود + index. الـRPC apply_cash_referral سيعمل تلقائياً بعدها.
--
-- التشغيل: مرة واحدة في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by) WHERE referred_by IS NOT NULL;

COMMENT ON COLUMN profiles.referred_by IS
  'مرجع للمحيل الذي عبر كوده وصل المستخدم. NULL لو ما في إحالة. تُكتب من apply_cash_referral.';

-- ── Backfill: اربط profiles بالمحيلين من جدول referrals (لو في إحالات قديمة) ──
UPDATE profiles p
SET referred_by = r.referrer_id
FROM referrals r
WHERE r.referred_user_id = p.id
  AND p.referred_by IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- التحقّق:
-- 1) العمود موجود:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name='profiles' AND column_name='referred_by';
--
-- 2) عدد الـbackfilled:
--    SELECT COUNT(*) FROM profiles WHERE referred_by IS NOT NULL;
-- ═══════════════════════════════════════════════════════════════
