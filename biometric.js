// ══════════════════════════════════════════════════════════
//  biometric.js — مدارك النخبة
//  نظام البصمة (Face ID / Touch ID) للتطبيق فقط
//  يتواصل مع Swift عبر WKWebView message handler
//  يستخدم localStorage للتخزين
// ══════════════════════════════════════════════════════════
(function(){
    'use strict';

    // ── كشف التطبيق ──
    var ua = navigator.userAgent || '';
    var isApp = !!(window.Capacitor || (ua.indexOf('AppleWebKit') > -1 && ua.indexOf('Safari') === -1));
    if(!isApp) return;

    var MAX_FAILURES = 3;
    var STORE_KEY = 'madarek_biometric_enabled';
    var _overlay = null;
    var _failCount = 0;
    var _callbacks = {};
    var _callbackId = 0;

    // ══════════════════════════════════════
    //  Callback system — Swift يرد عبر هذي
    // ══════════════════════════════════════
    window._biometricCallback = function(id, result){
        if(_callbacks[id]){
            _callbacks[id](result);
            delete _callbacks[id];
        }
    };

    function callNative(action, extra){
        return new Promise(function(resolve){
            var id = 'bio_' + (++_callbackId);
            _callbacks[id] = resolve;
            var msg = Object.assign({ action: action, callbackId: id }, extra || {});
            try {
                window.webkit.messageHandlers.biometricAuth.postMessage(msg);
            } catch(e){
                console.log('[Biometric] Native handler not available: ' + e);
                resolve(null);
            }
            // timeout — لو Swift ما رد خلال 10 ثواني
            setTimeout(function(){ if(_callbacks[id]){ _callbacks[id](null); delete _callbacks[id]; } }, 10000);
        });
    }

    // ══════════════════════════════════════
    //  localStorage helpers
    // ══════════════════════════════════════
    window._biometric = window._biometric || {};

    window._biometric.isEnabled = function(){
        return localStorage.getItem(STORE_KEY) === 'true';
    };

    window._biometric.setEnabled = function(val){
        if(val) localStorage.setItem(STORE_KEY, 'true');
        else localStorage.removeItem(STORE_KEY);
    };

    // ══════════════════════════════════════
    //  البصمة — فحص الدعم
    // ══════════════════════════════════════
    window._biometric.checkAvailable = async function(){
        var result = await callNative('check');
        if(!result) return { available: false, type: 'none' };
        console.log('[Biometric] check: available=' + result.available + ', type=' + result.type);
        return { available: !!result.available, type: result.type || 'none' };
    };

    // ══════════════════════════════════════
    //  البصمة — تسجيل الدخول
    // ══════════════════════════════════════
    window._biometric.authenticate = async function(){
        var result = await callNative('authenticate', { reason: 'سجّل دخولك بالبصمة' });
        if(!result) return false;
        console.log('[Biometric] authenticate: success=' + result.success);
        return !!result.success;
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
            removeOverlay();
            try {
                if(window.sb && window.sb.auth) await window.sb.auth.signOut();
                else if(window.SB && window.SB.auth) await window.SB.auth.signOut();
            } catch(e){}
            window.location.href = '/login.html';
            return;
        }

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
        if(!bio.available){ console.log('[Biometric] not available, skipping prompt'); return; }

        if(window._biometric.isEnabled()){ console.log('[Biometric] already enabled'); return; }

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
                var ok = await window._biometric.authenticate();
                if(ok){
                    window._biometric.setEnabled(true);
                    console.log('[Biometric] enabled successfully');
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
        var path = window.location.pathname.toLowerCase();
        if(path.indexOf('login') !== -1 || path.indexOf('register') !== -1 || path.indexOf('demo') !== -1){
            return;
        }

        if(!window._biometric.isEnabled()) return;

        var hasSession = !!(localStorage.getItem('madarek_session_backup') || localStorage.getItem('sb-czzcmbxejxbotjemyuqf-auth-token'));
        if(!hasSession) return;

        createOverlay();
        _failCount = 0;
        runBiometric();
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', initBiometricGuard);
    } else {
        initBiometricGuard();
    }

})();
