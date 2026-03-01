// ══════════════════════════════════════════════════════════
//  subscription.js — مدارك النخبة
//  نظام الاشتراكات الكامل — Supabase + كوبونات
//  آخر تحديث: 2026
// ══════════════════════════════════════════════════════════

// ─── Supabase Client ─────────────────────────────────────
const _SB_URL = 'https://czzcmbxejxbotjemyuqf.supabase.co';
const _SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6emNtYnhlanhib3RqZW15dXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzQ0ODEsImV4cCI6MjA4NTc1MDQ4MX0.xDfG1qsDZGyUrpL44JfqOtk57dVsLaMsvIzJz1KgiR0';

// استخدم الـ client الموجود لو موجود، وإلا أنشئ جديد
function _getSB() {
    if (window.supabase && window._sbClient) return window._sbClient;
    if (window.supabase) {
        window._sbClient = window.supabase.createClient(_SB_URL, _SB_KEY);
        return window._sbClient;
    }
    return null;
}

// ─── Cache محلي (30 ثانية) لتقليل الطلبات ───────────────
let _profileCache = null;
let _profileCacheTime = 0;
const CACHE_TTL = 30000; // 30 ثانية

// ─── الحد المجاني ────────────────────────────────────────
let FREE_LIMIT = 10; // يُحدَّث من قاعدة البيانات

// ══════════════════════════════════════════════════════════
//  1. جلب بيانات المستخدم من Supabase
// ══════════════════════════════════════════════════════════
async function _getProfile() {
    const now = Date.now();
    if (_profileCache && (now - _profileCacheTime) < CACHE_TTL) {
        return _profileCache;
    }

    const sb = _getSB();
    if (!sb) return null;

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;

        const { data: profile } = await sb.from('profiles')
            .select('id, subscription_type, subscription_end, role, full_name, avatar_emoji, gender')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            _profileCache = { ...profile, email: session.user.email };
            _profileCacheTime = now;
        }
        return _profileCache;
    } catch (e) {
        console.error('[Subscription] خطأ في جلب البيانات:', e);
        return null;
    }
}

// مسح الكاش (بعد كل عملية تحديث)
function _clearCache() {
    _profileCache = null;
    _profileCacheTime = 0;
}

// ══════════════════════════════════════════════════════════
//  2. حالة الاشتراك
// ══════════════════════════════════════════════════════════
async function getSubscriptionStatus() {
    const profile = await _getProfile();

    if (!profile) {
        return { plan: 'free', status: 'active', isFree: true, isPaid: false };
    }

    const plan = profile.subscription_type || 'free';
    const isFree = (plan === 'free' || !plan);

    // التحقق من تاريخ انتهاء الاشتراك
    let isExpired = false;
    if (!isFree && profile.subscription_end) {
        isExpired = new Date(profile.subscription_end) < new Date();
    }

    // لو انتهى الاشتراك، حدّث في قاعدة البيانات
    if (isExpired) {
        await _expireSubscription(profile.id);
        _clearCache();
        return { plan: 'free', status: 'expired', isFree: true, isPaid: false, wasExpired: true };
    }

    return {
        plan: isFree ? 'free' : plan,
        status: 'active',
        isFree,
        isPaid: !isFree,
        endDate: profile.subscription_end,
        userId: profile.id,
        role: profile.role,
    };
}

// إنهاء الاشتراك المنتهي تلقائياً
async function _expireSubscription(userId) {
    const sb = _getSB();
    if (!sb) return;
    await sb.from('profiles')
        .update({ subscription_type: 'free', subscription_end: null })
        .eq('id', userId);
}

// ══════════════════════════════════════════════════════════
//  3. عدد المحاولات المجانية المتبقية
// ══════════════════════════════════════════════════════════
async function getRemainingFreeAttempts() {
    const status = await getSubscriptionStatus();
    if (status.isPaid) return Infinity;

    const sb = _getSB();
    if (!sb) return FREE_LIMIT;

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return FREE_LIMIT;

        // جلب الحد من الإعدادات
        const { data: setting } = await sb.from('site_settings')
            .select('value').eq('key', 'free_limit').single();
        if (setting) FREE_LIMIT = parseInt(setting.value) || 10;

        const { count } = await sb.from('attempts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id);

        const used = count || 0;
        return Math.max(0, FREE_LIMIT - used);
    } catch (e) {
        return FREE_LIMIT;
    }
}

