/**
 * banner.js — مدارك النخبة — البنر الذكي
 * يعمل تلقائياً على كل الصفحات
 * يحذف البنرات القديمة ويستبدلها بالجديدة من Supabase
 */
(function(){
  'use strict';

  var SB_URL  = 'https://czzcmbxejxbotjemyuqf.supabase.co';
  var SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

  // ═══ 1. حذف البنرات القديمة ═══
  function removeOldBanners(){
    // الأنماط القديمة
    var selectors = [
      '.marquee-container',
      '#top-announcement-bar',
      '[id^="madarek-old-banner"]',
      '.bg-gradient-to-l.from-purple-900\\/60'
    ];
    selectors.forEach(function(sel){
      try {
        document.querySelectorAll(sel).forEach(function(el){ el.remove(); });
      } catch(e){}
    });
    // بنرات بالـ gradient القديم
    document.querySelectorAll('div').forEach(function(el){
      var bg = el.style.background || '';
      var cls = el.className || '';
      if(
        (cls.indexOf('bg-gradient-to-l')!==-1 && cls.indexOf('from-purple-900')!==-1 && el.querySelector('.marquee-text')) ||
        (bg.indexOf('linear-gradient')!==-1 && el.querySelector('.marquee-container'))
      ){
        el.remove();
      }
    });
  }

  // ═══ 2. اسم الصفحة الحالية ═══
  function getPageName(){
    var path = location.pathname.split('/').pop().replace('.html','').replace('.htm','');
    return path || 'index';
  }

  // ═══ 3. هل المستخدم مسجّل دخول؟ ═══
  function isLoggedIn(){
    try {
      var tk = localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token');
      if(!tk) return false;
      var parsed = JSON.parse(tk);
      return !!(parsed && parsed.access_token);
    } catch(e){ return false; }
  }

  // ═══ 4. جلب إعدادات البنر من Supabase ═══
  async function fetchSettings(){
    try {
      var resp = await fetch(SB_URL + '/rest/v1/site_settings?select=key,value', {
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY
        }
      });
      if(!resp.ok) return {};
      var data = await resp.json();
      var map = {};
      data.forEach(function(r){ map[r.key] = r.value || ''; });
      return map;
    } catch(e){ console.error('Banner: fetch error', e); return {}; }
  }

  // ═══ 5. فحص التاريخ والوضع ═══
  function shouldShow(mode, from, to){
    if(mode === 'off') return false;
    if(mode === 'always') return true;
    if(mode === 'range' || mode === 'date'){
      var now = new Date();
      if(from && new Date(from) > now) return false;
      if(to   && new Date(to)   < now) return false;
      return true;
    }
    // أي قيمة ثانية = دائم
    return true;
  }

  // ═══ 6. فحص الصفحة ═══
  function isPageAllowed(pages, pageName){
    if(!pages || pages === 'all') return true;
    var allowed = pages.split(',').map(function(p){ return p.trim().toLowerCase(); });
    return allowed.indexOf(pageName.toLowerCase()) !== -1;
  }

  // ═══ 7. بناء البنر ═══
  function buildBanner(id, text, emoji, bg, color, size, bold, italic, style, closable, link, linkText, speed){
    if(!text) return null;

    // هل المستخدم أغلقه سابقاً؟
    var closeKey = 'madarek_banner_closed_' + id + '_' + text.substring(0,20).replace(/\s/g,'');
    if(closable === 'true' && localStorage.getItem(closeKey)) return null;

    var fullText = text; // emoji is now typed directly in the text field

    var bar = document.createElement('div');
    bar.id = 'madarek-' + id;
    bar.style.cssText = 'width:100%;background:' + (bg||'#6366f1') + ';color:' + (color||'#fff') + ';font-size:' + (size||13) + 'px;font-weight:' + (bold==='true'?'900':'500') + ';font-style:' + (italic==='true'?'italic':'normal') + ';font-family:Tajawal,sans-serif;position:relative;z-index:9998;overflow:hidden;min-height:40px;display:flex;align-items:center;padding:8px 16px;';

    if(style === 'marquee'){
      // ═══ Marquee متحرك ═══
      var track = document.createElement('div');
      track.style.cssText = 'display:flex;width:max-content;animation:madarek-marquee-rtl ' + (speed ? parseInt(speed) : Math.max(30, text.length * 0.7)) + 's linear infinite;';
      // نكرر النص 8 مرات لضمان عدم وجود فراغ
      var repeated = '';
      for(var i=0; i<8; i++){
        repeated += '<span style="padding:0 60px;white-space:nowrap;display:inline-block">';
        if(link && linkText){
          repeated += fullText + ' <a href="' + link + '" style="color:' + (color||'#fff') + ';text-decoration:underline;font-weight:900;margin:0 8px">' + linkText + '</a>';
        } else {
          repeated += fullText;
        }
        repeated += '</span>';
      }
      track.innerHTML = repeated;
      bar.appendChild(track);

      // إضافة keyframes إذا ما كانت موجودة
      if(!document.getElementById('madarek-marquee-css')){
        var css = document.createElement('style');
        css.id = 'madarek-marquee-css';
        css.textContent = '@keyframes madarek-marquee-rtl{0%{transform:translateX(0)}100%{transform:translateX(50%)}}';
        document.head.appendChild(css);
      }
    } else {
      // ═══ ثابت ═══
      bar.style.justifyContent = 'center';
      bar.style.textAlign = 'center';
      bar.style.padding = '8px 16px';
      var content = fullText;
      if(link && linkText){
        content += ' <a href="' + link + '" style="color:' + (color||'#fff') + ';text-decoration:underline;font-weight:900;margin:0 8px">' + linkText + '</a>';
      }
      bar.innerHTML = '<span style="white-space:nowrap">' + content + '</span>';
    }

    // زر الإغلاق
    if(closable === 'true'){
      var closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = 'position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:' + (color||'#fff') + ';font-size:16px;cursor:pointer;opacity:0.6;padding:4px 8px;z-index:2;';
      closeBtn.onclick = function(){
        bar.remove();
        localStorage.setItem(closeKey, '1');
        var w = document.getElementById('madarek-banner-wrapper');
        if(w) {
          var newH = w.offsetHeight;
          document.body.style.paddingTop = newH + 'px';
          var n = document.getElementById('mainNav');
          if(n && getComputedStyle(n).position === 'fixed') n.style.top = newH + 'px';
          if(newH === 0) { w.remove(); document.body.style.paddingTop = '0'; }
        } else {
          document.body.style.paddingTop = '0';
        }
      };
      bar.appendChild(closeBtn);
      bar.style.paddingLeft = '40px';
    }

    return bar;
  }

  // ═══ 8. التشغيل الرئيسي ═══
  async function initBanners(){
    removeOldBanners();

    var settings = await fetchSettings();
    if(!Object.keys(settings).length) return;

    var pageName = getPageName();
    // لا نعرض البنر أثناء الاختبار أو النتائج — يشتت الطالب
    if(pageName === 'practice' || pageName === 'results') return;
    var logged = isLoggedIn();
    var totalHeight = 0;

    // ─── البنر العام (الزوار + الكل) ───
    var pubMode  = settings['banner_mode'] || settings['banner2_mode'] ? settings['banner_mode'] : 'off';
    var pubText  = settings['banner_text'] || '';
    if(pubText && shouldShow(pubMode, settings['banner_from'], settings['banner_to'])){
      var pubPages = settings['banner_pages'] || 'all';
      if(isPageAllowed(pubPages, pageName)){
        var pubBar = buildBanner(
          'public-banner', pubText,
          settings['banner_emoji']||'', settings['banner_bg']||'#6366f1',
          settings['banner_color']||'#fff', settings['banner_size']||'13',
          settings['banner_bold']||'false', settings['banner_italic']||'false',
          settings['banner_style']||'marquee', settings['banner_closable']||'false',
          settings['banner_link']||'', settings['banner_link_text']||'',
          settings['banner_speed']||''
        );
        if(pubBar){
          document.body.insertBefore(pubBar, document.body.firstChild);
          // Adjust login-wrapper height if present
          var lw = document.querySelector('.login-wrapper');
          if(lw) lw.style.minHeight = 'calc(100vh - ' + pubBar.offsetHeight + 'px)';
          totalHeight += pubBar.offsetHeight;
        }
      }
    }

    // ─── البنر الداخلي (المسجلين فقط) ───
    if(logged){
      var intMode = settings['banner2_mode'] || 'off';
      var intText = settings['banner2_text'] || settings['internal_banner_text'] || '';
      var intModeAlt = settings['internal_banner_mode'] || intMode;
      
      // ندعم كلا النظامين (banner2_ و internal_banner_)
      var finalMode = intMode !== 'off' ? intMode : intModeAlt;
      var finalText = intText || settings['internal_banner_text'] || '';
      
      if(finalText && shouldShow(finalMode, 
          settings['banner2_from']||settings['internal_banner_from']||'', 
          settings['banner2_to']||settings['internal_banner_to']||'')){
        
        var intPages = settings['banner2_pages'] || settings['internal_banner_pages'] || 'all';
        if(isPageAllowed(intPages, pageName)){
          var intBar = buildBanner(
            'internal-banner', finalText,
            settings['banner2_emoji']||'', 
            settings['banner2_bg']||settings['internal_banner_bg']||'#10b981',
            settings['banner2_color']||settings['internal_banner_color']||'#fff',
            settings['banner2_size']||settings['internal_banner_size']||'13',
            settings['banner2_bold']||'false', settings['banner2_italic']||'false',
            settings['banner2_style']||settings['internal_banner_motion']||'marquee',
            settings['banner2_closable']||settings['internal_banner_closable']||'false',
            settings['banner2_link']||'', settings['banner2_link_text']||'',
            settings['banner2_speed']||''
          );
          if(intBar){
            // نضيفه بعد البنر العام
            var pubEl = document.getElementById('madarek-public-banner');
            if(pubEl && pubEl.nextSibling){
              document.body.insertBefore(intBar, pubEl.nextSibling);
            } else if(pubEl){
              pubEl.parentNode.insertBefore(intBar, pubEl.nextSibling);
            } else {
              document.body.insertBefore(intBar, document.body.firstChild);
            }
            totalHeight += intBar.offsetHeight;
          }
        }
      }
    }

    // ─── Make banners fixed with header ───
    if(totalHeight > 0) {
      var wrapper = document.createElement('div');
      wrapper.id = 'madarek-banner-wrapper';
      wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;';
      var bannerEls = document.querySelectorAll('body > [id^="madarek-"]');
      for(var b = 0; b < bannerEls.length; b++) wrapper.appendChild(bannerEls[b]);
      document.body.insertBefore(wrapper, document.body.firstChild);
      var wH = wrapper.offsetHeight;
      document.body.style.paddingTop = wH + 'px';
      var nav = document.getElementById('mainNav');
      if(nav) {
        var cs = getComputedStyle(nav);
        if(cs.position === 'fixed') nav.style.top = wH + 'px';
      }
    }
  }

  // ═══ التشغيل ═══
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initBanners);
  } else {
    initBanners();
  }

})();
