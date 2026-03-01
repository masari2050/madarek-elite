/**
 * banner.js — نظام البنر الديناميكي لمدارك النخبة
 * أضف هذا السطر قبل </body> في أي صفحة:
 * <script src="banner.js"></script>
 *
 * وأضف data-page على الـ body:
 * <body data-page="dashboard">
 *
 * قيم data-page المتاحة:
 * index | pricing | login | register | dashboard | practice | stats | mistakes | profile | select-section | results | mistakes | any
 */

(function() {
    const SUPABASE_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

    // CSS للبنر
    const style = document.createElement('style');
    style.textContent = `
        #madarek-banner-wrap {
            position: relative;
            z-index: 9999;
            width: 100%;
        }
        .madarek-banner {
            width: 100%;
            overflow: hidden;
            display: none;
        }
        .madarek-banner.banner-static .banner-inner {
            text-align: center;
            padding: 10px 20px;
        }
        .madarek-banner.banner-marquee .banner-inner {
            white-space: nowrap;
            overflow: hidden;
        }
        .madarek-banner.banner-marquee .banner-text-span {
            display: inline-block;
            animation: madarek-marquee 30s linear infinite;
        }
        @keyframes madarek-marquee {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100vw); }
        }
        .madarek-banner .banner-inner {
            padding: 9px 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .madarek-banner .banner-close {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            cursor: pointer;
            color: inherit;
            font-size: 13px;
            line-height: 22px;
            text-align: center;
            opacity: 0.7;
            transition: opacity .2s;
            padding: 0;
        }
        .madarek-banner .banner-close:hover { opacity: 1; }
    `;
    document.head.appendChild(style);

    // نحدد الصفحة الحالية
    const currentPage = document.body.getAttribute('data-page') || 'unknown';

    // نجيب الإعدادات من Supabase
    async function fetchSettings() {
        try {
            const resp = await fetch(
                `${SUPABASE_URL}/rest/v1/site_settings?select=key,value`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY
                    }
                }
            );
            if (!resp.ok) return null;
            const rows = await resp.json();
            const s = {};
            rows.forEach(r => { s[r.key] = r.value; });
            return s;
        } catch(e) { return null; }
    }

    // نحدد إذا البنر يظهر في هذه الصفحة
    function shouldShowOnPage(pages) {
        if (!pages || pages === 'all') return true;
        if (pages === 'none') return false;
        const list = pages.split(',').map(p => p.trim());
        return list.includes(currentPage) || list.includes('all');
    }

    // نتحقق من التاريخ
    function isWithinDateRange(from, to) {
        const now = new Date();
        if (from && now < new Date(from)) return false;
        if (to   && now > new Date(to))   return false;
        return true;
    }

    // نبني البنر
    function buildBanner(cfg, prefix) {
        const mode    = cfg[prefix + 'mode']    || 'always';
        const text    = cfg[prefix + 'text']    || '';
        const bg      = cfg[prefix + 'bg']      || '#6366f1';
        const color   = cfg[prefix + 'color']   || '#ffffff';
        const size    = cfg[prefix + 'size']    || '13';
        const bold    = cfg[prefix + 'bold']    === 'true';
        const italic  = cfg[prefix + 'italic']  === 'true';
        const emoji   = cfg[prefix + 'emoji']   || '';
        const style   = cfg[prefix + 'style']   || 'marquee'; // marquee | static
        const pages   = cfg[prefix + 'pages']   || 'all';
        const closable= cfg[prefix + 'closable']=== 'true';
        const from    = cfg[prefix + 'from']    || '';
        const to      = cfg[prefix + 'to']      || '';
        const link    = cfg[prefix + 'link']    || '';
        const linkTxt = cfg[prefix + 'link_text']|| '';

        if (mode === 'off' || !text) return null;
        if (mode === 'range' && !isWithinDateRange(from, to)) return null;
        if (!shouldShowOnPage(pages)) return null;

        const div = document.createElement('div');
        div.className = `madarek-banner banner-${style}`;
        div.style.background = bg;
        div.style.color = color;
        div.style.fontSize = size + 'px';
        div.style.display = 'block';
        div.style.position = 'relative';

        const textStyle = [
            bold   ? 'font-weight:900' : 'font-weight:500',
            italic ? 'font-style:italic' : ''
        ].filter(Boolean).join(';');

        const fullText = (emoji ? emoji + ' ' : '') + text + (emoji ? ' ' + emoji : '');
        const linkHtml = link
            ? ` <a href="${link}" style="color:inherit;text-decoration:underline;opacity:0.85;margin-right:8px">${linkTxt || '←'}</a>`
            : '';

        const inner = style === 'marquee'
            ? `<div class="banner-inner"><span class="banner-text-span" style="${textStyle}">${fullText}${linkHtml}</span></div>`
            : `<div class="banner-inner"><span style="${textStyle}">${fullText}</span>${linkHtml}</div>`;

        const closeBtn = closable
            ? `<button class="banner-close" onclick="this.closest('.madarek-banner').style.display='none'" title="إغلاق">×</button>`
            : '';

        div.innerHTML = inner + closeBtn;
        return div;
    }

    // الدالة الرئيسية
    async function init() {
        const cfg = await fetchSettings();
        if (!cfg) return;

        // نبني wrapper
        const wrap = document.createElement('div');
        wrap.id = 'madarek-banner-wrap';

        // بنر 1 — عام (للزوار)
        const b1 = buildBanner(cfg, 'banner_');
        if (b1) wrap.appendChild(b1);

        // بنر 2 — داخلي (للمشتركين)
        const b2 = buildBanner(cfg, 'banner2_');
        if (b2) wrap.appendChild(b2);

        // نضيف في أول الـ body
        if (wrap.children.length > 0) {
            document.body.insertBefore(wrap, document.body.firstChild);
        }
    }

    // نشغّل بعد تحميل الـ DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
