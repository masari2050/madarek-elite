-- ════════════════════════════════════════════════════════════════════
-- 57-leaderboard-rpc-fix.sql                            2026-05-08
-- Fix: get_leaderboard_v2 كان يستخدم profiles.xp (عمود غير موجود في prod)
-- الحل: حساب الـ XP ديناميكياً من attempts.is_correct
-- ════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_leaderboard_v2(text, int);

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
    p_period text DEFAULT 'week',
    p_limit  int  DEFAULT 20
)
RETURNS TABLE(
    user_id uuid,
    name    text,
    xp      int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        COALESCE(NULLIF(TRIM(p.full_name), ''), 'مستخدم') AS name,
        (COUNT(*) FILTER (WHERE a.is_correct) * 10)::int AS xp
    FROM public.profiles p
    INNER JOIN public.attempts a ON a.user_id = p.id
    WHERE
        CASE p_period
            WHEN 'week'  THEN a.created_at >= NOW() - INTERVAL '7 days'
            WHEN 'month' THEN a.created_at >= NOW() - INTERVAL '30 days'
            ELSE TRUE                                  -- 'all'
        END
        AND COALESCE(p.role, 'user') = 'user'           -- استبعاد admin/staff
    GROUP BY p.id, p.full_name
    HAVING COUNT(*) FILTER (WHERE a.is_correct) > 0
    ORDER BY xp DESC, p.full_name ASC
    LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text, int) TO anon, authenticated;

-- اختبار سريع:
-- SELECT * FROM public.get_leaderboard_v2('week', 5);