// ══════════════════════════════════════════════════════════
//  4. التحقق قبل بدء التدريب
// ══════════════════════════════════════════════════════════
async function checkPracticeAccess() {
    const status = await getSubscriptionStatus();

    if (status.isPaid) {
        return { allowed: true, message: null };
    }

    const remaining = await getRemainingFreeAttempts();

    if (remaining <= 0) {
        return {
            allowed: false,
            message: 'استهلكت المحاولات المجانية',
            action: 'upgrade'
        };
    }

    return {
        allowed: true,
        remaining,
        message: remaining <= 3 ? `تنبيه: متبقي ${remaining} فقط من الأسئلة المجانية` : null
    };
}

// ══════════════════════════════════════════════════════════
//  5. تطبيق الكوبون ✅ (المشكلة الرئيسية — مُصلَحة هنا)
// ══════════════════════════════════════════════════════════
async function applyCoupon(code, selectedPlan) {
    const sb = _getSB();
    if (!sb) return { success: false, message: 'خطأ في الاتصال' };

    code = code.trim().toUpperCase();
    if (!code) return { success: false, message: 'أدخل كود الكوبون' };

    try {
        // 1. جلب الكوبون
        const { data: coupon, error } = await sb.from('coupons')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !coupon) {
            return { success: false, message: 'الكوبون غير موجود أو غير صحيح' };
        }

        // 2. التحقق من الصلاحية
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return { success: false, message: 'هذا الكوبون منتهي الصلاحية' };
        }

        if (coupon.max_uses && (coupon.used_count || 0) >= coupon.max_uses) {
            return { success: false, message: 'تم استنفاد استخدامات هذا الكوبون' };
        }

        // 3. التحقق من الباقة
        // plan_type: 'all' | 'monthly' | 'yearly'
        if (coupon.plan_type !== 'all' && coupon.plan_type !== selectedPlan) {
            const planName = coupon.plan_type === 'monthly' ? 'الشهرية' : 'السنوية';
            return { success: false, message: `هذا الكوبون للباقة ${planName} فقط` };
        }

        // 4. حساب الخصم
        let discountAmount = 0;
        let finalPrice = 0;
        let isFreeAccess = (coupon.discount_type === 'free');

        if (!isFreeAccess) {
            // جلب السعر الحالي
            const prices = await _getPrices();
            const basePrice = selectedPlan === 'monthly' ? prices.monthly : prices.yearly;

            if (coupon.discount_type === 'percentage') {
                discountAmount = Math.round(basePrice * (coupon.discount_value / 100));
            } else if (coupon.discount_type === 'fixed') {
                discountAmount = Math.min(coupon.discount_value, basePrice);
            }
            finalPrice = Math.max(0, basePrice - discountAmount);
            isFreeAccess = (finalPrice === 0);
        }

        // 5. ✅ المدة الصحيحة — من duration_months في الكوبون مباشرة
        // هذا هو سبب المشكلة السابقة: كان يستخدم مدة الباقة (سنوي) بدل مدة الكوبون
        const durationMonths = coupon.duration_months || 1;

        return {
            success: true,
            coupon,
            discountAmount,
            finalPrice,
            isFreeAccess,
            durationMonths, // ✅ هذا هو الصح
            message: isFreeAccess
                ? `✅ كوبون مجاني! ستحصل على اشتراك مدته ${_monthsLabel(durationMonths)}`
                : `✅ خصم ${discountAmount} ريال — السعر النهائي: ${finalPrice} ريال`
        };

    } catch (e) {
        console.error('[Coupon] خطأ:', e);
        return { success: false, message: 'حدث خطأ. حاول مرة ثانية' };
    }
}

