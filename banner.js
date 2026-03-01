/* ============================================================
   banner.js — مدارك النخبة
   البنر العلوي العام (من site_settings)
   ============================================================ */

(async function initBanners() {

  // ── 1. اقرأ إعدادات البنر من Supabase ──
  const SUPA_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

  let settings = {};
  try {
    const res = await fetch(SUPA_URL + '/rest/v1/site_settings?select=key,value', {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    const rows = await res.json();
    if (Array.isArray(rows)) rows.forEach(r => settings[r.key] = r.value);
  } catch(e) { console.log('banner: fetch error', e); return; }

  const page = document.body.getAttribute('data-page') || '';

  // ── 2. البنر العلوي العام (public) ──
  renderPublicBanner(settings, page);

  // ── 3. البنر الداخلي (للمشتركين) ──
  renderInternalBanner(settings, page);

})();


/* ── البنر العام ────────────────────────────────────────── */
function renderPublicBanner(s, page) {
  // حذف البنر القديم إن وجد
  document.querySelectorAll('#madarek-top-banner, #top-announcement-bar').forEach(el => {
    // لا نحذف top-announcement-bar لأنه داخل الـ HTML — نخفيه فقط
    if (el.id === 'top-announcement-bar') { el.style.display = 'none'; return; }
    el.remove();
  });

  const mode = s['banner_mode'] || 'off';
  if (mode === 'off') return;

  if (mode === 'range') {
    const now = Date.now();
    const from = s['banner_from'] ? new Date(s['banner_from']).getTime() : 0;
    const to   = s['banner_to']   ? new Date(s['banner_to']).getTime()   : Infinity;
    if (now < from || now > to) return;
  }

  const text   = s['banner_text']   || '';
  const bg     = s['banner_bg']     || '#e91e8c';
  const color  = s['banner_color']  || '#ffffff';
  const size   = (s['banner_size']  || '13') + 'px';
  const motion = s['banner_motion'] || 'marquee';
  const canClose = s['banner_closable'] === 'true';
  const link   = s['banner_link']   || '';
  const linkTxt= s['banner_link_text'] || '';

  if (!text) return;

  // أنشئ البنر
  const bar = document.createElement('div');
  bar.id = 'madarek-top-banner';
  bar.style.cssText = `
    background:${bg};
    color:${color};
    font-size:${size};
    font-family:'Tajawal',sans-serif;
    font-weight:600;
    width:100%;
    position:relative;
    z-index:9999;
    overflow:hidden;
    direction:rtl;
  `;

  let inner = '';

  if (motion === 'marquee') {
    // نكرر النص 5 مرات لضمان استمرارية الحركة
    const repeated = Array(6).fill(text + (linkTxt ? `  ←  ${linkTxt}` : '')).join('    •    ');
    inner = `
      <div style="overflow:hidden;white-space:nowrap;padding:10px 0;">
        <span id="madarek-marquee" style="display:inline-block;padding-left:100%;animation:madarek-scroll 25s linear infinite;">${repeated}</span>
      </div>
    `;
  } else {
    inner = `<div style="text-align:center;padding:10px 16px;">${text}${linkTxt ? ` <a href="${link}" style="color:${color};text-decoration:underline;margin-right:8px;">${linkTxt}</a>` : ''}</div>`;
  }

  if (canClose) {
    inner += `<button onclick="document.getElementById('madarek-top-banner').remove()" 
      style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${color};font-size:18px;cursor:pointer;opacity:.7;padding:0 4px;">✕</button>`;
  }

  bar.innerHTML = inner;

  // CSS للحركة
  if (!document.getElementById('madarek-banner-css')) {
    const style = document.createElement('style');
    style.id = 'madarek-banner-css';
    style.textContent = `
      @keyframes madarek-scroll {
        0%   { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
    `;
    document.head.appendChild(style);
  }

  // أدرج في أول الـ body
  document.body.insertBefore(bar, document.body.firstChild);
}


/* ── البنر الداخلي ──────────────────────────────────────── */
function renderInternalBanner(s, page) {
  const text  = s['internal_banner_text']  || '';
  const mode  = s['internal_banner_mode']  || 'off';
  const pages = s['internal_banner_pages'] || 'all';
  const bg    = s['internal_banner_bg']    || '#10b981';
  const color = s['internal_banner_color'] || '#ffffff';
  const size  = (s['internal_banner_size'] || '13') + 'px';
  const motion= s['internal_banner_motion']|| 'marquee';
  const canClose = s['internal_banner_closable'] === 'true';
  const link  = s['internal_banner_link']  || '';
  const linkTxt = s['internal_banner_link_text'] || '';

  if (!text || mode === 'off') return;

  // تحقق من الصفحة
  if (pages !== 'all' && page && !pages.includes(page)) return;

  // تحقق من تسجيل الدخول
  const needsAuth = pages === 'subscribers' || pages === 'all_subscribers';
  
  // أنشئ البنر
  const bar = document.createElement('div');
  bar.id = 'madarek-internal-banner';
  bar.style.cssText = `
    background:${bg};
    color:${color};
    font-size:${size};
    font-family:'Tajawal',sans-serif;
    font-weight:600;
    width:100%;
    position:relative;
    z-index:9998;
    overflow:hidden;
    direction:rtl;
  `;

  let inner = '';
  if (motion === 'marquee') {
    const repeated = Array(6).fill(text + (linkTxt ? `  ←  ${linkTxt}` : '')).join('    •    ');
    inner = `
      <div style="overflow:hidden;white-space:nowrap;padding:10px 0;">
        <span style="display:inline-block;padding-left:100%;animation:madarek-scroll 30s linear infinite;">${repeated}</span>
      </div>
    `;
  } else {
    inner = `<div style="text-align:center;padding:10px 16px;">${text}${linkTxt ? ` <a href="${link}" style="color:${color};text-decoration:underline;margin-right:8px;">${linkTxt}</a>` : ''}</div>`;
  }

  if (canClose) {
    inner += `<button onclick="document.getElementById('madarek-internal-banner').remove()"
      style="position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:${color};font-size:18px;cursor:pointer;opacity:.7;padding:0 4px;">✕</button>`;
  }

  bar.innerHTML = inner;

  // أدرج بعد البنر العام مباشرة
  const publicBanner = document.getElementById('madarek-top-banner');
  if (publicBanner) {
    publicBanner.after(bar);
  } else {
    document.body.insertBefore(bar, document.body.firstChild);
  }
}