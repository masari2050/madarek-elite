/* ════════════════════════════════════════════════════════════════
   haptics.js — نظام مركزي للاهتزاز (haptic feedback)
   ────────────────────────────────────────────────────────────────
   القاعدة الذهبية: لا اهتزاز يتجاوز 50ms

   الدوال المتاحة (window.*):
     hapticLight()    — 10ms        نقرة زر، تفاعل عادي
     hapticMedium()   — 30ms        تنبيه لطيف، محتوى مقفل
     hapticSuccess()  — [10,50,10]  إجابة صحيحة (pulse-pause-pulse)
     hapticError()    — 40ms        إجابة خاطئة (خفيف)
     hapticWarning()  — 25ms        تحذير عام

   السلوك حسب المنصة:
     iOS Safari       : navigator.vibrate (مدعوم منذ iOS 16.4)
     Android Chrome   : navigator.vibrate
     Desktop          : no-op (silent skip)
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  // كشف دعم navigator.vibrate
  var hasVibrate = typeof navigator !== 'undefined'
    && typeof navigator.vibrate === 'function';

  // احترام تفضيل المستخدم (prefers-reduced-motion)
  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch(_) {}

  function vib(pattern) {
    if (!hasVibrate || reducedMotion) return false;
    try { navigator.vibrate(pattern); return true; } catch(_) { return false; }
  }

  // ── الـ API العامة ──
  window.hapticLight   = function(){ vib(10); };
  window.hapticMedium  = function(){ vib(30); };
  window.hapticSuccess = function(){ vib([10, 50, 10]); };  // pulse-pause-pulse
  window.hapticError   = function(){ vib(40); };
  window.hapticWarning = function(){ vib(25); };

  // alias مفيدة
  window.haptics = {
    light:   window.hapticLight,
    medium:  window.hapticMedium,
    success: window.hapticSuccess,
    error:   window.hapticError,
    warning: window.hapticWarning,
    supported: hasVibrate && !reducedMotion
  };
})();
