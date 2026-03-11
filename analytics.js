/* ═══════════════════════════════════════
   📊 مدارك النخبة — نظام التتبع
   يُحمّل في كل الصفحات
═══════════════════════════════════════ */
(function(){
    var SB_URL  = 'https://czzcmbxejxbotjemyuqf.supabase.co';
    var SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

    // Anonymous ID (ثابت للزائر بدون حساب)
    var anonId = localStorage.getItem('madarek_anon_id');
    if(!anonId){
        anonId = 'anon_' + Math.random().toString(36).substr(2,12) + '_' + Date.now().toString(36);
        localStorage.setItem('madarek_anon_id', anonId);
    }

    // نوع الجهاز (تطبيق / متصفح جوال / كمبيوتر)
    var ua = navigator.userAgent;
    var isApp = window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1 && ua.indexOf('Chrome') === -1);
    var device = isApp ? 'app' : /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';

    // ─── إرسال الحدث لـ Supabase ───
    function trackEvent(eventType, metadata){
        var userId = null;
        try {
            var session = JSON.parse(localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token') || '{}');
            if(session && session.user) userId = session.user.id;
        } catch(e){}

        var body = {
            user_id: userId,
            anonymous_id: userId ? null : anonId,
            event_type: eventType,
            page_path: location.pathname.replace(/\.html$/,'') || '/',
            metadata: metadata || {},
            device: device
        };

        // إرسال بـ fetch بدون انتظار
        fetch(SB_URL + '/rest/v1/analytics_events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(body)
        }).catch(function(){});
    }

    // ─── تحديث آخر ظهور ───
    function updateLastSeen(){
        try {
            var session = JSON.parse(localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token') || '{}');
            if(session && session.user){
                fetch(SB_URL + '/rest/v1/profiles?id=eq.' + session.user.id, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SB_KEY,
                        'Authorization': 'Bearer ' + (session.access_token || SB_KEY),
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ last_seen_at: new Date().toISOString() })
                }).catch(function(){});
            }
        } catch(e){}
    }

    // ─── تتبع زيارة الصفحة ───
    trackEvent('page_view', { referrer: document.referrer || null, title: document.title });

    // ─── تحديث آخر ظهور كل 2 دقيقة ───
    updateLastSeen();
    setInterval(updateLastSeen, 120000);

    // ─── تتبع الوقت على الصفحة ───
    var startTime = Date.now();
    window.addEventListener('beforeunload', function(){
        var timeSpent = Math.round((Date.now() - startTime) / 1000);
        if(timeSpent > 3){
            trackEvent('page_exit', { time_spent_seconds: timeSpent });
        }
    });

    // ─── API للاستخدام من صفحات أخرى ───
    window.MadarekAnalytics = {
        track: trackEvent,
        getAnonId: function(){ return anonId; },
        getDevice: function(){ return device; }
    };

})();
