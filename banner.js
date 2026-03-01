/**
 * banner.js — مدارك النخبة v3.0
 * Fixed: no overlap, proper positioning
 */
(function() {
  'use strict';
  const SB_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';
  const INTERNAL = ['dashboard','practice','stats','mistakes','profile','select-section'];
  const PAGE = document.body ? (document.body.getAttribute('data-page')||'') : '';
  const IS_INT = INTERNAL.includes(PAGE);

  async function fetchSettings() {
    try {
      const r = await fetch(SB_URL+'/rest/v1/site_settings?select=key,value', {
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
      });
      const rows = await r.json();
      if (!Array.isArray(rows)) return {};
      const s = {};
      rows.forEach(x => s[x.key]=x.value);
      return s;
    } catch(e){ return {}; }
  }

  function isActive(s, pfx) {
    const mode = s[pfx+'_mode']||'off';
    if (mode==='off') return false;
    if (mode==='always') return true;
    if (mode==='range') {
      const now=new Date();
      const fr=s[pfx+'_from']?new Date(s[pfx+'_from']):null;
      const to=s[pfx+'_to']?new Date(s[pfx+'_to']):null;
      if(fr&&now<fr) return false;
      if(to&&now>to) return false;
      return true;
    }
    return false;
  }

  function addCSS() {
    if(document.getElementById('mb-css')) return;
    const st=document.createElement('style');
    st.id='mb-css';
    st.textContent=`
      .mb-bar{width:100%;box-sizing:border-box;font-family:'Tajawal',sans-serif;direction:rtl;position:relative;z-index:9999;overflow:hidden;flex-shrink:0}
      .mb-inner{display:flex;align-items:center;justify-content:center;padding:7px 44px;min-height:34px;position:relative}
      .mb-text{flex:1;text-align:center;overflow:hidden}
      .mb-scroll{display:inline-block;white-space:nowrap;animation:mb-mq 22s linear infinite}
      .mb-static{display:inline;white-space:normal}
      .mb-close{position:absolute;left:10px;top:50%;transform:translateY(-50%);background:none;border:none;font-size:20px;cursor:pointer;opacity:.75;line-height:1;padding:0 4px}
      .mb-link{text-decoration:underline;font-weight:bold;margin-right:8px;flex-shrink:0}
      @keyframes mb-mq{0%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
    `;
    document.head.appendChild(st);
  }

  function makeBanner(id,text,bg,color,size,motion,link,linkTxt,closeable) {
    if(!text) return null;
    if(sessionStorage.getItem('mb-closed-'+id)) return null;
    const bar=document.createElement('div');
    bar.id=id; bar.className='mb-bar';
    bar.style.background=bg; bar.style.color=color; bar.style.fontSize=size+'px';
    const inner=document.createElement('div');
    inner.className='mb-inner';
    if(link&&linkTxt){
      const a=document.createElement('a');
      a.href=link; a.textContent=linkTxt; a.className='mb-link'; a.style.color=color;
      inner.appendChild(a);
    }
    const wrap=document.createElement('div'); wrap.className='mb-text';
    const span=document.createElement('span');
    span.className=motion==='scroll'?'mb-scroll':'mb-static';
    span.textContent=text;
    wrap.appendChild(span); inner.appendChild(wrap);
    if(closeable){
      const btn=document.createElement('button');
      btn.className='mb-close'; btn.textContent='×'; btn.style.color=color;
      btn.onclick=()=>{bar.style.display='none';sessionStorage.setItem('mb-closed-'+id,'1');};
      inner.appendChild(btn);
    }
    bar.appendChild(inner);
    return bar;
  }

  function insertTop(el) {
    if(!el) return;
    document.body.insertBefore(el,document.body.firstChild);
  }

  async function init() {
    addCSS();
    const s=await fetchSettings();

    if(IS_INT && isActive(s,'inner_banner')) {
      const pages=s['inner_banner_pages']||'all';
      const show=pages==='all'||pages.split(',').map(p=>p.trim()).includes(PAGE);
      if(show){
        const bar=makeBanner('mb-internal',s['inner_banner_text']||'',s['inner_banner_bg']||'#10b981',s['inner_banner_color']||'#fff',s['inner_banner_size']||13,s['inner_banner_motion']||'scroll',s['inner_banner_link']||'',s['inner_banner_link_text']||'',s['inner_banner_closeable']==='true');
        insertTop(bar);
      }
    }

    if(isActive(s,'banner')) {
      const bar=makeBanner('mb-public',s['banner_text']||'',s['banner_bg']||'#6366f1',s['banner_color']||'#fff',s['banner_size']||13,s['banner_motion']||'scroll',s['banner_link']||'',s['banner_link_text']||'',s['banner_closeable']==='true');
      insertTop(bar);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();