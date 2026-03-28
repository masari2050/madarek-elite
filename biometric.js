// ══════════════════════════════════════════════════════════
//  biometric.js — مدارك النخبة
//  نظام البصمة (Face ID / Touch ID) للتطبيق فقط
//  يعمل مع Capacitor + @aparajita/capacitor-biometric-auth
//  + @capacitor/preferences
// ══════════════════════════════════════════════════════════
(function(){
    'use strict';

    // ── كشف التطبيق (نفس طريقة باقي الملفات) ──
    var ua = navigator.userAgent || '';
    var isApp = !!(window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1));
    console.log('[Biometric] isApp=' + isApp + ', Capacitor=' + !!window.Capacitor);
    if(!isApp) return; // المتصفح ما يحتاج بصمة

    var MAX_FAILURES = 3;
    var PREF_KEY = 'biometric_enabled';
    var _overlay = null;
    var _failCount = 0;

    // ── الوصول للـ Plugins عبر Bridge ──
    function getBiometricPlugin(){
        try {
            var p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BiometricAuthNative;
            console.log('[Biometric] plugin BiometricAuthNative=' + !!p);
            return p || null;
        } catch(e){ console.log('[Biometric] plugin error: ' + e); return null; }
    }
    function getPreferencesPlugin(){
        try {
            var p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
            console.log('[Biometric] plugin Preferences=' + !!p);
            return p || null;
        } catch(e){ return null; }
    }

    // ══════════════════════════════════════
    //  Preferences helpers
    // ══════════════════════════════════════
    window._biometric = window._biometric || {};

    window._biometric.isEnabled = async function(){
        var prefs = getPreferencesPlugin();
        if(!prefs) return false;
        try {
            var res = await prefs.get({ key: PREF_KEY });
            return res.value === 'true';
        } catch(e){ return false; }
    };

    window._biometric.setEnabled = async function(val){
        var prefs = getPreferencesPlugin();
        if(!prefs) return;
        try {
            if(val){
                await prefs.set({ key: PREF_KEY, value: 'true' });
            } else {
                await prefs.remove({ key: PREF_KEY });
            }
        } catch(e){}
    };

    // ══════════════════════════════════════
    //  البصمة — فحص الدعم
    // ══════════════════════════════════════
    window._biometric.checkAvailable = async function(){
        var plugin = getBiometricPlugin();
        if(!plugin) return { available: false, type: 'none' };
        try {
            var res = await plugin.checkBiometry();
            var typeName = 'none';
            // biometryType: 0=none, 1=touchId, 2=faceId, 3=fingerprint, 4=faceAuth
            if(res.biometryType === 1) typeName = 'Touch ID';
            else if(res.biometryType === 2) typeName = 'Face ID';
            else if(res.biometryType === 3) typeName = 'بصمة الإصبع';
            else if(res.biometryType === 4) typeName = 'التعرف على الوجه';
            else if(res.biometryType > 0) typeName = 'بصمة';
            return { available: !!res.isAvailable, type: typeName };
        } catch(e){ return { available: false, type: 'none' }; }
    };

    // ══════════════════════════════════════
    //  البصمة — تسجيل الدخول
    // ══════════════════════════════════════
    window._biometric.authenticate = async function(){
        var plugin = getBiometricPlugin();
        if(!plugin) return false;
        try {
            await plugin.authenticate({
                reason: 'سجّل دخولك بالبصمة',
                cancelTitle: 'إلغاء',
                allowDeviceCredential: false
            });
            return true; // نجحت
        } catch(e){
            return false; // فشلت أو ألغاها المستخدم
        }
    };

    // ══════════════════════════════════════
    //  Overlay — شاشة القفل
    // ══════════════════════════════════════
    function createOverlay(){
        if(_overlay) return _overlay;
        _overlay = document.createElement('div');
        _overlay.id = 'biometric-overlay';
        _overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
        _overlay.innerHTML = '<div style="font-size:48px;">🔒</div>'
            + '<div style="color:#fff;font-size:18px;font-family:sans-serif;">سجّل دخولك بالبصمة</div>'
            + '<button id="bio-retry-btn" style="display:none;margin-top:12px;padding:10px 28px;border-radius:12px;border:none;background:#6c63ff;color:#fff;font-size:16px;cursor:pointer;font-family:sans-serif;">حاول مرة ثانية</button>'
            + '<div id="bio-fail-msg" style="display:none;color:#ff6b6b;font-size:14px;font-family:sans-serif;margin-top:8px;"></div>';
        document.body.appendChild(_overlay);

        var retryBtn = document.getElementById('bio-retry-btn');
        if(retryBtn){
            retryBtn.addEventListener('click', function(){
                retryBtn.style.display = 'none';
                document.getElementById('bio-fail-msg').style.display = 'none';
                runBiometric();
            });
        }
        return _overlay;
    }

    function removeOverlay(){
        if(_overlay && _overlay.parentNode){
            _overlay.parentNode.removeChild(_overlay);
            _overlay = null;
        }
    }

    // ══════════════════════════════════════
    //  تشغيل البصمة
    // ══════════════════════════════════════
    async function runBiometric(){
        var success = await window._biometric.authenticate();
        if(success){
            _failCount = 0;
            removeOverlay();
            return;
        }

        _failCount++;
        if(_failCount >= MAX_FAILURES){
            // 3 محاولات فشلت — ارجع لتسجيل الدخول
            removeOverlay();
            // امسح الجلسة عشان يسجل دخول من جديد
            try {
                if(window.sb && window.sb.auth) await window.sb.auth.signOut();
                else if(window.SB && window.SB.auth) await window.SB.auth.signOut();
            } catch(e){}
            window.location.href = '/login.html';
            return;
        }

        // اعرض زر إعادة المحاولة
        var retryBtn = document.getElementById('bio-retry-btn');
        var failMsg = document.getElementById('bio-fail-msg');
        if(retryBtn) retryBtn.style.display = 'block';
        if(failMsg){
            failMsg.style.display = 'block';
            failMsg.textContent = 'المحاولة ' + _failCount + ' من ' + MAX_FAILURES + ' — حاول مرة ثانية';
        }
    }

    // ══════════════════════════════════════
    //  عرض prompt التفعيل (أول مرة)
    // ══════════════════════════════════════
    window._biometric.promptEnable = async function(){
        console.log('[Biometric] promptEnable called');
        var bio = await window._biometric.checkAvailable();
        console.log('[Biometric] available=' + bio.available + ', type=' + bio.type);
        if(!bio.available) return;

        var alreadyEnabled = await window._biometric.isEnabled();
        console.log('[Biometric] alreadyEnabled=' + alreadyEnabled);
        if(alreadyEnabled) return;

        // Modal
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
        modal.innerHTML = '<div style="background:#1e1e3a;border-radius:20px;padding:32px 24px;max-width:320px;text-align:center;color:#fff;font-family:sans-serif;">'
            + '<div style="font-size:48px;margin-bottom:12px;">🔐</div>'
            + '<div style="font-size:18px;font-weight:bold;margin-bottom:8px;">تفعيل الدخول بالبصمة</div>'
            + '<div style="font-size:14px;color:#aaa;margin-bottom:20px;">سجّل دخولك بـ ' + bio.type + ' بدون ما تكتب إيميل أو كلمة مرور</div>'
            + '<div style="display:flex;gap:10px;justify-content:center;">'
            + '<button id="bio-enable-btn" style="padding:10px 24px;border-radius:12px;border:none;background:#6c63ff;color:#fff;font-size:15px;cursor:pointer;">تفعيل</button>'
            + '<button id="bio-later-btn" style="padding:10px 24px;border-radius:12px;border:1px solid #444;background:transparent;color:#aaa;font-size:15px;cursor:pointer;">لاحقاً</button>'
            + '</div></div>';

        document.body.appendChild(modal);

        return new Promise(function(resolve){
            document.getElementById('bio-enable-btn').addEventListener('click', async function(){
                // جرّب البصمة أول (عشان يوافق النظام)
                var ok = await window._biometric.authenticate();
                if(ok){
                    await window._biometric.setEnabled(true);
                }
                modal.parentNode.removeChild(modal);
                resolve(ok);
            });
            document.getElementById('bio-later-btn').addEventListener('click', function(){
                modal.parentNode.removeChild(modal);
                resolve(false);
            });
        });
    };

    // ══════════════════════════════════════
    //  التشغيل التلقائي عند فتح الصفحة
    // ══════════════════════════════════════
    async function initBiometricGuard(){
        // لا تشغّل البصمة على صفحة تسجيل الدخول أو التسجيل أو الديمو
        var path = window.location.pathname.toLowerCase();
        if(path.indexOf('login') !== -1 || path.indexOf('register') !== -1 || path.indexOf('demo') !== -1){
            return;
        }

        var enabled = await window._biometric.isEnabled();
        if(!enabled) return;

        // تأكد إن فيه جلسة محفوظة أصلاً
        var hasSession = !!(localStorage.getItem('madarek_session_backup') || localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token'));
        if(!hasSession) return; // ما فيه جلسة — خله يسجل دخول عادي

        // اعرض overlay فوراً
        createOverlay();

        // شغّل البصمة
        _failCount = 0;
        runBiometric();
    }

    // ── ابدأ بعد تحميل DOM ──
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initBiometricGuard);
    } else {
        initBiometricGuard();
    }

})();