// تفعيل الاشتراك بعد الدفع (أو بعد الكوبون المجاني)
async function activateSubscription(plan, durationMonths, couponCode) {
    const sb = _getSB();
    if (!sb) return { success: false };

    try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return { success: false, message: 'يرجى تسجيل الدخول' };

        // ✅ حساب تاريخ الانتهاء بناءً على durationMonths من الكوبون
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (durationMonths || 1));

        // تحديد نوع الاشتراك
        // إذا مدة الكوبون = 12 شهر → yearly، وإلا → monthly
        const subscriptionType = durationMonths >= 12 ? 'yearly' : 'monthly';

        // ✅ تحديث الـ profile
        const { error } = await sb.from('profiles').update({
            subscription_type: subscriptionType,
            subscription_end: endDate.toISOString()
        }).eq('id', session.user.id);

        if (error) return { success: false, message: error.message };

        // ✅ تحديث عداد استخدام الكوبون
        if (couponCode) {
            await sb.from('coupons')
                .update({ used_count: sb.rpc ? undefined : null }) // fallback
                .eq('code', couponCode.toUpperCase());

            // زيادة العداد بشكل صحيح
            await sb.rpc('increment_coupon_usage', { coupon_code: couponCode.toUpperCase() })
                .catch(async () => {
                    // fallback لو مافيه RPC function
                    const { data: c } = await sb.from('coupons')
                        .select('used_count').eq('code', couponCode.toUpperCase()).single();
                    if (c) {
                        await sb.from('coupons')
                            .update({ used_count: (c.used_count || 0) + 1 })
                            .eq('code', couponCode.toUpperCase());
                    }
                });
        }

        _clearCache();

        return {
            success: true,
            subscriptionType,
            endDate,
            durationMonths,
            message: `🎉 تم تفعيل اشتراكك ${subscriptionType === 'yearly' ? 'السنوي' : 'الشهري'} بنجاح!`
        };

    } catch (e) {
        console.error('[Activate] خطأ:', e);
        return { success: false, message: 'حدث خطأ أثناء التفعيل' };
    }
}

// ══════════════════════════════════════════════════════════
//  6. جلب الأسعار من قاعدة البيانات
// ══════════════════════════════════════════════════════════
async function _getPrices() {
    const sb = _getSB();
    const defaults = { monthly: 29, yearly: 228, monthlyOrig: 39, yearlyOrig: 348 };
    if (!sb) return defaults;

    try {
        const { data } = await sb.from('site_settings')
            .select('key, value')
            .in('key', ['price_monthly_original', 'price_monthly_current', 'price_yearly_original', 'price_yearly_current', 'discount_percent']);

        if (!data) return defaults;
        const map = {};
        data.forEach(r => map[r.key] = parseFloat(r.value));

        const mOrig = map['price_monthly_original'] || defaults.monthlyOrig;
        const mCur  = map['price_monthly_current']  || 0;
        const yOrig = map['price_yearly_original']  || defaults.yearlyOrig;
        const yCur  = map['price_yearly_current']   || 0;
        const disc  = map['discount_percent']        || 0;

        let monthly, yearly;
        if (disc > 0 && mOrig > 0) { monthly = Math.round(mOrig * (100 - disc) / 100); }
        else if (mCur > 0) { monthly = mCur; }
        else { monthly = mOrig; }

        if (disc > 0 && yOrig > 0) { yearly = Math.round(yOrig * (100 - disc) / 100); }
        else if (yCur > 0) { yearly = yCur; }
        else { yearly = yOrig; }

        return {
            monthly: monthly,
            yearly: yearly,
            monthlyOrig: mOrig,
            yearlyOrig: yOrig,
        };
    } catch (e) {
        return defaults;
    }
}

async function getPrices() { return await _getPrices(); }

