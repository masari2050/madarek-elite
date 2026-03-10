// ══════════════════════════════════════════════════════════
//  session-keeper.js — مدارك النخبة
//  يحافظ على جلسة المستخدم نشطة ويجدّد التوكن تلقائياً
// ══════════════════════════════════════════════════════════
(function(){
    var _sk_client = null;

    // إنشاء/جلب Supabase client للتجديد
    function getSB(){
        if(_sk_client) return _sk_client;
        // جرّب الـ client الموجود أولاً
        if(window.sb) return window.sb;
        if(window.SB) return window.SB;
        if(window._sbClient) return window._sbClient;
        // أنشئ client جديد (يشارك نفس التوكن في localStorage)
        if(window.supabase && window.supabase.createClient){
            _sk_client = window.supabase.createClient(
                'https://czzcmbxejxbotjemyuqf.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0'
            );
            return _sk_client;
        }
        return null;
    }

    // تجديد الجلسة
    async function refreshSession(){
        var client = getSB();
        if(!client || !client.auth) return;
        try {
            var res = await client.auth.getSession();
            if(res.data && res.data.session){
                await client.auth.refreshSession();
            }
        } catch(e){}
    }

    // ── 1. تجديد لما المستخدم يرجع للتبويب/التطبيق ──
    document.addEventListener('visibilitychange', function(){
        if(document.visibilityState === 'visible'){
            refreshSession();
        }
    });

    // ── 2. تجديد لما التطبيق يرجع من الخلفية (Capacitor) ──
    document.addEventListener('resume', function(){
        refreshSession();
    });

    // ── 3. تجديد دوري كل 10 دقائق ──
    setInterval(refreshSession, 10 * 60 * 1000);
})();
