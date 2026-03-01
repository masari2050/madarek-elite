/* banner.js — مدارك النخبة */
(async function initBanners() {
  const SUPA_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';
  let settings = {};
  try {
    const res = await fetch(SUPA_URL + '/rest/v1/site_settings?select=key,value', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    const rows = await res.json();
    if (Array.isArray(rows)) rows.forEach(r => settings[r.key] = r.value);
  } catch(e) { return; }

  // احذف أي بنرات قديمة hardcoded
  document.querySelectorAll('#top-announcement-bar, #madarek-top-banner, #madarek-internal-banner').forEach(el => el.remove());

  const page = document.body.getAttribute('data-page') || '';

  // أضف CSS مرة واحدة فقط
  if (!document.getElementById('madarek-banner-css')) {
    const style = document.createElement('style');
    style.id = 'madarek-banner-css';
    // اتجاه صحيح للعربي: النص يتحرك من اليسار لليمين (translateX من سالب لصفر... لا)
    // الصحيح: النص يبدأ من خارج الشاشة يميناً ويتحرك لليسار
    // لكن في RTL نريد العكس: يبدأ من اليسار ويتحرك يميناً
    // الحل: نستخدم translateX من 0% إلى 100% مع direction ltr على الـ span
    style.textContent = `
      @keyframes madarek-rtl-scroll {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(100vw); }
      }
      #madarek-top-banner .m-marquee span {
        display: inline-block;
        white-space: nowrap;
        animation: madarek-rtl-scroll 30s linear infinite;
        direction: rtl;
      }
      #madarek-internal-banner .m-marquee span {
        display: inline-block;
        white-space: nowrap;
        animation: madarek-rtl-scroll 35s linear infinite;
        direction: rtl;
      }
    `;
    document.head.appendChild(style);
  }

  renderPublicBanner(settings);
  renderInternalBanner(settings, page);
})();

function renderPublicBanner(s) {
  const mode = s['banner_mode'] || 'off';
  if (mode === 'off') return;
  if (mode === 'range') {
    const now = Date.now();
    const from = s['banner_from'] ? new Date(s['banner_from']).getTime() : 0;
    const to   = s['banner_to']   ? new Date(s['banner_to']).getTime()   : Infinity;
    if (now < from || now > to) return;
  }
  const text  = s['banner_text']  || '';  if (!text) return;
  const bg    = s['banner_bg']    || '#e91e8c';
  const color = s['banner_color'] || '#ffffff';
  const size  = (s['banner_size'] || '13') + 'px';
  const canClose = s['banner_closable'] === 'true';

  const bar = document.createElement('div');
  bar.id = 'madarek-top-banner';
  bar.style.cssText = `background:${bg};color:${color};font-size:${size};font-family:'Tajawal',sans-serif;font-weight:600;width:100%;position:relative;z-index:9999;overflow:hidden;`;
  
  const repeated = Array(8).fill(text).join('   •   ');
  bar.innerHTML = `
    <div class="m-marquee" style="padding:10px 0;overflow:hidden;white-space:nowrap;">
      <span>${repeated}</span>
    </div>
    ${canClose ? `<button onclick="this.parentElement.remove()" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${color};font-size:18px;cursor:pointer;">✕</button>` : ''}
  `;
  document.body.insertBefore(bar, document.body.firstChild);
}

function renderInternalBanner(s, page) {
  const mode = s['internal_banner_mode'] || 'off';
  if (mode === 'off') return;
  const text  = s['internal_banner_text'] || '';  if (!text) return;
  const pages = s['internal_banner_pages'] || 'all';
  if (pages !== 'all' && page && !pages.split(',').includes(page)) return;
  const bg    = s['internal_banner_bg']    || '#10b981';
  const color = s['internal_banner_color'] || '#ffffff';
  const size  = (s['internal_banner_size'] || '13') + 'px';
  const canClose = s['internal_banner_closable'] === 'true';

  const bar = document.createElement('div');
  bar.id = 'madarek-internal-banner';
  bar.style.cssText = `background:${bg};color:${color};font-size:${size};font-family:'Tajawal',sans-serif;font-weight:600;width:100%;position:relative;z-index:9998;overflow:hidden;`;
  
  const repeated = Array(8).fill(text).join('   •   ');
  bar.innerHTML = `
    <div class="m-marquee" style="padding:10px 0;overflow:hidden;white-space:nowrap;">
      <span>${repeated}</span>
    </div>
    ${canClose ? `<button onclick="this.parentElement.remove()" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${color};font-size:18px;cursor:pointer;">✕</button>` : ''}
  `;
  const pub = document.getElementById('madarek-top-banner');
  if (pub) pub.after(bar);
  else document.body.insertBefore(bar, document.body.firstChild);
}
