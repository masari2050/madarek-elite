/* ════════════════════════════════════════════════════════════════
   locked-modal.js — modal مشترك للمحتوى المقفل (للمشتركين فقط)
   ────────────────────────────────────────────────────────────────
   API:
     showLockedModal({ title?, body?, ctaText? })
     closeLockedModal()

   يستدعى haptic feedback تلقائياً (hapticMedium لو متاح).
   يتطلب تحميل haptics.js قبله (اختياري — يعمل بدونه أيضاً).
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var INJECTED = false;

  var CSS = ''
    + '.lockmd-back{position:fixed;inset:0;background:rgba(15,17,40,.55);backdrop-filter:blur(4px);z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;animation:lockmdFade .2s ease}'
    + '.lockmd-back.on{display:flex}'
    + '@keyframes lockmdFade{from{opacity:0}to{opacity:1}}'
    + '@keyframes lockmdSlide{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}'
    + '.lockmd-card{background:#fff;border-radius:22px;padding:28px 24px 22px;max-width:340px;width:100%;text-align:center;animation:lockmdSlide .25s cubic-bezier(.25,.8,.25,1);box-shadow:0 20px 60px rgba(15,17,40,.3)}'
    + '[data-t="d"] .lockmd-card,html.dark .lockmd-card{background:#1A1D2E;color:#F0F0F6}'
    + '.lockmd-ic{width:64px;height:64px;border-radius:50%;background:rgba(124,58,237,.14);display:grid;place-items:center;margin:0 auto 14px}'
    + '.lockmd-ic svg{width:30px;height:30px;stroke:#7C3AED;fill:none;stroke-width:2.2;stroke-linecap:round}'
    + '.lockmd-title{font-size:16px;font-weight:800;margin-bottom:8px;color:#1A1D2E}'
    + '[data-t="d"] .lockmd-title,html.dark .lockmd-title{color:#F0F0F6}'
    + '.lockmd-body{font-size:13.5px;color:#3D4058;line-height:1.7;margin-bottom:20px}'
    + '[data-t="d"] .lockmd-body,html.dark .lockmd-body{color:#C4C6D6}'
    + '.lockmd-btns{display:flex;gap:10px;flex-direction:column}'
    + '.lockmd-cta{padding:13px;border-radius:13px;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:#fff;font-size:14px;font-weight:700;border:none;font-family:inherit;cursor:pointer;transition:transform .15s,box-shadow .2s;box-shadow:0 6px 18px rgba(124,58,237,.32)}'
    + '.lockmd-cta:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(124,58,237,.42)}'
    + '.lockmd-cta:active{transform:scale(.98)}'
    + '.lockmd-skip{padding:11px;border-radius:11px;background:transparent;color:#6B7094;font-size:13px;font-weight:600;border:1px solid rgba(0,0,0,.08);font-family:inherit;cursor:pointer;transition:background .15s}'
    + '[data-t="d"] .lockmd-skip,html.dark .lockmd-skip{color:#8A8DA6;border-color:rgba(255,255,255,.09)}'
    + '.lockmd-skip:hover{background:rgba(0,0,0,.03)}';

  var HTML = ''
    + '<div class="lockmd-back" id="lockedModal" onclick="if(event.target===this)closeLockedModal()" role="dialog" aria-modal="true" aria-labelledby="lockedModalTitle">'
    +   '<div class="lockmd-card">'
    +     '<div class="lockmd-ic" aria-hidden="true">'
    +       '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    +     '</div>'
    +     '<div class="lockmd-title" id="lockedModalTitle">هذا المحتوى للمشتركين</div>'
    +     '<div class="lockmd-body" id="lockedModalBody">اشترك الآن لفتح كل التدريبات والتسريبات</div>'
    +     '<div class="lockmd-btns">'
    +       '<button class="lockmd-cta" id="lockedModalCta" onclick="window.location.href=\'/pricing.html\'">اشترك</button>'
    +       '<button class="lockmd-skip" onclick="closeLockedModal()">لاحقاً</button>'
    +     '</div>'
    +   '</div>'
    + '</div>';

  function inject() {
    if (INJECTED) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap.firstChild);
    INJECTED = true;
  }

  // ESC closes
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') closeLockedModal();
  });

  window.showLockedModal = function(opts) {
    inject();
    opts = opts || {};
    if (opts.title)   document.getElementById('lockedModalTitle').textContent = opts.title;
    if (opts.body)    document.getElementById('lockedModalBody').textContent  = opts.body;
    if (opts.ctaText) document.getElementById('lockedModalCta').textContent   = opts.ctaText;
    document.getElementById('lockedModal').classList.add('on');
    if (typeof window.hapticMedium === 'function') window.hapticMedium();
  };

  window.closeLockedModal = function() {
    var el = document.getElementById('lockedModal');
    if (el) el.classList.remove('on');
  };
})();
