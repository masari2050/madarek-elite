-- ═══════════════════════════════════════════════════
-- 🏆 دالة المتصدرين — مدارك النخبة
-- شغّل هذا في SQL Editor في لوحة Supabase
-- (بعد ما تشغّل analytics-setup.sql)
-- ═══════════════════════════════════════════════════

-- ──────────────────────────────────
-- دالة get_leaderboard
-- تستخدمها صفحة المتصدرين والداشبورد
-- ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_leaderboard(period text DEFAULT 'week')
RETURNS TABLE(rank bigint, user_id uuid, display_name text, avatar_emoji text, xp bigint)
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(CASE WHEN a.is_correct THEN 10 ELSE 0 END) DESC),
    a.user_id,
    SPLIT_PART(p.full_name, ' ', 1),
    COALESCE(p.avatar_emoji, '👤'),
    SUM(CASE WHEN a.is_correct THEN 10 ELSE 0 END)
  FROM attempts a
  JOIN profiles p ON p.id = a.user_id
  WHERE p.role = 'user'
    AND CASE
      WHEN period = 'week' THEN a.answered_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Riyadh')
      WHEN period = 'month' THEN a.answered_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Riyadh')
      ELSE TRUE
    END
  GROUP BY a.user_id, p.full_name, p.avatar_emoji
  ORDER BY 5 DESC
  LIMIT 50;
$$ LANGUAGE sql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- ✅ تم! شغّل هذا الكود في SQL Editor
-- ═══════════════════════════════════════════════════
