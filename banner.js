
(function(){
'use strict';

// ─── الـ Supabase ───────────────────────────────────────────────
const SUPABASE_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

async function fetchSettings(){
  try {
    const r = await fetch(SUPABASE_URL+'/rest/v1/site_settings?select=key,value',{
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY}
    });
    const data = await r.json();
    const s = {};
    if(Array.isArray(data)) data.forEach(function(row){ s[row.key]=row.value; });
    return s;
  } catch(e){ return {}; }
}

// ─── الـ Favicon والـ Title ──────────────────────────────────────
function setFaviconAndTitle(){
  // Favicon SVG
  var faviconSVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><path d="M10 50 L10 30 L19 39 L32 14 L45 39 L54 30 L54 50Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="10" y1="54" x2="54" y2="54" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="10" cy="30" r="3" fill="white"/><circle cx="32" cy="14" r="3" fill="white"/><circle cx="54" cy="30" r="3" fill="white"/></svg>';
  var encoded = 'data:image/svg+xml,' + encodeURIComponent(faviconSVG);

  // احذف الفافيكون القديم
  var oldLinks = document.querySelectorAll('link[rel*="icon"]');
  oldLinks.forEach(function(l){ l.parentNode.removeChild(l); });

  // أضف الجديد
  var link = document.createElement('link');
  link.rel = 'icon'; link.type = 'image/svg+xml'; link.href = encoded;
  document.head.appendChild(link);

  // apple touch icon
  var apple = document.createElement('link');
  apple.rel = 'apple-touch-icon'; apple.href = encoded;
  document.head.appendChild(apple);

  // Title
  var currentTitle = document.title;
  if(!currentTitle.includes('مدارك النخبة')){
    document.title = 'مدارك النخبة | ' + currentTitle;
  }
}

// ─── إزالة البنر القديم الهاردكود ──────────────────────────────
function removeOldBanners(){
  // احذف أي عنصر يحتوي على النص القديم أو الكلاس القديم
  var selectors = [
    '#old-banner', '#top-banner-old', '.old-announcement',
    '[data-old-banner]'
  ];
  selectors.forEach(function(sel){
    var els = document.querySelectorAll(sel);
    els.forEach(function(el){ el.parentNode && el.parentNode.removeChild(el); });
  });

  // احذف أي div يحتوي على نص "منصة مساري"
  var allDivs = document.querySelectorAll('div, section, aside');
  allDivs.forEach(function(el){
    if(el.textContent && el.textContent.includes('منصة مساري') && !el.querySelector('script')){
      // تحقق إن الـ div مخصص للبنر فقط وليس container كبير
      if(el.children.length <= 3 && el.offsetHeight < 80){
        el.style.display = 'none';
      }
    }
  });
}

// ─── إنشاء البنر ─────────────────────────────────────────────────
function createBannerEl(id, zIndex){
  var el = document.getElementById(id);
  if(!el){
    el = document.createElement('div');
    el.id = id;
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.style.cssText = 'position:relative;z-index:'+zIndex+';width:100%;overflow:hidden;display:none;';
  return el;
}

// ─── تطبيق بنر واحد ──────────────────────────────────────────────
function applyBanner(el, settings, prefix, isInternal){
  var mode = settings[prefix+'mode'] || 'off';
  var text = settings[prefix+'text'] || '';
  if(!text || mode === 'off'){ el.style.display='none'; return; }

  if(mode === 'range'){
    var now = new Date();
    var from = settings[prefix+'from'] ? new Date(settings[prefix+'from']) : null;
    var to   = settings[prefix+'to']   ? new Date(settings[prefix+'to'])   : null;
    if(from && now < from){ el.style.display='none'; return; }
    if(to   && now > to)  { el.style.display='none'; return; }
  }

  var bg       = settings[prefix+'bg']    || (isInternal ? '#10b981' : '#6366f1');
  var color    = settings[prefix+'color'] || '#ffffff';
  var size     = (settings[prefix+'size'] || '13') + 'px';
  var bold     = settings[prefix+'bold']  === 'true';
  var movement = settings[prefix+'movement'] || 'scroll';
  var emoji    = settings[prefix+'emoji'] || '';
  var linkUrl  = settings[prefix+'link']  || '';
  var linkTxt  = settings[prefix+'link_text'] || '';
  var canClose = settings[prefix+'closeable'] === 'true';

  var fullText = (emoji ? emoji+' ' : '') + text + (linkUrl ? ' — <a href="'+linkUrl+'" style="color:'+color+';text-decoration:underline;opacity:0.85">'+linkTxt+'</a>' : '');

  var inner = '';
  if(movement === 'scroll'){
    inner = '<div style="overflow:hidden;white-space:nowrap;padding:9px 0"><span style="display:inline-block;animation:bannerScroll 30s linear infinite;padding-left:100%">'+fullText+'</span></div>';
  } else {
    inner = '<div style="text-align:center;padding:9px 16px">'+fullText+'</div>';
  }

  if(canClose){
    inner += '<button onclick="this.parentElement.style.display=\'none\'" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:'+color+';font-size:18px;cursor:pointer;opacity:0.7;line-height:1">×</button>';
    el.style.position = 'relative';
  }

  el.innerHTML = inner;
  el.style.background = bg;
  el.style.color = color;
  el.style.fontSize = size;
  el.style.fontWeight = bold ? '700' : '500';
  el.style.fontFamily = "'Tajawal',sans-serif";
  el.style.direction = 'rtl';
  el.style.display = 'block';
  el.style.boxSizing = 'border-box';
}

// ─── الصفحة الحالية ──────────────────────────────────────────────
function getCurrentPage(){
  return document.body.getAttribute('data-page') || 
         window.location.pathname.replace('/', '').replace('.html','') || 'index';
}

function isLoggedIn(){
  // تحقق من وجود session في الـ localStorage
  try {
    var keys = Object.keys(localStorage);
    return keys.some(function(k){ return k.includes('supabase') && k.includes('auth'); });
  } catch(e){ return false; }
}

// ─── CSS لـ Animation ────────────────────────────────────────────
function injectCSS(){
  if(document.getElementById('banner-js-style')) return;
  var style = document.createElement('style');
  style.id = 'banner-js-style';
  style.textContent = '@keyframes bannerScroll{0%{transform:translateX(0)}100%{transform:translateX(-100%)}}';
  document.head.appendChild(style);
}

// ─── التشغيل الرئيسي ─────────────────────────────────────────────
async function init(){
  injectCSS();
  setFaviconAndTitle();
  removeOldBanners();

  var settings = await fetchSettings();
  var page = getCurrentPage();
  var loggedIn = isLoggedIn();

  // البنر العام (للجميع)
  var publicPages = settings['banner_public_pages'] || 'all';
  var showPublic = publicPages === 'all' || publicPages.split(',').some(function(p){ return p.trim()===page; });
  if(showPublic){
    var pubEl = createBannerEl('banner-public', 9999);
    applyBanner(pubEl, settings, 'banner_', false);
  }

  // البنر الداخلي (للمشتركين فقط)
  if(loggedIn){
    var intPages = settings['banner_int_pages'] || 'all';
    var showInt = intPages === 'all' || intPages.split(',').some(function(p){ return p.trim()===page; });
    if(showInt){
      var intEl = createBannerEl('banner-internal', 9998);
      applyBanner(intEl, settings, 'banner_int_', true);
    }
  }
}

// شغّل بعد الـ DOM
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
