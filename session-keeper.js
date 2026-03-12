// ══════════════════════════════════════════════════════════
//  session-keeper.js — مدارك النخبة
//  يحافظ على جلسة المستخدم نشطة ويجدّد التوكن تلقائياً
//  + نسخة احتياطية للجلسة (يحل مشكلة التطبيق)
// ══════════════════════════════════════════════════════════
(function(){
    var _sk_client = null;
    var BACKUP_KEY = 'madarek_session_backup';

    function getSB(){
        if(_sk_client) return _sk_client;
        if(window.sb) return window.sb;
        if(window.SB) return window.SB;
        if(window._sbClient) return window._sbClient;
        if(window.supabase && window.supabase.createClient){
            _sk_client = window.supabase.createClient(
                'https://czzcmbxejxbotjemyuqf.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0'
            );
            return _sk_client;
        }
        return null;
    }

    // ── حفظ نسخة احتياطية من الجلسة ──
    function backupSession(session){
        if(!session) return;
        try {
            localStorage.setItem(BACKUP_KEY, JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                ts: Date.now()
            }));
        } catch(e){}
    }

    // ── استرجاع الجلسة من النسخة الاحتياطية ──
    window._madarekRestoreSession = async function(client){
        if(!client || !client.auth) return null;
        try {
            // أولاً جرّب getSession العادي
            var res = await client.auth.getSession();
            if(res.data && res.data.session){
                backupSession(res.data.session);
                return res.data.session;
            }
            // لو ما لقى — جرّب النسخة الاحتياطية
            var raw = localStorage.getItem(BACKUP_KEY);
            if(!raw) return null;
            var backup = JSON.parse(raw);
            // تأكد إن النسخة ما مرّ عليها أكثر من 7 أيام
            if(Date.now() - backup.ts > 7 * 24 * 60 * 60 * 1000){
                localStorage.removeItem(BACKUP_KEY);
                return null;
            }
            if(backup.refresh_token){
                var refreshRes = await client.auth.setSession({
                    access_token: backup.access_token,
                    refresh_token: backup.refresh_token
                });
                if(refreshRes.data && refreshRes.data.session){
                    backupSession(refreshRes.data.session);
                    return refreshRes.data.session;
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
                await client.auth.refreshSession();
                // حدّث النسخة الاحتياطية
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

    // ── تجديد دوري كل 10 دقائق ──
    setInterval(refreshSession, 10 * 60 * 1000);

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
