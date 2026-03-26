// ══════════════════════════════════════════════════════════
//  session-keeper.js — مدارك النخبة v2
//  يحافظ على جلسة المستخدم نشطة ويجدّد التوكن تلقائياً
//  + نسخة احتياطية مزدوجة (localStorage + sessionStorage)
//  + تجديد عند العودة من الخلفية + كل 4 دقائق
// ══════════════════════════════════════════════════════════
(function(){
    var _sk_client = null;
    var BACKUP_KEY = 'madarek_session_backup';
    var BACKUP_KEY_2 = 'madarek_sb_tokens'; // نسخة ثانية للأمان

    function getSB(){
        if(_sk_client) return _sk_client;
        if(window.sb) return window.sb;
        if(window.SB) return window.SB;
        if(window._sbClient) return window._sbClient;
        if(window.supabase && window.supabase.createClient){
            _sk_client = window.supabase.createClient(
                'https://czzcmbxejxbotjemyuqf.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0',
                { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit', storageKey: 'sb-czzcmbxejxbotjemyuqf-auth-token' } }
            );
            return _sk_client;
        }
        return null;
    }

    // ── حفظ نسخة احتياطية مزدوجة ──
    function backupSession(session){
        if(!session) return;
        try {
            var data = JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                ts: Date.now()
            });
            localStorage.setItem(BACKUP_KEY, data);
            localStorage.setItem(BACKUP_KEY_2, data);
            // نسخة في sessionStorage كمان (تعيش طول ما التبويب مفتوح)
            try { sessionStorage.setItem(BACKUP_KEY, data); } catch(e){}
        } catch(e){}
    }

    // ── قراءة أفضل نسخة احتياطية متوفرة ──
    function getBestBackup(){
        var sources = [
            localStorage.getItem(BACKUP_KEY),
            localStorage.getItem(BACKUP_KEY_2),
            sessionStorage.getItem(BACKUP_KEY)
        ];
        var best = null;
        for(var i=0; i<sources.length; i++){
            if(!sources[i]) continue;
            try {
                var parsed = JSON.parse(sources[i]);
                if(parsed.refresh_token && (!best || parsed.ts > best.ts)){
                    best = parsed;
                }
            } catch(e){}
        }
        return best;
    }

    // ── استرجاع الجلسة ──
    window._madarekRestoreSession = async function(client){
        if(!client || !client.auth) return null;
        try {
            // 1. جرّب getSession العادي
            var res = await client.auth.getSession();
            if(res.data && res.data.session){
                backupSession(res.data.session);
                return res.data.session;
            }

            // 2. جرّب refreshSession مباشرة (أحياناً getSession يفشل لكن الـ refresh token ممتاز)
            try {
                var refreshRes = await client.auth.refreshSession();
                if(refreshRes.data && refreshRes.data.session){
                    backupSession(refreshRes.data.session);
                    return refreshRes.data.session;
                }
            } catch(e){}

            // 3. جرّب النسخة الاحتياطية
            var backup = getBestBackup();
            if(!backup) return null;

            // تأكد إن النسخة ما مرّ عليها أكثر من 30 يوم
            if(Date.now() - backup.ts > 30 * 24 * 60 * 60 * 1000){
                localStorage.removeItem(BACKUP_KEY);
                localStorage.removeItem(BACKUP_KEY_2);
                return null;
            }

            if(backup.refresh_token){
                var setRes = await client.auth.setSession({
                    access_token: backup.access_token,
                    refresh_token: backup.refresh_token
                });
                if(setRes.data && setRes.data.session){
                    backupSession(setRes.data.session);
                    return setRes.data.session;
                }
            }
            return null;
        } catch(e){ return null; }
    };

    // تجديد الجلسة
    async function refreshSession(){
        var client = getSB();
        if(!client || !client.auth) return;
        try {
            var res = await client.auth.getSession();
            if(res.data && res.data.session){
                // لو التوكن يقارب على الانتهاء (أقل من 5 دقائق)
                var expiresAt = res.data.session.expires_at;
                var now = Math.floor(Date.now()/1000);
                if(!expiresAt || (expiresAt - now) < 300){
                    await client.auth.refreshSession();
                }
                var newRes = await client.auth.getSession();
                if(newRes.data && newRes.data.session){
                    backupSession(newRes.data.session);
                }
            }
        } catch(e){}
    }

    // ── تجديد لما المستخدم يرجع للتبويب/التطبيق ──
    document.addEventListener('visibilitychange', function(){
        if(document.visibilityState === 'visible'){
            refreshSession();
        }
    });

    // ── تجديد لما التطبيق يرجع من الخلفية (Capacitor) ──
    document.addEventListener('resume', function(){
        refreshSession();
    });

    // ── تسمع لأحداث المصادقة وتحفظ فوراً ──
    setTimeout(function(){
        var client = getSB();
        if(client && client.auth){
            client.auth.onAuthStateChange(function(event, session){
                if(session){
                    backupSession(session);
                }
            });
        }
    }, 500);

    // ── تجديد دوري كل 4 دقائق ──
    setInterval(refreshSession, 4 * 60 * 1000);

    // ── عند تحميل الصفحة — احفظ نسخة لو فيه جلسة ──
    setTimeout(function(){
        var client = getSB();
        if(client && client.auth){
            client.auth.getSession().then(function(res){
                if(res.data && res.data.session){
                    backupSession(res.data.session);
                }
            }).catch(function(){});
        }
    }, 1000);
})();
