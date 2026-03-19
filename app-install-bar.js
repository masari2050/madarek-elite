/**
 * app-install-bar.js — بانر ثابت أسفل الصفحة لتحميل التطبيق
 * يظهر: على الموبايل والديسكتوب من المتصفح فقط (مو التطبيق)
 * يختفي: لو المستخدم أغلقه (يرجع بعد 7 أيام)
 */
(function(){
  'use strict';

  // ─── لا تعرض داخل التطبيق ───
  var ua = navigator.userAgent || '';
  var isApp = window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1);
  if(isApp) return;

  // ─── لا تعرض في صفحات معينة ───
  var page = location.pathname.split('/').pop().replace('.html','') || 'index';
  var skip = ['index','login','register','demo','admin','admin-login','pricing','payment-callback','terms','privacy'];
  if(skip.indexOf(page) !== -1) return;

  // ─── لا تعرض لو المستخدم أغلقه خلال 7 أيام ───
  var CLOSE_KEY = 'madarek_app_bar_closed';
  var closed = localStorage.getItem(CLOSE_KEY);
  if(closed && (Date.now() - parseInt(closed)) < 7 * 24 * 60 * 60 * 1000) return;

  // ─── لازم يكون مسجّل دخول ───
  try {
    var tk = localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token');
    if(!tk) return;
    var parsed = JSON.parse(tk);
    if(!parsed || !parsed.access_token) return;
  } catch(e){ return; }

  // ─── روابط المتاجر ───
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var appStoreLink = 'https://apps.apple.com/sa/app/%D9%85%D8%AF%D8%A7%D8%B1%D9%83-%D8%A7%D9%84%D9%86%D8%AE%D8%A8%D8%A9/id6760215684';
  var playStoreLink = 'https://play.google.com/store/apps/details?id=com.madarekelite.app';

  // ─── CSS ───
  var style = document.createElement('style');
  style.textContent = [
    '#madarek-app-bar{position:fixed;bottom:0;left:0;right:0;z-index:9990;padding:10px 16px;background:linear-gradient(135deg,#064e3b,#065f46);border-top:2px solid #10b981;box-shadow:0 -4px 24px rgba(16,185,129,0.3);display:flex;align-items:center;gap:10px;direction:rtl;font-family:Tajawal,sans-serif;animation:appBarSlide .4s ease}',
    '@keyframes appBarSlide{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
    '#madarek-app-bar .ab-icon{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '#madarek-app-bar .ab-text{flex:1;min-width:0}',
    '#madarek-app-bar .ab-title{font-size:13px;font-weight:800;color:#fff;line-height:1.3}',
    '#madarek-app-bar .ab-sub{font-size:10px;color:rgba(167,243,208,0.7);margin-top:1px}',
    '#madarek-app-bar .ab-stores{display:flex;gap:6px;flex-shrink:0}',
    '#madarek-app-bar .ab-store{display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:10px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);color:#fff;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;transition:background .2s}',
    '#madarek-app-bar .ab-store:active{background:rgba(255,255,255,0.22);transform:scale(0.97)}',
    '#madarek-app-bar .ab-close{background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:4px;line-height:1;flex-shrink:0}',
    '#madarek-app-bar .ab-close:hover{color:rgba(255,255,255,0.6)}',
    '@media(max-width:500px){#madarek-app-bar .ab-stores{flex-direction:column;gap:4px}#madarek-app-bar .ab-store{padding:6px 10px;font-size:10px}#madarek-app-bar{padding:8px 12px;gap:8px}}'
  ].join('\n');
  document.head.appendChild(style);

  // ─── HTML ───
  var bar = document.createElement('div');
  bar.id = 'madarek-app-bar';

  var phoneSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>';

  var appleSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>';

  var playSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>';

  bar.innerHTML = ''
    + '<div class="ab-icon">' + phoneSvg + '</div>'
    + '<div class="ab-text">'
    + '  <div class="ab-title">حمّل التطبيق وتدرّب بسهولة</div>'
    + '  <div class="ab-sub">مجاني — أسرع وأريح من المتصفح</div>'
    + '</div>'
    + '<div class="ab-stores">'
    + '  <a class="ab-store" href="' + appStoreLink + '" target="_blank" rel="noopener">' + appleSvg + ' App Store</a>'
    + '  <a class="ab-store" href="' + playStoreLink + '" target="_blank" rel="noopener">' + playSvg + ' Google Play</a>'
    + '</div>'
    + '<button class="ab-close" id="ab-close">✕</button>';

  // ─── إضافة بعد تحميل الصفحة ───
  function show(){
    document.body.appendChild(bar);
    // نزيح الواتساب فوق البانر
    var wa = document.querySelector('.wa-float');
    if(wa) wa.style.bottom = '70px';

    document.getElementById('ab-close').onclick = function(){
      bar.style.transition = 'transform .3s ease, opacity .3s ease';
      bar.style.transform = 'translateY(100%)';
      bar.style.opacity = '0';
      localStorage.setItem(CLOSE_KEY, Date.now());
      setTimeout(function(){
        bar.remove();
        if(wa) wa.style.bottom = '';
      }, 300);
    };
  }

  setTimeout(show, 1500);

})();
