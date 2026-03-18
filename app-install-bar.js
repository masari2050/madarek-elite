/**
 * app-install-bar.js — بانر تحميل التطبيق للصفحات الداخلية
 * يظهر فقط: على الموبايل + من المتصفح (مو التطبيق) + مسجّل دخول
 * يختفي: لو المستخدم أغلقه (يرجع بعد 3 أيام)
 */
(function(){
  'use strict';

  // ─── لا تعرض داخل التطبيق ───
  var ua = navigator.userAgent || '';
  var isApp = window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1);
  if(isApp) return;

  // ─── لا تعرض على الديسكتوب ───
  if(window.innerWidth > 768) return;

  // ─── لا تعرض في صفحات معينة ───
  var page = location.pathname.split('/').pop().replace('.html','') || 'index';
  var skip = ['index','login','register','demo','admin','admin-login','pricing','payment-callback'];
  if(skip.indexOf(page) !== -1) return;

  // ─── لا تعرض لو المستخدم أغلقه خلال 3 أيام ───
  var CLOSE_KEY = 'madarek_app_bar_closed';
  var closed = localStorage.getItem(CLOSE_KEY);
  if(closed && (Date.now() - parseInt(closed)) < 3 * 24 * 60 * 60 * 1000) return;

  // ─── لازم يكون مسجّل دخول ───
  try {
    var tk = localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token');
    if(!tk) return;
    var parsed = JSON.parse(tk);
    if(!parsed || !parsed.access_token) return;
  } catch(e){ return; }

  // ─── كشف النظام ───
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);

  var storeLink = isIOS
    ? 'https://apps.apple.com/sa/app/%D9%85%D8%AF%D8%A7%D8%B1%D9%83-%D8%A7%D9%84%D9%86%D8%AE%D8%A8%D8%A9/id6760215684'
    : 'https://play.google.com/store/apps/details?id=com.madarekelite.app';

  var storeName = isIOS ? 'App Store' : 'Google Play';

  // ─── CSS ───
  var style = document.createElement('style');
  style.textContent = [
    '#madarek-app-bar{position:fixed;bottom:0;left:0;right:0;z-index:9990;padding:12px 14px;background:linear-gradient(135deg,#1a103d,#2a1560);border-top:1px solid rgba(139,92,246,0.3);box-shadow:0 -4px 20px rgba(0,0,0,0.4);display:flex;align-items:center;gap:12px;direction:rtl;font-family:Tajawal,sans-serif;animation:appBarSlide .4s ease}',
    '@keyframes appBarSlide{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
    '#madarek-app-bar .ab-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(16,185,129,0.4)}',
    '#madarek-app-bar .ab-text{flex:1;min-width:0}',
    '#madarek-app-bar .ab-title{font-size:13px;font-weight:800;color:#fff;line-height:1.3}',
    '#madarek-app-bar .ab-sub{font-size:10px;color:rgba(196,181,253,0.6);margin-top:1px}',
    '#madarek-app-bar .ab-btn{padding:8px 18px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:12px;font-weight:800;text-decoration:none;white-space:nowrap;box-shadow:0 4px 12px rgba(16,185,129,0.3);transition:transform .2s}',
    '#madarek-app-bar .ab-btn:active{transform:scale(0.95)}',
    '#madarek-app-bar .ab-close{position:absolute;top:4px;left:6px;background:none;border:none;color:rgba(255,255,255,0.3);font-size:14px;cursor:pointer;padding:4px;line-height:1}'
  ].join('\n');
  document.head.appendChild(style);

  // ─── HTML ───
  var bar = document.createElement('div');
  bar.id = 'madarek-app-bar';

  // أيقونة جوال مع سهم تحميل
  var iconSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18.01"/><path d="M12 6v6m0 0l-2.5-2.5M12 12l2.5-2.5"/></svg>';

  // رسائل مباشرة وتحفيزية
  var messages = [
    {title: 'حمّل التطبيق — أفضل لك', sub: 'تدرّب بضغطة بدون متصفح'},
    {title: 'التطبيق أسرع وأريح', sub: 'حمّله مجاناً وتدرّب مباشرة'},
    {title: 'تدرّب من التطبيق أفضل', sub: 'أسرع + أسهل + بدون تشتت'},
    {title: 'حمّل التطبيق وريّح نفسك', sub: 'مجاني على ' + storeName}
  ];
  var msg = messages[Math.floor(Math.random() * messages.length)];

  bar.innerHTML = ''
    + '<button class="ab-close" id="ab-close">✕</button>'
    + '<div class="ab-icon">' + iconSvg + '</div>'
    + '<div class="ab-text">'
    + '  <div class="ab-title">' + msg.title + '</div>'
    + '  <div class="ab-sub">' + msg.sub + '</div>'
    + '</div>'
    + '<a class="ab-btn" href="' + storeLink + '" target="_blank" rel="noopener">حمّل الآن</a>';

  // ─── إضافة بعد تحميل الصفحة ───
  function show(){
    document.body.appendChild(bar);
    // نزيح الواتساب فوق البانر
    var wa = document.querySelector('.wa-float');
    if(wa) wa.style.bottom = '80px';

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

  // نعرضه بعد 2 ثانية عشان ما يشتت
  setTimeout(show, 2000);

})();
