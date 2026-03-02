(function(){
    /* ── أيقونة واتساب العائمة — مدارك النخبة ── */
    var WA_NUMBER = '966553339885';
    var WA_MSG = 'السلام عليكم، عندي استفسار عن منصة مدارك النخبة';

    var style = document.createElement('style');
    style.textContent = ''
        +'.wa-float{position:fixed;bottom:24px;left:24px;z-index:900;display:flex;flex-direction:column;align-items:flex-start;gap:8px;direction:ltr}'
        +'.wa-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#25d366,#128c7e);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(37,211,102,0.4);transition:all .3s ease;border:none;outline:none;position:relative}'
        +'.wa-btn:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(37,211,102,0.55)}'
        +'.wa-btn svg{width:28px;height:28px;fill:#fff}'
        +'.wa-pulse{position:absolute;inset:0;border-radius:50%;background:rgba(37,211,102,0.3);animation:wa-ping 2s cubic-bezier(0,0,0.2,1) infinite;pointer-events:none}'
        +'@keyframes wa-ping{75%,100%{transform:scale(1.8);opacity:0}}'
        +'.wa-tooltip{background:rgba(255,255,255,0.95);color:#1a1a2e;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;padding:8px 14px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.15);white-space:nowrap;opacity:0;transform:translateX(-8px);transition:all .3s ease;pointer-events:none;direction:rtl}'
        +'.wa-float:hover .wa-tooltip{opacity:1;transform:translateX(0)}'
        +'@media(max-width:640px){.wa-float{bottom:16px;left:16px}.wa-btn{width:50px;height:50px}.wa-btn svg{width:24px;height:24px}.wa-tooltip{display:none}}';
    document.head.appendChild(style);

    var widget = document.createElement('div');
    widget.className = 'wa-float';
    widget.innerHTML = ''
        +'<div class="wa-tooltip">تحتاج مساعدة؟ كلّمنا!</div>'
        +'<a href="https://wa.me/'+WA_NUMBER+'?text='+encodeURIComponent(WA_MSG)+'" target="_blank" rel="noopener" class="wa-btn" aria-label="تواصل واتساب">'
        +'<div class="wa-pulse"></div>'
        +'<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.325 0-4.47-.744-6.228-2.006l-.365-.27-2.645.887.887-2.645-.27-.365A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>'
        +'</a>';
    document.body.appendChild(widget);
})();