// ══════════════════════════════════════════════════════════
//  7. واجهة المستخدم — عرض حالة الاشتراك
// ══════════════════════════════════════════════════════════
async function displaySubscriptionStatus() {
    const container = document.getElementById('subscriptionStatus');
    if (!container) return;

    const status = await getSubscriptionStatus();

    if (status.isFree) {
        const remaining = await getRemainingFreeAttempts();
        const pct = Math.round((remaining / FREE_LIMIT) * 100);
        container.innerHTML = `
            <div style="background:linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.05));border:1px solid rgba(251,191,36,0.25);border-radius:1rem;padding:16px">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                    <div>
                        <p style="font-weight:800;color:#fbbf24;font-size:.95rem">⚡ تجربة مجانية</p>
                        <p style="font-size:.8rem;color:rgba(251,191,36,0.7);margin-top:2px">متبقي <b>${remaining}</b> من ${FREE_LIMIT} أسئلة</p>
                    </div>
                    <a href="pricing.html" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:8px 18px;border-radius:.75rem;font-weight:700;font-size:.85rem;text-decoration:none">اشترك الآن</a>
                </div>
                <div style="width:100%;background:rgba(251,191,36,0.15);border-radius:99px;height:6px">
                    <div style="width:${pct}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);height:6px;border-radius:99px;transition:.3s"></div>
                </div>
            </div>`;
    } else {
        const planLabel = status.plan === 'yearly' ? '💎 سنوي' : '📅 شهري';
        let endInfo = '';
        if (status.endDate) {
            const d = new Date(status.endDate);
            const daysLeft = Math.ceil((d - new Date()) / 86400000);
            endInfo = `<p style="font-size:.8rem;color:rgba(52,211,153,0.7);margin-top:2px">
                ${daysLeft > 0 ? `ينتهي بعد ${daysLeft} يوم (${d.toLocaleDateString('ar-SA')})` : 'ينتهي اليوم!'}
            </p>`;
        }
        container.innerHTML = `
            <div style="background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05));border:1px solid rgba(16,185,129,0.25);border-radius:1rem;padding:16px">
                <div style="display:flex;align-items:center;justify-content:space-between">
                    <div>
                        <p style="font-weight:800;color:#34d399;font-size:.95rem">${planLabel}</p>
                        ${endInfo}
                    </div>
                    <span style="background:rgba(16,185,129,0.15);color:#34d399;padding:6px 14px;border-radius:.75rem;font-size:.85rem;font-weight:700">✓ نشط</span>
                </div>
            </div>`;
    }
}

