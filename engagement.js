/* ═══════════════════════════════════════
   🎯 مدارك النخبة — نظام التفاعل الذكي v3
   بطاقة أنيقة مع حدود متوهجة + كوبون + تتبع
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
    pricing: { emoji: '🎁', text: 'عرض حصري! استخدم الكوبون واحصل على خصم مميز', coupon: 'RAMADAN26', color: '#f59e0b' },
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
      btnEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      btnEl.style.background = 'rgba(52,211,153,0.2)';
      trackCouponEvent(code, 'copy');
      setTimeout(function(){
        var targetLink = link || 'pricing.html';
        if(!isLoggedIn && targetLink.indexOf('pricing') !== -1){
          window.location.href = 'register.html?redirect=pricing&coupon=' + encodeURIComponent(code);
        } else {
          window.location.href = targetLink + (targetLink.indexOf('?') === -1 ? '?' : '&') + 'coupon=' + encodeURIComponent(code);
        }
      }, 800);
    }).catch(function(){
      var input = document.createElement('input');
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      btnEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
      btnEl.style.background = 'rgba(52,211,153,0.2)';
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

  // ─── إنشاء البوب أب — بطاقة أنيقة مع حدود متوهجة ───
  function showPopup(msg){
    var cooldown = (msg._cooldown || 5) * 60000;
    var lastPopup = parseInt(localStorage.getItem(LAST_POPUP) || '0');
    if(Date.now() - lastPopup < cooldown) return;

    var closedKey = POPUP_CLOSED + '_' + (msg.coupon || 'default');
    if(sessionStorage.getItem(closedKey)) return;

    localStorage.setItem(LAST_POPUP, Date.now());

    var color = msg.color || '#6366f1';
    var autoHide = (msg._autoHide || 15) * 1000;

    if(msg.coupon) trackCouponEvent(msg.coupon, 'view');

    // ─── CSS البطاقة ───
    if(!document.getElementById('engage-style-v3')){
      var style = document.createElement('style');
      style.id = 'engage-style-v3';
      style.textContent = [
        '@keyframes engPopIn{0%{opacity:0;transform:scale(0.8) translateY(30px)}60%{transform:scale(1.02) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}',
        '@keyframes engGlow{0%,100%{opacity:0.6}50%{opacity:1}}',
        '@keyframes engSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
        '@keyframes engShine{0%{transform:translateX(-100%) rotate(25deg)}100%{transform:translateX(200%) rotate(25deg)}}',
        '@keyframes engFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',

        /* الخلفية الشفافة */
        '#engage-overlay{position:fixed;inset:0;z-index:9996;pointer-events:none}',

        /* حاوي البطاقة */
        '#engage-popup{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9997;width:340px;max-width:calc(100vw - 24px);animation:engPopIn .6s cubic-bezier(.34,1.56,.64,1);direction:rtl;font-family:Tajawal,sans-serif}',

        /* البطاقة مع الحدود المتوهجة */
        '#engage-popup .eng-card{position:relative;border-radius:20px;padding:28px 22px 22px;text-align:center;overflow:hidden}',

        /* طبقة الخلفية */
        '#engage-popup .eng-bg{position:absolute;inset:2px;border-radius:18px;background:linear-gradient(160deg,rgba(15,10,50,0.97),rgba(22,15,60,0.95),rgba(15,10,46,0.97));backdrop-filter:blur(20px);z-index:1}',

        /* الحدود المتوهجة — دائرة متحركة */
        '#engage-popup .eng-border{position:absolute;inset:0;border-radius:20px;padding:2px;overflow:hidden;z-index:0}',
        '#engage-popup .eng-border::before{content:"";position:absolute;inset:-40%;background:conic-gradient(from 0deg,transparent 0%,var(--eng-glow) 10%,transparent 20%,transparent 50%,var(--eng-glow) 60%,transparent 70%);animation:engSpin 3s linear infinite}',
        '#engage-popup .eng-border::after{content:"";position:absolute;inset:2px;border-radius:18px;background:linear-gradient(160deg,rgba(15,10,50,0.97),rgba(22,15,60,0.95));z-index:1}',

        /* توهج خلفي */
        '#engage-popup .eng-glow-bg{position:absolute;inset:-20px;border-radius:30px;background:radial-gradient(ellipse at center,var(--eng-glow),transparent 70%);opacity:0.15;animation:engGlow 3s ease-in-out infinite;z-index:-1;filter:blur(20px)}',

        /* المحتوى */
        '#engage-popup .eng-content{position:relative;z-index:2}',

        /* الإيموجي */
        '#engage-popup .eng-emoji{font-size:42px;line-height:1;margin-bottom:12px;display:block;animation:engFloat 3s ease-in-out infinite}',

        /* النص */
        '#engage-popup .eng-text{font-size:15px;font-weight:600;color:rgba(255,255,255,0.9);line-height:1.7;margin-bottom:16px;display:block}',

        /* كود الكوبون */
        '#engage-popup .eng-coupon-box{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:14px}',
        '#engage-popup .eng-code{background:rgba(255,255,255,0.06);border:1.5px dashed var(--eng-glow);border-radius:12px;padding:8px 18px;font-family:monospace;font-weight:900;font-size:18px;color:var(--eng-glow);letter-spacing:2px;direction:ltr;user-select:all}',
        '#engage-popup .eng-copy-btn{background:var(--eng-glow);border:none;border-radius:12px;width:42px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .25s;flex-shrink:0;box-shadow:0 4px 15px color-mix(in srgb,var(--eng-glow) 40%,transparent)}',
        '#engage-popup .eng-copy-btn:hover{transform:scale(1.1);box-shadow:0 6px 20px color-mix(in srgb,var(--eng-glow) 50%,transparent)}',
        '#engage-popup .eng-copy-btn:active{transform:scale(0.95)}',

        /* نص مساعد تحت الكوبون */
        '#engage-popup .eng-hint{font-size:11px;color:rgba(255,255,255,0.35);margin-bottom:0;margin-top:-6px}',

        /* الزر العادي */
        '#engage-popup .eng-btn{display:inline-block;background:var(--eng-glow);color:#fff;border:none;padding:10px 28px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;transition:all .25s;font-family:Tajawal,sans-serif;box-shadow:0 6px 20px color-mix(in srgb,var(--eng-glow) 35%,transparent)}',
        '#engage-popup .eng-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px color-mix(in srgb,var(--eng-glow) 50%,transparent)}',

        /* شريط لامع */
        '#engage-popup .eng-shine{position:absolute;top:0;right:0;bottom:0;width:40px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent);animation:engShine 4s ease-in-out infinite;z-index:3;pointer-events:none}',

        /* زر الإغلاق */
        '#engage-popup .eng-close{position:absolute;top:8px;left:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);width:28px;height:28px;border-radius:50%;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:4;line-height:1}',
        '#engage-popup .eng-close:hover{color:#fff;background:rgba(255,255,255,0.12)}',

        /* موبايل */
        '@media(max-width:480px){',
        '  #engage-popup{bottom:72px;width:calc(100vw - 20px)}',
        '  #engage-popup .eng-card{padding:22px 16px 18px}',
        '  #engage-popup .eng-emoji{font-size:36px;margin-bottom:10px}',
        '  #engage-popup .eng-text{font-size:13px;margin-bottom:12px}',
        '  #engage-popup .eng-code{font-size:15px;padding:7px 14px}',
        '  #engage-popup .eng-copy-btn{width:38px;height:38px}',
        '  #engage-popup .eng-btn{font-size:13px;padding:9px 22px}',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }

    // ─── إزالة بوب أب قديم ───
    var old = document.getElementById('engage-popup');
    if(old) old.remove();

    // ─── بناء البطاقة ───
    var popup = document.createElement('div');
    popup.id = 'engage-popup';
    popup.style.setProperty('--eng-glow', color);

    var html = '';
    html += '<div class="eng-glow-bg"></div>';
    html += '<div class="eng-card">';
    html += '  <div class="eng-border"></div>';
    html += '  <div class="eng-bg"></div>';
    html += '  <div class="eng-shine"></div>';

    // زر الإغلاق
    html += '  <button class="eng-close" id="eng-close-btn">✕</button>';

    // المحتوى
    html += '  <div class="eng-content">';
    html += '    <span class="eng-emoji">' + (msg.emoji || '🎁') + '</span>';
    html += '    <span class="eng-text">' + msg.text + '</span>';

    // كوبون
    if(msg.coupon){
      html += '    <div class="eng-coupon-box">';
      html += '      <span class="eng-code">' + msg.coupon + '</span>';
      html += '      <button class="eng-copy-btn" id="eng-copy-btn" title="انسخ الكوبون">';
      html += '        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      html += '      </button>';
      html += '    </div>';
      html += '    <p class="eng-hint">📋 انسخ الكوبون واحصل على الخصم</p>';
    }
    // زر عادي
    else if(msg.btn){
      html += '    <a class="eng-btn" href="' + (msg.link || '#') + '" id="eng-action-btn">' + msg.btn + '</a>';
    }

    html += '  </div>'; // eng-content
    html += '</div>'; // eng-card

    popup.innerHTML = html;
    document.body.appendChild(popup);

    // ─── الأحداث ───
    var closeBtn = document.getElementById('eng-close-btn');
    if(closeBtn){
      closeBtn.onclick = function(){
        popup.style.transition = 'opacity .4s, transform .4s';
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) scale(0.9) translateY(20px)';
        sessionStorage.setItem(closedKey, '1');
        setTimeout(function(){ popup.remove(); }, 400);
      };
    }

    if(msg.coupon){
      var copyBtn = document.getElementById('eng-copy-btn');
      if(copyBtn){
        copyBtn.onclick = function(){ copyCoupon(msg.coupon, copyBtn, msg.link); };
      }
    }

    if(!msg.coupon && msg.btn && !msg.link){
      var actionBtn = document.getElementById('eng-action-btn');
      if(actionBtn){
        actionBtn.onclick = function(e){ e.preventDefault(); closeBtn.click(); };
      }
    }

    // إخفاء تلقائي
    setTimeout(function(){
      if(popup.parentNode){
        popup.style.transition = 'opacity .4s, transform .4s';
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) scale(0.9) translateY(20px)';
        setTimeout(function(){ popup.remove(); }, 400);
      }
    }, autoHide);
  }

  // ─── تحديد الرسالة بناءً على حالة الزائر (fallback) ───
  function getDefaultMessage(){
    if(visits === 1 && !isLoggedIn){
      return { msg: defaultMessages.firstVisit, delay: 5000 };
    }
    if(currentPage === 'pricing'){
      return { msg: defaultMessages.pricing, delay: 10000 };
    }
    if(visits > 2 && !isLoggedIn && currentPage !== 'login' && currentPage !== 'register'){
      return { msg: defaultMessages.returnVisitor, delay: 8000 };
    }
    if(isLoggedIn && (currentPage === 'dashboard' || currentPage === 'index')){
      return { msg: defaultMessages.loggedIdle, delay: 30000 };
    }
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

    if(settings && settings.engage_mode && settings.engage_mode !== 'off'){
      if(settings.engage_mode === 'range'){
        var now = new Date();
        if(settings.engage_from && new Date(settings.engage_from) > now) return;
        if(settings.engage_to && new Date(settings.engage_to) < now) return;
      }

      var pages = settings.engage_pages || 'all';
      if(pages !== 'all' && pages.indexOf(currentPage) === -1) return;

      var target = settings.engage_target || 'all';
      if(target === 'visitors' && isLoggedIn) return;
      if(target === 'logged' && !isLoggedIn) return;

      var adminMsg = {
        emoji: settings.engage_emoji || '🎁',
        text: settings.engage_text || '',
        color: settings.engage_color || '#f59e0b',
        _cooldown: parseInt(settings.engage_cooldown) || 5,
        _autoHide: parseInt(settings.engage_auto_hide) || 15
      };

      if(settings.engage_coupon_enabled === 'true' && settings.engage_coupon_code){
        adminMsg.coupon = settings.engage_coupon_code.toUpperCase();
        adminMsg.link = settings.engage_btn_link || 'pricing.html';
      }
      else if(settings.engage_btn_text){
        adminMsg.btn = settings.engage_btn_text;
        adminMsg.link = settings.engage_btn_link || null;
      }

      var delay = (parseInt(settings.engage_delay) || 10) * 1000;
      setTimeout(function(){ showPopup(adminMsg); }, delay);

    } else {
      var def = getDefaultMessage();
      if(def){
        def.msg._cooldown = 5;
        def.msg._autoHide = 12;
        setTimeout(function(){ showPopup(def.msg); }, def.delay);
      }
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
