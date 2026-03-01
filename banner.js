(function(){
'use strict';

var SUPA_URL='https://czzcmbxejxbotjemyuqf.supabase.co';
var SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

// ── Favicon ─────────────────────────────────────────────────────
function fixFavicon(){
  var svg='<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><defs><linearGradient id=\"g\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\"><stop offset=\"0%\" stop-color=\"#6366f1\"/><stop offset=\"100%\" stop-color=\"#8b5cf6\"/></linearGradient></defs><rect width=\"64\" height=\"64\" rx=\"14\" fill=\"url(#g)\"/><path d=\"M10 50 L10 30 L19 39 L32 14 L45 39 L54 30 L54 50Z\" stroke=\"white\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" fill=\"none\"/><line x1=\"10\" y1=\"54\" x2=\"54\" y2=\"54\" stroke=\"white\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><circle cx=\"10\" cy=\"30\" r=\"3\" fill=\"white\"/><circle cx=\"32\" cy=\"14\" r=\"3\" fill=\"white\"/><circle cx=\"54\" cy=\"30\" r=\"3\" fill=\"white\"/></svg>';
  var uri='data:image/svg+xml,'+encodeURIComponent(svg);
  document.querySelectorAll('link[rel*=icon]').forEach(function(l){l.remove();});
  var lk=document.createElement('link'); lk.rel='icon'; lk.type='image/svg+xml'; lk.href=uri; document.head.appendChild(lk);
  var al=document.createElement('link'); al.rel='apple-touch-icon'; al.href=uri; document.head.appendChild(al);
}

// ── CSS ──────────────────────────────────────────────────────────
function addCSS(){
  if(document.getElementById('bnr-css')) return;
  var s=document.createElement('style'); s.id='bnr-css';
  s.textContent=[
    '@keyframes bnrScroll{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}',
    '.bnr-wrap{position:fixed;top:0;left:0;right:0;z-index:99999;pointer-events:none}',
    '.bnr-bar{pointer-events:auto;width:100%;overflow:hidden;white-space:nowrap;position:relative}',
    '.bnr-scroll{display:inline-block;animation:bnrScroll 28s linear infinite;padding-right:60px}',
    '.bnr-static{text-align:center;padding:8px 40px}',
    '.bnr-close{position:absolute;left:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:20px;line-height:1;opacity:0.75}',
    '.bnr-close:hover{opacity:1}',
    'body{transition:padding-top 0.2s ease}'
  ].join('');
  document.head.appendChild(s);
}

// ── إنشاء حاوية البنر ────────────────────────────────────────────
function getWrap(){
  var w=document.getElementById('bnr-wrap');
  if(!w){ w=document.createElement('div'); w.id='bnr-wrap'; w.className='bnr-wrap'; document.body.appendChild(w); }
  return w;
}

// ── تطبيق بنر ────────────────────────────────────────────────────
function renderBar(wrap, id, s, prefix, isInt){
  var mode=s[prefix+'mode']||'off';
  var text=s[prefix+'text']||'';
  var old=document.getElementById(id); if(old) old.remove();
  if(!text||mode==='off') return;
  if(mode==='range'){
    var now=new Date();
    var f=s[prefix+'from']?new Date(s[prefix+'from']):null;
    var t=s[prefix+'to']?new Date(s[prefix+'to']):null;
    if(f&&now<f) return; if(t&&now>t) return;
  }
  var bg=s[prefix+'bg']||(isInt?'#10b981':'#6366f1');
  var color=s[prefix+'color']||'#fff';
  var size=(s[prefix+'size']||'13')+'px';
  var bold=s[prefix+'bold']==='true';
  var movement=s[prefix+'movement']||'scroll';
  var emoji=s[prefix+'emoji']||'';
  var lnk=s[prefix+'link']||'';
  var lnkTxt=s[prefix+'link_text']||'اضغط هنا';
  var closeable=s[prefix+'closeable']==='true';

  var inner=emoji?emoji+' '+text:text;
  if(lnk) inner+=' — <a href="'+lnk+'" style="color:'+color+';opacity:0.85;text-decoration:underline">'+lnkTxt+'<\/a>';

  var bar=document.createElement('div'); bar.id=id; bar.className='bnr-bar';
  bar.style.cssText='background:'+bg+';color:'+color+';font-size:'+size+';font-weight:'+(bold?'700':'500')+';font-family:Tajawal,sans-serif;direction:rtl;padding:8px 0;';

  if(movement==='scroll'){
    bar.innerHTML='<span class=\"bnr-scroll\">'+inner+'</span>';
  } else {
    bar.innerHTML='<div class=\"bnr-static\">'+inner+'<\/div>';
  }
  if(closeable){
    var btn=document.createElement('button'); btn.className='bnr-close'; btn.innerHTML='×'; btn.style.color=color;
    btn.onclick=function(){ bar.remove(); updateBodyPad(); };
    bar.appendChild(btn);
  }
  wrap.appendChild(bar);
}

// ── ضبط padding للصفحة ────────────────────────────────────────────
function updateBodyPad(){
  var wrap=document.getElementById('bnr-wrap');
  var h=wrap?wrap.offsetHeight:0;
  document.body.style.paddingTop=h+'px';
}

// ── هل المستخدم مسجّل دخول؟ ──────────────────────────────────────
function isLoggedIn(){
  try{ return Object.keys(localStorage).some(function(k){return k.includes('supabase')&&k.includes('auth');}); }catch(e){return false;}
}

// ── الصفحة الحالية ────────────────────────────────────────────────
function getPage(){
  return document.body.getAttribute('data-page')||window.location.pathname.split('/').pop().replace('.html','');
}

// ── جلب الإعدادات ─────────────────────────────────────────────────
function loadSettings(cb){
  fetch(SUPA_URL+'/rest/v1/site_settings?select=key,value',{
    headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}
  }).then(function(r){return r.json();}).then(function(rows){
    var s={};
    if(Array.isArray(rows)) rows.forEach(function(r){s[r.key]=r.value;});
    cb(s);
  }).catch(function(){cb({});});
}

// ── التهيئة ───────────────────────────────────────────────────────
function init(){
  addCSS(); fixFavicon();
  var page=getPage(); var loggedIn=isLoggedIn();

  loadSettings(function(s){
    var wrap=getWrap();
    wrap.innerHTML='';

    // البنر العام
    var pubPages=s['banner_public_pages']||'all';
    var showPub=pubPages==='all'||pubPages.split(',').some(function(p){return p.trim()===page;});
    if(showPub) renderBar(wrap,'bnr-public',s,'banner_',false);

    // البنر الداخلي
    if(loggedIn){
      var intPages=s['banner_int_pages']||'all';
      var showInt=intPages==='all'||intPages.split(',').some(function(p){return p.trim()===page;});
      if(showInt) renderBar(wrap,'bnr-internal',s,'banner_int_',true);
    }

    // ضبط الـ padding بعد رندر البنر
    setTimeout(updateBodyPad,100);
  });
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}
else{init();}

})();