// ══════════════════════════════════════════════════════════
//  8. نافذة الترقية
// ══════════════════════════════════════════════════════════
async function showUpgradeModal(message) {
    closeUpgradeModal();
    const prices = await _getPrices();
    const html = `
    <div id="upgradeModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999">
        <div style="background:linear-gradient(135deg,#1a1145,#1e1550);border:1px solid rgba(139,92,246,0.3);border-radius:1.5rem;padding:32px;width:100%;max-width:420px;text-align:center">
            <div style="width:72px;height:72px;margin:0 auto 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem">🔒</div>
            <h3 style="font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:8px">وصلت للحد المجاني</h3>
            <p style="color:rgba(196,181,253,0.7);margin-bottom:24px">${message || 'اشترك الآن للاستمرار بدون حدود'}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
                <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);border-radius:1rem;padding:16px">
                    <p style="color:#818cf8;font-size:.8rem;margin-bottom:4px">شهري</p>
                    <p style="color:#fff;font-weight:900;font-size:1.4rem">${prices.monthly}<span style="font-size:.75rem;color:rgba(255,255,255,0.5)"> ر.س</span></p>
                </div>
                <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);border-radius:1rem;padding:16px">
                    <p style="color:#c4b5fd;font-size:.8rem;margin-bottom:4px">سنوي ⭐</p>
                    <p style="color:#fff;font-weight:900;font-size:1.4rem">${Math.round(prices.yearly/12)}<span style="font-size:.75rem;color:rgba(255,255,255,0.5)"> ر.س/شهر</span></p>
                </div>
            </div>
            <a href="pricing.html" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px;border-radius:.875rem;font-weight:700;margin-bottom:10px;text-decoration:none">شاهد الباقات</a>
            <button onclick="closeUpgradeModal()" style="background:rgba(255,255,255,0.06);color:rgba(196,181,253,0.6);padding:10px;border-radius:.875rem;width:100%;border:none;cursor:pointer;font-size:.9rem">ليس الآن</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeUpgradeModal() {
    const m = document.getElementById('upgradeModal');
    if (m) m.remove();
}

// ══════════════════════════════════════════════════════════
//  9. تحذير اقتراب نهاية التجربة
// ══════════════════════════════════════════════════════════
async function showFreeLimitWarning() {
    const status = await getSubscriptionStatus();
    if (status.isPaid) return;

    const remaining = await getRemainingFreeAttempts();
    if (remaining > 3 || remaining <= 0) return;

    const container = document.getElementById('freeLimitWarning');
    if (!container) return;

    container.classList.remove('hidden');
    container.innerHTML = `
        <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:.875rem;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span style="font-size:1.5rem">⚠️</span>
            <div style="flex:1">
                <p style="font-weight:700;color:#fbbf24;font-size:.9rem">متبقي ${remaining} أسئلة مجانية فقط!</p>
                <p style="color:rgba(251,191,36,0.6);font-size:.8rem">اشترك الآن لتستمر بدون حدود</p>
            </div>
            <a href="pricing.html" style="background:#f59e0b;color:#fff;padding:8px 16px;border-radius:.75rem;font-size:.85rem;font-weight:700;text-decoration:none;white-space:nowrap">اشترك</a>
        </div>`;
}

// ══════════════════════════════════════════════════════════
//  10. صفحة الأسعار — عرض الأسعار الديناميكية
// ══════════════════════════════════════════════════════════
async function initPricingPage() {
    const prices = await _getPrices();

    // تحديث عناصر الصفحة لو موجودة
    const els = {
        'price-monthly': prices.monthly + ' ر.س',
        'price-monthly-orig': prices.monthlyOrig + ' ر.س',
        'price-yearly': prices.yearly + ' ر.س',
        'price-yearly-orig': prices.yearlyOrig + ' ر.س',
        'price-monthly-per': Math.round(prices.monthly) + ' ر.س/شهر',
        'price-yearly-per': Math.round(prices.yearly / 12) + ' ر.س/شهر',
    };

    Object.keys(els).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = els[id];
    });

    return prices;
}

// ══════════════════════════════════════════════════════════
//  11. مدخل تطبيق الكوبون في صفحة الدفع
// ══════════════════════════════════════════════════════════
async function handleCouponInput(inputId, resultId, selectedPlan) {
    const input = document.getElementById(inputId);
    const result = document.getElementById(resultId);
    if (!input || !result) return null;

    const code = input.value.trim();
    if (!code) {
        result.innerHTML = '<p style="color:#f87171;font-size:.85rem">أدخل كود الكوبون أولاً</p>';
        return null;
    }

    result.innerHTML = '<p style="color:rgba(196,181,253,0.6);font-size:.85rem">⏳ جاري التحقق...</p>';

    const res = await applyCoupon(code, selectedPlan);

    if (!res.success) {
        result.innerHTML = `<p style="color:#f87171;font-size:.85rem">❌ ${res.message}</p>`;
        return null;
    }

    result.innerHTML = `
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:.75rem;padding:12px;margin-top:8px">
            <p style="color:#34d399;font-weight:700;font-size:.9rem">${res.message}</p>
            <p style="color:rgba(52,211,153,0.7);font-size:.8rem;margin-top:4px">مدة الاشتراك: ${_monthsLabel(res.durationMonths)}</p>
        </div>`;

    return res; // للاستخدام في منطق الدفع
}

// ══════════════════════════════════════════════════════════
//  12. Helpers
// ══════════════════════════════════════════════════════════
function _monthsLabel(m) {
    if (m === 1) return 'شهر واحد';
    if (m === 2) return 'شهران';
    if (m === 3) return '3 أشهر';
    if (m === 6) return '6 أشهر';
    if (m === 12) return 'سنة كاملة';
    return m + ' أشهر';
}

function canAccessFeature(feature) {
    // نسخة sync للتوافق مع الكود القديم
    // استخدم getSubscriptionStatus() async للدقة
    const cached = _profileCache;
    if (!cached) return feature === 'basic_practice' || feature === 'motivations';
    const isPaid = cached.subscription_type && cached.subscription_type !== 'free';
    if (isPaid) return true;
    return ['basic_practice', 'basic_stats', 'motivations'].includes(feature);
}

// ══════════════════════════════════════════════════════════
//  تصدير كل الوظائف
// ══════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
    window.getSubscriptionStatus    = getSubscriptionStatus;
    window.getRemainingFreeAttempts = getRemainingFreeAttempts;
    window.canAccessFeature         = canAccessFeature;
    window.checkPracticeAccess      = checkPracticeAccess;
    window.applyCoupon              = applyCoupon;
    window.activateSubscription     = activateSubscription;
    window.getPrices                = getPrices;
    window.showUpgradeModal         = showUpgradeModal;
    window.closeUpgradeModal        = closeUpgradeModal;
    window.displaySubscriptionStatus = displaySubscriptionStatus;
    window.showFreeLimitWarning     = showFreeLimitWarning;
    window.initPricingPage          = initPricingPage;
    window.handleCouponInput        = handleCouponInput;
}
