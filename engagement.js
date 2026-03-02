/* ═══════════════════════════════════════
   🎯 مدارك النخبة — نظام التفاعل الذكي
   يعرض رسائل تحفيزية للزوار
═══════════════════════════════════════ */
(function(){
    // ─── إعدادات ───
    var VISIT_KEY = 'madarek_visits';
    var LAST_POPUP = 'madarek_last_popup';
    var POPUP_COOLDOWN = 300000; // 5 دقائق بين كل بوب أب

    // ─── حالة الزائر ───
    var isLoggedIn = false;
    try {
        var session = JSON.parse(localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token') || '{}');
        isLoggedIn = !!(session && session.user);
    } catch(e){}

    var visits = parseInt(localStorage.getItem(VISIT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_KEY, visits);
    var currentPage = location.pathname.replace(/\.html$/,'').replace(/^\//,'') || 'index';

    // ─── الرسائل التحفيزية ───
    var messages = {
        // زائر جديد أول مرة
        firstVisit: {
            emoji: '👋',
            title: 'أهلاً فيك في مدارك النخبة!',
            text: 'جرّب حل سؤال مجاني وشف مستواك',
            btn: 'جرّب الحين',
            link: 'select-section.html',
            color: '#6366f1'
        },
        // زائر رجع بدون حساب
        returnVisitor: {
            emoji: '🔥',
            title: 'حياك مرة ثانية!',
            text: 'سجّل حساب مجاني وتابع تقدّمك',
            btn: 'سجّل مجاناً',
            link: 'register.html',
            color: '#10b981'
        },
        // في صفحة الأسعار
        pricing: {
            emoji: '🎁',
            title: 'عندنا عرض حصري!',
            text: 'استخدم كوبون RAMADAN26 واحصل على شهر كامل مجاناً',
            btn: 'استخدم الكوبون',
            link: null,
            color: '#f59e0b'
        },
        // بعد فترة بدون تفاعل (idle)
        idle: [
            { emoji: '💪', title: 'كل سؤال يقرّبك من درجتك', text: 'ابدأ التدريب الحين — الوقت ما ينتظر!', color: '#8b5cf6' },
            { emoji: '🎯', title: 'الدرجة العالية تبدأ من هنا', text: 'آلاف الأسئلة مع شرح تفصيلي', color: '#6366f1' },
            { emoji: '⚡', title: 'تدري إن 10 دقائق يومياً تكفي؟', text: 'التدريب المستمر سر التفوق', color: '#10b981' },
            { emoji: '🏆', title: 'منافسيك يتدربون الحين!', text: 'لا تخليهم يسبقونك — ابدأ تدريبك', color: '#ef4444' }
        ],
        // مسجّل بس ما يتدرب
        loggedIdle: {
            emoji: '🔥',
            title: 'لا تكسر سلسلتك!',
            text: 'تدرّب اليوم وحافظ على الاستمرارية',
            btn: 'ابدأ التدريب',
            link: 'select-section.html',
            color: '#f59e0b'
        }
    };

    // ─── إنشاء البوب أب ───
    function showPopup(msg){
        // تحقق من الكولداون
        var lastPopup = parseInt(localStorage.getItem(LAST_POPUP) || '0');
        if(Date.now() - lastPopup < POPUP_COOLDOWN) return;
        localStorage.setItem(LAST_POPUP, Date.now());

        var overlay = document.createElement('div');
        overlay.id = 'engage-popup';
        overlay.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:9998;max-width:380px;width:calc(100% - 48px);animation:engSlideUp .5s ease';

        var card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#1a1145,#1e1550);border:1.5px solid ' + msg.color + '33;border-radius:20px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.5);position:relative';

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.1);border:none;color:rgba(255,255,255,0.5);width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center';
        closeBtn.onclick = function(){ overlay.remove(); };

        var emojiEl = document.createElement('div');
        emojiEl.textContent = msg.emoji;
        emojiEl.style.cssText = 'font-size:44px;margin-bottom:12px';

        var titleEl = document.createElement('div');
        titleEl.textContent = msg.title;
        titleEl.style.cssText = 'font-family:Cairo,sans-serif;font-size:20px;font-weight:900;color:#fff;margin-bottom:6px';

        var textEl = document.createElement('div');
        textEl.textContent = msg.text;
        textEl.style.cssText = 'font-size:15px;color:rgba(196,181,253,0.6);line-height:1.6;margin-bottom:16px';

        card.appendChild(closeBtn);
        card.appendChild(emojiEl);
        card.appendChild(titleEl);
        card.appendChild(textEl);

        if(msg.btn){
            var btnEl = document.createElement('a');
            btnEl.textContent = msg.btn;
            btnEl.href = msg.link || '#';
            btnEl.style.cssText = 'display:inline-block;background:' + msg.color + ';padding:12px 28px;border-radius:14px;font-size:16px;font-weight:800;color:#fff;text-decoration:none;transition:transform .2s';
            if(!msg.link){
                btnEl.onclick = function(e){ e.preventDefault(); overlay.remove(); };
            }
            card.appendChild(btnEl);
        }

        overlay.appendChild(card);

        // أضف الأنيميشن
        if(!document.getElementById('engage-style')){
            var style = document.createElement('style');
            style.id = 'engage-style';
            style.textContent = '@keyframes engSlideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}';
            document.head.appendChild(style);
        }

        // أزل أي بوب أب سابق
        var old = document.getElementById('engage-popup');
        if(old) old.remove();

        document.body.appendChild(overlay);

        // أخفيه بعد 12 ثانية
        setTimeout(function(){
            if(overlay.parentNode){
                overlay.style.transition = 'opacity .4s, transform .4s';
                overlay.style.opacity = '0';
                overlay.style.transform = 'translateY(20px)';
                setTimeout(function(){ overlay.remove(); }, 400);
            }
        }, 12000);
    }

    // ─── المنطق الذكي ───

    // لا تعرض بوب أبات في صفحات الأدمن
    if(currentPage.indexOf('admin') !== -1) return;

    // 1️⃣ زائر أول مرة (بدون حساب)
    if(visits === 1 && !isLoggedIn){
        setTimeout(function(){ showPopup(messages.firstVisit); }, 5000);
        return;
    }

    // 2️⃣ زائر راجع بدون حساب
    if(visits > 2 && !isLoggedIn && currentPage !== 'login' && currentPage !== 'register'){
        setTimeout(function(){ showPopup(messages.returnVisitor); }, 8000);
        return;
    }

    // 3️⃣ في صفحة الأسعار
    if(currentPage === 'pricing' || currentPage === 'pricing'){
        setTimeout(function(){ showPopup(messages.pricing); }, 15000);
        return;
    }

    // 4️⃣ مسجّل بس idle
    if(isLoggedIn && (currentPage === 'dashboard' || currentPage === 'index')){
        setTimeout(function(){ showPopup(messages.loggedIdle); }, 30000);
        return;
    }

    // 5️⃣ idle عام — رسالة تحفيزية عشوائية بعد 45 ثانية
    if(!isLoggedIn){
        setTimeout(function(){
            var randomMsg = messages.idle[Math.floor(Math.random() * messages.idle.length)];
            randomMsg.btn = 'ابدأ الحين';
            randomMsg.link = 'select-section.html';
            showPopup(randomMsg);
        }, 45000);
    }

})();
