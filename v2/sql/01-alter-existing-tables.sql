-- ============================================================
-- مدارك النخبة v7 — Migration 01
-- إضافة أعمدة جديدة للجداول الموجودة (ADD ONLY — لا حذف ولا تعديل)
-- ============================================================

-- ────────────────────────────────────────────
-- 1. جدول profiles — إضافة أعمدة الـ Gamification والإعدادات
-- ────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp               INTEGER   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level            INTEGER   DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level_name       TEXT      DEFAULT 'مبتدئ';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_days      INTEGER   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_last_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dark_mode        BOOLEAN   DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sound_enabled    BOOLEAN   DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code    TEXT      UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_questions_solved INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_correct    INTEGER   DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_sessions   INTEGER   DEFAULT 0;

-- ────────────────────────────────────────────
-- 2. جدول questions — إضافة أعمدة التسريبات والإحصائيات والنوع
-- ────────────────────────────────────────────
-- question_type: اختيار من متعدد (افتراضي) / قطعة / صورة
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type   TEXT      DEFAULT 'اختيار من متعدد';
-- ربط بمجموعة التسريبات (FK تُضاف بعد إنشاء leak_groups)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS leak_group_id   UUID;
-- إحصائيات السؤال
ALTER TABLE questions ADD COLUMN IF NOT EXISTS solve_count     INTEGER   DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS accuracy_rate   NUMERIC(5,2) DEFAULT 0;
-- حالة السؤال في نظام المراجعة
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status          TEXT      DEFAULT 'active';
-- image_url موجود فعلاً — لا نضيفه مرة ثانية

-- ────────────────────────────────────────────
-- 3. جدول practice_sessions — إضافة وضع العرض
-- ────────────────────────────────────────────
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS show_mode    TEXT DEFAULT 'instant';
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'practice';
-- session_type: practice / test / leak / trial / ai_plan

-- ────────────────────────────────────────────
-- 4. جدول reports — إضافة حالة المراجعة
-- ────────────────────────────────────────────
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes  TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by  UUID REFERENCES auth.users(id);

-- ────────────────────────────────────────────
-- 5. جدول attempts — إضافة ربط بالجلسة
-- ────────────────────────────────────────────
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS session_id UUID;

-- ============================================================
-- فهارس للأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_questions_leak_group ON questions(leak_group_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
