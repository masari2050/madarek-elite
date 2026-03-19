/**
 * app-install-bar.js — بانر ثابت أسفل الصفحة لتحميل التطبيق
 * خط واحد بسيط — زر أخضر — يوجّه تلقائي حسب نوع الجهاز
 */
(function(){
  'use strict';

  var ua = navigator.userAgent || '';
  var isApp = window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1);
  if(isApp) return;

  var page = location.pathname.split('/').pop().replace('.html','') || 'index';
  var skip = ['index','login','register','demo','admin','admin-login','pricing','payment-callback','terms','privacy'];
  if(skip.indexOf(page) !== -1) return;

  var CLOSE_KEY = 'madarek_app_bar_closed';
  var closed = localStorage.getItem(CLOSE_KEY);
  if(closed && (Date.now() - parseInt(closed)) < 7 * 24 * 60 * 60 * 1000) return;

  try {
    var tk = localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token');
    if(!tk) return;
    var parsed = JSON.parse(tk);
    if(!parsed || !parsed.access_token) return;
  } catch(e){ return; }

  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var storeLink = isIOS
    ? 'https://apps.apple.com/sa/app/%D9%85%D8%AF%D8%A7%D8%B1%D9%83-%D8%A7%D9%84%D9%86%D8%AE%D8%A8%D8%A9/id6760215684'
    : 'https://play.google.com/store/apps/details?id=com.madarekelite.app';

  var style = document.createElement('style');
  style.textContent = '#madarek-app-bar{position:fixed;bottom:0;left:0;right:0;z-index:9990;padding:10px 14px;background:rgba(15,10,46,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:10px;direction:rtl;font-family:Tajawal,sans-serif;animation:abIn .3s ease}@keyframes abIn{from{transform:translateY(100%)}to{transform:translateY(0)}}#madarek-app-bar .ab-txt{font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#madarek-app-bar .ab-btn{padding:8px 22px;border-radius:10px;background:#10b981;color:#fff;font-size:13px;font-weight:800;text-decoration:none;white-space:nowrap;flex-shrink:0;transition:background .2s}#madarek-app-bar .ab-btn:active{background:#059669}#madarek-app-bar .ab-x{background:none;border:none;color:rgba(255,255,255,0.25);font-size:20px;cursor:pointer;padding:2px 4px;line-height:1;flex-shrink:0}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'madarek-app-bar';
  bar.innerHTML = '<button class="ab-x" id="ab-close">\u00d7</button><span class="ab-txt">\u062d\u0645\u0651\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u2014 \u062a\u062f\u0631\u0651\u0628 \u0623\u0633\u0631\u0639 \u0648\u0623\u0631\u064a\u062d</span><a class="ab-btn" href="' + storeLink + '" target="_blank" rel="noopener">\u062d\u0645\u0651\u0644 \u0645\u062c\u0627\u0646\u0627\u064b</a>';

  function show(){
    document.body.appendChild(bar);
    var wa = document.querySelector('.wa-float');
    if(wa) wa.style.bottom = '56px';
    document.getElementById('ab-close').onclick = function(){
      bar.style.transition = 'transform .3s';
      bar.style.transform = 'translateY(100%)';
      localStorage.setItem(CLOSE_KEY, Date.now());
      setTimeout(function(){ bar.remove(); if(wa) wa.style.bottom = ''; }, 300);
    };
  }

  setTimeout(show, 1500);
})();
