/* ═══════════════════════════════════════
   🎯 مدارك النخبة — نظام التفاعل الذكي v2
   شريط أنيق مع كوبون + تتبع + تحويل
═══════════════════════════════════════ */
(function(){
  'use strict';

  var SB_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

  var VISIT_KEY = 'madarek_visits';
  var LAST_POPUP = 'madarek_last_popup';
  var POPUP_CLOSED = 'madarek_engage_closed';

  // ─── حالة الزائر ───
  var isLoggedIn = false;
  var userId = null;
  try {
    var session = JSON.parse(localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token') || '{}');
    if(session && session.user){
      isLoggedIn = true;
      userId = session.user.id;
    }
  } catch(e){}

  var visits = parseInt(localStorage.getItem(VISIT_KEY) || '0') + 1;
  localStorage.setItem(VISIT_KEY, visits);
  var currentPage = location.pathname.replace(/\.html$/,'').replace(/^\//,'') || 'index';

  // لا تعرض في صفحات الأدمن أو الكولباك
  if(currentPage.indexOf('admin') !== -1 || currentPage.indexOf('callback') !== -1) return;

  // ─── الرسائل الافتراضية (fallback لو ما فيه إعدادات) ───
  var defaultMessages = {
    firstVisit: { emoji: '👋', text: 'أهلاً فيك! جرّب حل سؤال مجاني وشف مستواك', btn: 'جرّب الحين', link: 'select-section.html', color: '#6366f1' },
    returnVisitor: { emoji: '🔥', text: 'حياك مرة ثانية! سجّل حساب مجاني وتابع تقدّمك', btn: 'سجّل مجاناً', link: 'register.html', color: '#10b981' },
    pricing: { emoji: '🎁', text: 'عرض حصري! استخدم كوبون RAMADAN26 واحصل على شهر مجاناً', coupon: 'RAMADAN26', color: '#f59e0b' },
    loggedIdle: { emoji: '📚', text: 'الاختبار يحتاج ممارسة مستمرة — حل أسئلة اليوم وطوّر مستواك!', btn: 'تدرّب الحين', link: 'select-section.html', color: '#6366f1' },
    idle: [
      { emoji: '📝', text: 'الممارسة العملية أقوى طريقة للاستعداد — جرّب تحل سؤال الحين!', color: '#8b5cf6' },
      { emoji: '🎯', text: 'الاختبار قريب! كل سؤال تحله يزيد فرصتك — ابدأ تمرينك', color: '#6366f1' },
      { emoji: '⚡', text: 'التكرار سر التفوق — 10 دقائق يومياً تصنع فرق كبير!', color: '#10b981' },
      { emoji: '🧠', text: 'اعرف نقاط ضعفك قبل الاختبار — حل أسئلة متنوعة وشف تحليلك', color: '#f59e0b' },
      { emoji: '🏆', text: 'أفضل الطلاب يتمرنون يومياً — ابدأ رحلتك للدرجة الكاملة!', color: '#ef4444' }
    ]
  };

  // ─── جلب إعدادات البوب أب من Supabase ───
  async function fetchEngageSettings(){
    try {
      var resp = await fetch(SB_URL + '/rest/v1/site_settings?select=key,value&key=like.engage_*', {
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
      });
      if(!resp.ok) return null;
      var data = await resp.json();
      if(!data || data.length === 0) return null;
      var map = {};
      data.forEach(function(r){ map[r.key] = r.value || ''; });
      return map;
    } catch(e){ return null; }
  }

  // ─── تتبع أحداث الكوبون ───
  function trackCouponEvent(code, eventType){
    try {
      var body = { coupon_code: code.toUpperCase(), event_type: eventType, source: 'popup', page: currentPage };
      if(userId) body.user_id = userId;
      fetch(SB_URL + '/rest/v1/coupon_events', {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
      });
    } catch(e){}
  }

  // ─── نسخ الكوبون + التحويل ───
  function copyCoupon(code, btnEl, link){
    navigator.clipboard.writeText(code).then(function(){
      // تغيير الأيقون لعلامة صح
      btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      trackCouponEvent(code, 'copy');

      // بعد ثانية يتحول لصفحة الأسعار
      setTimeout(function(){
        var targetLink = link || 'pricing.html';
        if(!isLoggedIn && targetLink.indexOf('pricing') !== -1){
          // مو مسجّل → يروح التسجيل أولاً ثم الأسعار
          window.location.href = 'register.html?redirect=pricing&coupon=' + encodeURIComponent(code);
        } else {
          window.location.href = targetLink + (targetLink.indexOf('?') === -1 ? '?' : '&') + 'coupon=' + encodeURIComponent(code);
        }
      }, 800);
    }).catch(function(){
      // fallback لو clipboard ما اشتغل
      var input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      trackCouponEvent(code, 'copy');
      setTimeout(function(){
        var targetLink = link || 'pricing.html';
        if(!isLoggedIn && targetLink.indexOf('pricing') !== -1){
          window.location.href = 'register.html?redirect=pricing&coupon=' + encodeURIComponent(code);
        } else {
          window.location.href = targetLink + (targetLink.indexOf('?') === -1 ? '?' : '&') + 'coupon=' + encodeURIComponent(code);
        }
      }, 800);
    });
  }

  // ─── إنشاء البوب أب الأنيق ───
  function showPopup(msg){
    // تحقق من الكولداون
    var cooldown = (msg._cooldown || 5) * 60000;
    var lastPopup = parseInt(localStorage.getItem(LAST_POPUP) || '0');
    if(Date.now() - lastPopup < cooldown) return;

    // تحقق إذا أغلقه قبل (كوكي الجلسة)
    var closedKey = POPUP_CLOSED + '_' + (msg.coupon || 'default');
    if(sessionStorage.getItem(closedKey)) return;

    localStorage.setItem(LAST_POPUP, Date.now());

    var color = msg.color || '#6366f1';
    var autoHide = (msg._autoHide || 15) * 1000;

    // تتبع المشاهدة
    if(msg.coupon) trackCouponEvent(msg.coupon, 'view');

    // ─── إنشاء CSS ───
    if(!document.getElementById('engage-style-v2')){
      var style = document.createElement('style');
      style.id = 'engage-style-v2';
      style.textContent = [
        '@keyframes engSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
        '@keyframes engGlow{0%{box-shadow:0 0 12px var(--eng-glow,#6366f1)15,0 4px 16px rgba(0,0,0,0.3)}100%{box-shadow:0 0 28px var(--eng-glow,#6366f1)30,0 4px 16px rgba(0,0,0,0.3)}}',
        '#engage-bar{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9997;max-width:560px;width:calc(100% - 32px);animation:engSlideIn .5s ease;direction:rtl;font-family:Tajawal,sans-serif}',
        '#engage-bar .eng-card{background:rgba(15,10,46,0.95);backdrop-filter:blur(16px);border-radius:16px;padding:14px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1.5px solid transparent;background-image:linear-gradient(rgba(15,10,46,0.95),rgba(15,10,46,0.95)),linear-gradient(135deg,var(--eng-glow)55,var(--eng-glow)15,var(--eng-glow)55);background-origin:border-box;background-clip:padding-box,border-box;animation:engGlow 2s ease-in-out infinite alternate}',
        '#engage-bar .eng-emoji{font-size:28px;flex-shrink:0;line-height:1}',
        '#engage-bar .eng-text{flex:1;min-width:0;font-size:14px;color:rgba(255,255,255,0.9);font-weight:500;line-height:1.5}',
        '#engage-bar .eng-coupon{display:flex;align-items:center;gap:6px;flex-shrink:0}',
        '#engage-bar .eng-code{background:rgba(255,255,255,0.08);border:1px dashed var(--eng-glow);border-radius:10px;padding:6px 14px;font-family:monospace;font-weight:900;font-size:14px;color:var(--eng-glow);letter-spacing:1.5px;direction:ltr;user-select:all}',
        '#engage-bar .eng-copy{background:var(--eng-glow);border:none;border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s,opacity .2s;flex-shrink:0}',
        '#engage-bar .eng-copy:hover{transform:scale(1.1);opacity:0.9}',
        '#engage-bar .eng-btn{background:var(--eng-glow);color:#fff;border:none;padding:8px 20px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;transition:transform .2s;white-space:nowrap;font-family:Tajawal,sans-serif}',
        '#engage-bar .eng-btn:hover{transform:scale(1.05)}',
        '#engage-bar .eng-close{position:absolute;top:-8px;left:-8px;background:rgba(30,21,80,0.9);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);width:24px;height:24px;border-radius:50%;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:color .2s}',
        '#engage-bar .eng-close:hover{color:#fff}',
        '@media(max-width:640px){#engage-bar{bottom:72px;max-width:none}#engage-bar .eng-card{padding:12px 14px;gap:8px}#engage-bar .eng-text{font-size:13px;min-width:100%}#engage-bar .eng-coupon{width:100%;justify-content:center}}'
      ].join('\n');
      document.head.appendChild(style);
    }

    // ─── إنشاء العناصر ───
    var old = document.getElementById('engage-bar');
    if(old) old.remove();

    var container = document.createElement('div');
    container.id = 'engage-bar';
    container.style.setProperty('--eng-glow', color);

    var card = document.createElement('div');
    card.className = 'eng-card';
    card.style.position = 'relative';

    // زر الإغلاق
    var closeBtn = document.createElement('button');
    closeBtn.className = 'eng-close';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = function(){
      container.style.transition = 'opacity .4s, transform .4s';
      container.style.opacity = '0';
      container.style.transform = 'translateX(-50%) translateY(20px)';
      sessionStorage.setItem(closedKey, '1');
      setTimeout(function(){ container.remove(); }, 400);
    };
    card.appendChild(closeBtn);

    // الإيموجي
    var emoji = document.createElement('span');
    emoji.className = 'eng-emoji';
    emoji.textContent = msg.emoji || '🎁';
    card.appendChild(emoji);

    // النص
    var text = document.createElement('span');
    text.className = 'eng-text';
    text.textContent = msg.text;
    card.appendChild(text);

    // الكوبون (لو فيه)
    if(msg.coupon){
      var couponWrap = document.createElement('div');
      couponWrap.className = 'eng-coupon';

      var codeEl = document.createElement('span');
      codeEl.className = 'eng-code';
      codeEl.textContent = msg.coupon;
      couponWrap.appendChild(codeEl);

      var copyBtn = document.createElement('button');
      copyBtn.className = 'eng-copy';
      copyBtn.title = 'انسخ الكوبون';
      copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copyBtn.onclick = function(){ copyCoupon(msg.coupon, copyBtn, msg.link); };
      couponWrap.appendChild(copyBtn);

      card.appendChild(couponWrap);
    }
    // زر عادي (بدون كوبون)
    else if(msg.btn){
      var btnEl = document.createElement('a');
      btnEl.className = 'eng-btn';
      btnEl.textContent = msg.btn;
      btnEl.href = msg.link || '#';
      if(!msg.link){
        btnEl.onclick = function(e){ e.preventDefault(); closeBtn.click(); };
      }
      card.appendChild(btnEl);
    }

    container.appendChild(card);
    document.body.appendChild(container);

    // إخفاء تلقائي
    setTimeout(function(){
      if(container.parentNode){
        container.style.transition = 'opacity .4s, transform .4s';
        container.style.opacity = '0';
        container.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(function(){ container.remove(); }, 400);
      }
    }, autoHide);
  }

  // ─── تحديد الرسالة بناءً على حالة الزائر (fallback) ───
  function getDefaultMessage(){
    // 1️⃣ زائر أول مرة
    if(visits === 1 && !isLoggedIn){
      return { msg: defaultMessages.firstVisit, delay: 5000 };
    }
    // 2️⃣ صفحة الأسعار
    if(currentPage === 'pricing'){
      return { msg: defaultMessages.pricing, delay: 10000 };
    }
    // 3️⃣ زائر راجع بدون حساب
    if(visits > 2 && !isLoggedIn && currentPage !== 'login' && currentPage !== 'register'){
      return { msg: defaultMessages.returnVisitor, delay: 8000 };
    }
    // 4️⃣ مسجّل idle
    if(isLoggedIn && (currentPage === 'dashboard' || currentPage === 'index')){
      return { msg: defaultMessages.loggedIdle, delay: 30000 };
    }
    // 5️⃣ idle عام
    if(!isLoggedIn){
      var randomMsg = defaultMessages.idle[Math.floor(Math.random() * defaultMessages.idle.length)];
      randomMsg.btn = 'ابدأ الحين';
      randomMsg.link = 'select-section.html';
      return { msg: randomMsg, delay: 45000 };
    }
    return null;
  }

  // ─── البدء ───
  async function init(){
    var settings = await fetchEngageSettings();

    // لو فيه إعدادات من الأدمن
    if(settings && settings.engage_mode && settings.engage_mode !== 'off'){
      // تحقق من الفترة الزمنية
      if(settings.engage_mode === 'range'){
        var now = new Date();
        if(settings.engage_from && new Date(settings.engage_from) > now) return;
        if(settings.engage_to && new Date(settings.engage_to) < now) return;
      }

      // تحقق من الصفحات المستهدفة
      var pages = settings.engage_pages || 'all';
      if(pages !== 'all' && pages.indexOf(currentPage) === -1) return;

      // تحقق من الجمهور المستهدف
      var target = settings.engage_target || 'all';
      if(target === 'visitors' && isLoggedIn) return;
      if(target === 'logged' && !isLoggedIn) return;

      // بناء الرسالة
      var adminMsg = {
        emoji: settings.engage_emoji || '🎁',
        text: settings.engage_text || '',
        color: settings.engage_color || '#f59e0b',
        _cooldown: parseInt(settings.engage_cooldown) || 5,
        _autoHide: parseInt(settings.engage_auto_hide) || 15
      };

      // الكوبون
      if(settings.engage_coupon_enabled === 'true' && settings.engage_coupon_code){
        adminMsg.coupon = settings.engage_coupon_code.toUpperCase();
        adminMsg.link = settings.engage_btn_link || 'pricing.html';
      }
      // زر عادي (بدون كوبون)
      else if(settings.engage_btn_text){
        adminMsg.btn = settings.engage_btn_text;
        adminMsg.link = settings.engage_btn_link || null;
      }

      var delay = (parseInt(settings.engage_delay) || 10) * 1000;
      setTimeout(function(){ showPopup(adminMsg); }, delay);

    } else {
      // fallback: الرسائل الافتراضية
      var def = getDefaultMessage();
      if(def){
        def.msg._cooldown = 5;
        def.msg._autoHide = 12;
        setTimeout(function(){ showPopup(def.msg); }, def.delay);
      }
    }
  }

  // انتظر تحميل الصفحة
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
