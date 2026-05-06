-- ============================================================
-- مدارك النخبة v2 — Migration 51
-- RPC للـ overview في لوحة الإدارة
-- ============================================================
-- الهدف: تحصين اللوحة من تغييرات RLS المستقبلية.
--
-- الميزات:
--   - SECURITY DEFINER يتجاوز RLS (يقرأ كل البيانات)
--   - يتحقّق is_admin() قبل أي قراءة (آمن)
--   - يرجع كل الأرقام في JSON واحد (سريع، استدعاء DB واحد)
--   - مطابق 100% للـ queries الموجودة في loadOverview
--
-- يستبدل في admin-v2.html هذي الـ 6 queries:
--   sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false)
--   sb.from('profiles').select('*',{count:'exact',head:true})
--   sb.from('profiles').select('subscription_type').gt('subscription_end',NOW)
--   sb.from('attempts').select('*',{count:'exact',head:true}).gte('created_at',today)
--   sb.from('reports').select('*',{count:'exact',head:true}).eq('status','pending')
--   sb.from('payments').select('amount').eq('status','paid').gte('paid_at',since30)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    today_start TIMESTAMPTZ := date_trunc('day', NOW());
    since_30    TIMESTAMPTZ := NOW() - interval '30 days';
BEGIN
    -- تحقّق admin (يستفيد من is_admin() الموجودة من SQL 03)
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'unauthorized: admin role required'
          USING ERRCODE = '42501';
    END IF;

    SELECT json_build_object(
        'totalQ',         (SELECT COUNT(*) FROM questions WHERE disabled = false),
        'totalUsers',     (SELECT COUNT(*) FROM profiles),
        'activeSubs',     (SELECT COUNT(*) FROM profiles
                            WHERE subscription_end > NOW()
                              AND subscription_type IN ('monthly','quarterly','yearly')),
        'monthlySubs',    (SELECT COUNT(*) FROM profiles
                            WHERE subscription_type = 'monthly'
                              AND subscription_end > NOW()),
        'yearlySubs',     (SELECT COUNT(*) FROM profiles
                            WHERE subscription_type = 'yearly'
                              AND subscription_end > NOW()),
        'todayAttempts',  (SELECT COUNT(*) FROM attempts
                            WHERE created_at >= today_start),
        'pendingReports', (SELECT COUNT(*) FROM reports
                            WHERE status = 'pending'),
        'monthlyRevenue', COALESCE(
                            (SELECT SUM(amount)::int FROM payments
                              WHERE status = 'paid'
                                AND paid_at >= since_30),
                            0
                          )
    ) INTO result;

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_overview() TO authenticated;

COMMENT ON FUNCTION public.admin_get_overview() IS
  'يُرجع أرقام الصفحة الرئيسية للوحة الإدارة في JSON واحد. SECURITY DEFINER يتجاوز RLS بأمان (admin check داخلي).';
