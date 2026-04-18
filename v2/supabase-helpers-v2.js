/**
 * supabase-helpers-v2.js — مدارك النخبة v7
 * مكتبة مشتركة لكل صفحات v2
 * تحمّل Supabase client + دوال مساعدة
 */
(function () {
    'use strict';

    // ── Supabase Config ──
    const SUPABASE_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

    let _sb = null;
    let _currentUser = null;
    let _profile = null;

    // ── Initialize Supabase ──
    function getSb() {
        if (!_sb) {
            if (!window.supabase || !window.supabase.createClient) {
                throw new Error('Supabase JS library not loaded');
            }
            _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        return _sb;
    }

    // ── Auth ──
    async function getUser() {
        if (_currentUser) return _currentUser;
        const { data } = await getSb().auth.getUser();
        _currentUser = data?.user || null;
        return _currentUser;
    }

    async function getProfile(forceRefresh) {
        if (_profile && !forceRefresh) return _profile;
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb()
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        _profile = data;
        return _profile;
    }

    async function requireAuth(redirectTo) {
        const user = await getUser();
        if (!user) {
            const redir = redirectTo || 'login.html';
            window.location.href = redir + '?redirect=' + encodeURIComponent(window.location.pathname);
            return null;
        }
        return user;
    }

    async function requireAdmin() {
        const profile = await getProfile();
        if (!profile || !['admin', 'staff'].includes(profile.role)) {
            window.location.href = 'admin-login.html';
            return null;
        }
        return profile;
    }

    function onAuthChange(callback) {
        getSb().auth.onAuthStateChange((event, session) => {
            _currentUser = session?.user || null;
            _profile = null;
            callback(event, session);
        });
    }

    async function signOut() {
        await getSb().auth.signOut();
        _currentUser = null;
        _profile = null;
        window.location.href = 'login.html';
    }

    // ── Subscription ──
    function isSubscribed(profile) {
        if (!profile) return false;
        if (profile.role === 'admin' || profile.role === 'staff') return true;
        if (!profile.subscription_type || profile.subscription_type === 'free') return false;
        if (!profile.subscription_end) return false;
        return new Date(profile.subscription_end) > new Date();
    }

    function subscriptionDaysLeft(profile) {
        if (!profile?.subscription_end) return 0;
        const diff = new Date(profile.subscription_end) - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // ── XP & Level ──
    async function addXP(amount) {
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb().rpc('update_user_xp', {
            p_user_id: user.id,
            p_xp_amount: amount
        });
        return data;
    }

    // XP rewards
    const XP_REWARDS = {
        CORRECT_ANSWER: 10,
        WRONG_ANSWER: 2,
        COMPLETE_SESSION: 25,
        COMPLETE_LEAK: 50,
        DAILY_STREAK: 15,
        ACHIEVEMENT_UNLOCK: 100
    };

    // ── Streak ──
    async function updateStreak() {
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb().rpc('update_daily_streak', {
            p_user_id: user.id
        });
        return data;
    }

    // ── Achievements ──
    async function checkAchievements() {
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb().rpc('check_achievements', {
            p_user_id: user.id
        });
        return data;
    }

    // ── Home Stats ──
    async function getHomeStats() {
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb().rpc('get_home_stats', {
            p_user_id: user.id
        });
        return data;
    }

    // ── Leaks ──
    async function getUserLeaks() {
        const user = await getUser();
        if (!user) return [];
        const { data } = await getSb().rpc('get_user_leaks', {
            p_user_id: user.id
        });
        return data || [];
    }

    // ── Saved Questions ──
    async function saveQuestion(questionId) {
        const user = await getUser();
        if (!user) return null;
        const { data, error } = await getSb()
            .from('saved_questions')
            .upsert({ user_id: user.id, question_id: questionId });
        return { data, error };
    }

    async function unsaveQuestion(questionId) {
        const user = await getUser();
        if (!user) return null;
        const { error } = await getSb()
            .from('saved_questions')
            .delete()
            .eq('user_id', user.id)
            .eq('question_id', questionId);
        return { error };
    }

    async function getSavedQuestions() {
        const user = await getUser();
        if (!user) return [];
        const { data } = await getSb()
            .from('saved_questions')
            .select('*, questions(*)')
            .eq('user_id', user.id)
            .order('saved_at', { ascending: false });
        return data || [];
    }

    // ── Referral ──
    async function getReferralStats() {
        const user = await getUser();
        if (!user) return null;
        const { data } = await getSb().rpc('get_my_referral_stats', {
            p_user_id: user.id
        });
        return data;
    }

    // ── Leaderboard ──
    async function getLeaderboard(period) {
        const { data } = await getSb().rpc('get_leaderboard_v2', {
            p_period: period || 'week',
            p_limit: 20
        });
        return data || [];
    }

    // ── Banners ──
    // page: "dashboard"|"leaks"|"training"|"reports"|"profile" — يفلتر حسب target_pages
    async function getActiveBanners(page) {
        const { data } = await getSb()
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        const all = data || [];
        if (!page) return all;
        return all.filter(b => {
            const targets = Array.isArray(b.target_pages) ? b.target_pages : ['dashboard'];
            return targets.includes('all') || targets.includes(page);
        });
    }

    // حقن ticker عام في أعلى أي صفحة v2 (عدا dashboard الذي له ticker خاص)
    async function injectGlobalTicker(page) {
        try {
            if (document.getElementById('globalTicker')) return;
            const banners = await getActiveBanners(page);
            const ticker = banners.find(b => b.banner_type === 'ticker');
            if (!ticker || !ticker.config) return;
            const cfg = ticker.config;
            const bg = cfg.bg_color || '#6D5DF6';
            const color = cfg.text_color || '#ffffff';
            const kwColor = cfg.keyword_color || '#FF6B35';
            const kw = cfg.keyword || '';
            const text = cfg.text || '';
            const speed = cfg.speed || 50;
            const dur = Math.max(5, 50 - speed / 2);
            const escape = (s) => { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; };
            const content = (kw ? '<span style="font-weight:700;margin-left:6px;color:' + kwColor + '">' + escape(kw) + '</span>' : '') + escape(text);
            const style = document.createElement('style');
            style.textContent = '@keyframes madarek-tick{from{transform:translateX(-50%)}to{transform:translateX(0)}}';
            document.head.appendChild(style);
            const el = document.createElement('div');
            el.id = 'globalTicker';
            el.style.cssText = 'background:' + bg + ';color:' + color + ';font-size:12px;font-weight:600;padding:7px 0;overflow:hidden;white-space:nowrap;position:sticky;top:0;z-index:60';
            el.innerHTML = '<span style="display:inline-block;animation:madarek-tick ' + dur + 's linear infinite;padding-right:60px">' + content + '&nbsp;&nbsp;&nbsp;&nbsp;' + content + '</span>';
            // Insert at very top of wrap if exists, else body
            const wrap = document.querySelector('.wrap');
            if (wrap) wrap.insertBefore(el, wrap.firstChild);
            else document.body.insertBefore(el, document.body.firstChild);
        } catch(e) { console.warn('ticker inject failed', e); }
    }

    // ── Tips ──
    async function getTips() {
        const { data } = await getSb()
            .from('tips')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        return data || [];
    }

    // ── Notifications ──
    async function getNotifications(limit) {
        const user = await getUser();
        if (!user) return [];
        const { data } = await getSb()
            .from('user_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit || 20);
        return data || [];
    }

    async function getUnreadCount() {
        const user = await getUser();
        if (!user) return 0;
        const { count } = await getSb()
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        return count || 0;
    }

    async function markNotificationRead(notifId) {
        await getSb()
            .from('user_notifications')
            .update({ is_read: true })
            .eq('id', notifId);
    }

    // ── Plans ──
    async function getPlans() {
        const { data } = await getSb()
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');
        return data || [];
    }

    // ── Dark Mode ──
    function initDarkMode() {
        const saved = localStorage.getItem('madarek_dark_mode');
        if (saved === 'true') {
            document.documentElement.classList.add('dark');
        }
    }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('madarek_dark_mode', isDark);
        // حفظ في الملف الشخصي (بدون انتظار)
        getUser().then(user => {
            if (user) {
                getSb().from('profiles').update({ dark_mode: isDark }).eq('id', user.id);
            }
        });
        return isDark;
    }

    // ── Toast Notifications ──
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#6D5DF6',
            warning: '#f59e0b'
        };
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 24px;border-radius:12px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:all 0.3s;opacity:0;font-family:"IBM Plex Sans Arabic",sans-serif;max-width:90%;text-align:center;';
        toast.style.background = colors[type] || colors.info;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ── Formatting ──
    function formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return '—';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'الآن';
        if (mins < 60) return 'قبل ' + mins + ' دقيقة';
        const hours = Math.floor(mins / 60);
        if (hours < 24) return 'قبل ' + hours + ' ساعة';
        const days = Math.floor(hours / 24);
        if (days < 7) return 'قبل ' + days + ' يوم';
        return formatDate(dateStr);
    }

    function numberWithCommas(x) {
        if (x == null) return '0';
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // ── Activity Logging ──
    async function logActivity(action, description, metadata) {
        const user = await getUser();
        getSb().rpc('log_activity', {
            p_user_id: user?.id || null,
            p_action: action,
            p_description: description || null,
            p_metadata: metadata || {}
        }).then().catch(() => {});
    }

    // ── Expose API ──
    window.MadarekV2 = {
        // Core
        getSb,
        getUser,
        getProfile,
        requireAuth,
        requireAdmin,
        onAuthChange,
        signOut,

        // Subscription
        isSubscribed,
        subscriptionDaysLeft,

        // Gamification
        addXP,
        XP_REWARDS,
        updateStreak,
        checkAchievements,

        // Data
        getHomeStats,
        getUserLeaks,
        saveQuestion,
        unsaveQuestion,
        getSavedQuestions,
        getReferralStats,
        getLeaderboard,
        getActiveBanners,
        injectGlobalTicker,
        getTips,
        getNotifications,
        getUnreadCount,
        markNotificationRead,
        getPlans,

        // UI
        initDarkMode,
        toggleDarkMode,
        showToast,

        // Formatting
        formatDate,
        formatTimeAgo,
        numberWithCommas,

        // Logging
        logActivity
    };

    // Auto-init dark mode
    initDarkMode();
})();
