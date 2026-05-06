-- ============================================================
-- مدارك النخبة v2 — Migration 52
-- RPC لقائمة الأعضاء في لوحة الإدارة
-- ============================================================
-- يستبدل في loadUsers() هذي الـ queries:
--   sb.from('profiles').select(...).or(search).filter(...).range(...)
--   sb.from('attempts').select('user_id,is_correct').in('user_id', uids)
--
-- يرجع JSON واحد فيه قائمة الأعضاء + إحصائياتهم + العدد الإجمالي.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_users(
    p_filter    TEXT DEFAULT '',
    p_search    TEXT DEFAULT '',
    p_page      INT  DEFAULT 1,
    p_page_size INT  DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result          json;
    total_count     BIGINT;
    offset_val      INT          := (GREATEST(p_page, 1) - 1) * p_page_size;
    search_pattern  TEXT         := '%' || COALESCE(p_search, '') || '%';
    now_ts          TIMESTAMPTZ  := NOW();
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized: admin role required'
          USING ERRCODE = '42501';
    END IF;

    -- العدد الإجمالي (للـ pagination)
    SELECT COUNT(*) INTO total_count
    FROM profiles p
    WHERE
        (p_search = '' OR p.full_name ILIKE search_pattern OR p.phone ILIKE search_pattern)
        AND (
            p_filter = ''
            OR (p_filter = 'subscribed' AND p.subscription_type IN ('monthly','quarterly','yearly') AND p.subscription_end > now_ts)
            OR (p_filter = 'free'       AND (p.subscription_type IS NULL OR p.subscription_type = 'free'))
            OR (p_filter = 'expired'    AND p.subscription_end < now_ts)
        );

    -- البيانات + الإحصائيات (محسوبة داخل DB، لا حاجة لـ query ثانية)
    WITH filtered AS (
        SELECT
            p.id, p.full_name, p.phone,
            p.subscription_type, p.subscription_end,
            p.avatar_emoji, p.created_at, p.last_seen_at,
            p.used_coupon
        FROM profiles p
        WHERE
            (p_search = '' OR p.full_name ILIKE search_pattern OR p.phone ILIKE search_pattern)
            AND (
                p_filter = ''
                OR (p_filter = 'subscribed' AND p.subscription_type IN ('monthly','quarterly','yearly') AND p.subscription_end > now_ts)
                OR (p_filter = 'free'       AND (p.subscription_type IS NULL OR p.subscription_type = 'free'))
                OR (p_filter = 'expired'    AND p.subscription_end < now_ts)
            )
        ORDER BY p.created_at DESC
        LIMIT p_page_size
        OFFSET offset_val
    ),
    with_stats AS (
        SELECT
            f.*,
            COALESCE((SELECT COUNT(*) FROM attempts a WHERE a.user_id = f.id), 0)::int AS total_attempts,
            COALESCE((SELECT COUNT(*) FROM attempts a WHERE a.user_id = f.id AND a.is_correct = true), 0)::int AS correct_attempts
        FROM filtered f
    )
    SELECT json_build_object(
        'users',       COALESCE(json_agg(row_to_json(with_stats)), '[]'::json),
        'total_count', total_count
    )
    INTO result
    FROM with_stats;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users(TEXT, TEXT, INT, INT) TO authenticated;

COMMENT ON FUNCTION public.admin_get_users(TEXT, TEXT, INT, INT) IS
  'قائمة الأعضاء للوحة الإدارة + إحصائياتهم + العدد الإجمالي. SECURITY DEFINER + admin check.';
