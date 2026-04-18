/**
 * whatsapp-float.js — أيقونة واتساب عائمة مشتركة لكل صفحات v2
 * - يقرأ الرقم من site_settings (key = whatsapp_number)
 * - يعمل مع Supabase الحقيقي أو Mock
 * - يُحقن تلقائياً بعد DOMContentLoaded
 */
(function(){
'use strict';

// مجرد تحميل الأنماط (CSS) — ثم الحقن بعد ما الـ DOM يكون جاهز
const STYLES = `
.wa-float-btn{
    position:fixed;
    bottom:82px;
    left:16px;
    width:52px;
    height:52px;
    border-radius:50%;
    background:#25D366;
    display:grid;
    place-items:center;
    z-index:90;
    box-shadow:0 4px 16px rgba(37,211,102,.35),0 2px 6px rgba(0,0,0,.15);
    cursor:pointer;
    transition:transform .2s, box-shadow .2s;
    text-decoration:none;
    border:none;
    font-family:inherit;
    animation:waPulse 2.4s ease-in-out infinite;
}
.wa-float-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(37,211,102,.5)}
.wa-float-btn:active{transform:scale(.95)}
.wa-float-btn svg{width:26px;height:26px;stroke:#fff;fill:#fff;stroke-width:0}
@keyframes waPulse{
    0%,100%{box-shadow:0 4px 16px rgba(37,211,102,.35),0 2px 6px rgba(0,0,0,.15),0 0 0 0 rgba(37,211,102,.45)}
    50%{box-shadow:0 4px 16px rgba(37,211,102,.35),0 2px 6px rgba(0,0,0,.15),0 0 0 12px rgba(37,211,102,0)}
}
/* على الشاشات الكبيرة (admin-v2) ارفعها فوق قليلاً لأنه ما فيه bottom nav */
@media (min-width:768px){
    .wa-float-btn{bottom:20px}
}
`;

async function getWhatsAppNumber() {
    // قراءة من site_settings
    try {
        if (!window.supabase) return '+966553339885';
        const sb = window.__MOCK_CLIENT || (window.supabase.createClient(
            'https://czzcmbxejxbotjemyuqf.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0'
        ));
        const { data } = await sb.from('site_settings')
            .select('value').eq('key','whatsapp_number').maybeSingle();
        if (data && data.value) return data.value;
    } catch(e){}
    return '+966553339885'; // fallback
}

function normalizeNumber(n) {
    if (!n) return '966500000000';
    // أزل كل شيء غير رقم
    return String(n).replace(/[^0-9]/g, '');
}

function inject() {
    // تجاهل لو موجود مسبقاً
    if (document.querySelector('.wa-float-btn')) return;

    // أضف الأنماط
    if (!document.getElementById('wa-float-styles')) {
        const style = document.createElement('style');
        style.id = 'wa-float-styles';
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // أنشئ الزر (الرقم يُحدّث لاحقاً)
    const btn = document.createElement('a');
    btn.className = 'wa-float-btn';
    btn.href = 'https://wa.me/966500000000';
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.setAttribute('aria-label', 'تواصل واتساب');
    btn.title = 'تواصل معنا عبر واتساب';
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6 0-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5 0 1.5 1.1 2.9 1.2 3.1.1.2 2.1 3.2 5.1 4.5 2.5 1.1 3.1.9 3.6.8.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.3 1.2 4.7L2 22l5.4-1.2c1.4.8 3 1.2 4.6 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>';
    document.body.appendChild(btn);

    // حدّث الرقم من DB (async)
    getWhatsAppNumber().then(n => {
        const clean = normalizeNumber(n);
        btn.href = 'https://wa.me/' + clean + '?text=' + encodeURIComponent('مرحباً، أحتاج مساعدة بخصوص مدارك النخبة');
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
} else {
    inject();
}

// اكشفها عالمياً للتعديل
window.MadarekWA = { inject, getNumber: getWhatsAppNumber };
})();
