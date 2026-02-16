// نظام إدارة الاشتراكات - خوارز

// الحد المجاني
const FREE_LIMIT = 10;

// التحقق من حالة الاشتراك
function getSubscriptionStatus() {
    const subscription = JSON.parse(localStorage.getItem('khawariz_subscription') || 'null');
    
    if (!subscription) {
        return {
            plan: 'free',
            status: 'active',
            isFree: true,
            isPaid: false
        };
    }
    
    return {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        isFree: false,
        isPaid: true
    };
}

// التحقق من عدد المحاولات المجانية
function getRemainingFreeAttempts() {
    const subscription = getSubscriptionStatus();
    
    // إذا كان مشترك مدفوع، لا حدود
    if (subscription.isPaid) {
        return Infinity;
    }
    
    // حساب المحاولات المستخدمة
    const attempts = JSON.parse(localStorage.getItem('khawariz_attempts') || '[]');
    const used = attempts.length;
    const remaining = Math.max(0, FREE_LIMIT - used);
    
    return remaining;
}

// التحقق من إمكانية الوصول للميزة
function canAccessFeature(feature) {
    const subscription = getSubscriptionStatus();
    
    // المميزات المجانية
    const freeFeatures = [
        'basic_practice',      // 10 أسئلة فقط
        'basic_stats',         // إحصائيات أساسية
        'motivations'          // رسائل تحفيزية
    ];
    
    // المميزات المدفوعة
    const paidFeatures = [
        'unlimited_practice',  // أسئلة غير محدودة
        'review_mistakes',     // مراجعة الأخطاء
        'advanced_stats',      // إحصائيات متقدمة
        'all_questions'        // بنك الأسئلة الكامل
    ];
    
    // إذا كان مشترك مدفوع، كل المميزات متاحة
    if (subscription.isPaid) {
        return true;
    }
    
    // إذا كان مجاني، فقط المميزات المجانية
    return freeFeatures.includes(feature);
}

// التحقق قبل بدء التدريب
function checkPracticeAccess() {
    const subscription = getSubscriptionStatus();
    
    // إذا كان مشترك مدفوع، لا مشكلة
    if (subscription.isPaid) {
        return {
            allowed: true,
            message: null
        };
    }
    
    // التحقق من المحاولات المتبقية
    const remaining = getRemainingFreeAttempts();
    
    if (remaining <= 0) {
        return {
            allowed: false,
            message: 'لقد استهلكت المحاولات المجانية',
            action: 'upgrade'
        };
    }
    
    return {
        allowed: true,
        remaining: remaining,
        message: `متبقي ${remaining} من 10 أسئلة مجانية`
    };
}

// عرض رسالة الترقية
function showUpgradeModal(message) {
    const modal = `
        <div id="upgradeModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <div class="w-20 h-20 mx-auto bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl mb-6">
                    🔒
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-3">وصلت للحد المجاني</h3>
                <p class="text-lg text-gray-600 mb-6">${message || 'اشترك الآن للاستمرار في التدريب'}</p>
                
                <div class="space-y-3">
                    <a href="pricing.html" class="block w-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition">
                        شاهد الباقات
                    </a>
                    <button onclick="closeUpgradeModal()" class="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition">
                        ليس الآن
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modal);
}

// إغلاق نافذة الترقية
function closeUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.remove();
    }
}

// عرض حالة الاشتراك في Dashboard
function displaySubscriptionStatus() {
    const subscription = getSubscriptionStatus();
    const container = document.getElementById('subscriptionStatus');
    
    if (!container) return;
    
    if (subscription.isFree) {
        const remaining = getRemainingFreeAttempts();
        container.innerHTML = `
            <div class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-amber-800">تجربة مجانية</p>
                        <p class="text-sm text-amber-700">متبقي ${remaining} من 10 أسئلة</p>
                    </div>
                    <a href="pricing.html" class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition text-sm">
                        اشترك الآن
                    </a>
                </div>
                <div class="mt-3 w-full bg-amber-200 rounded-full h-2">
                    <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all" style="width: ${(remaining / FREE_LIMIT) * 100}%"></div>
                </div>
            </div>
        `;
    } else {
        const planName = subscription.plan === 'monthly' ? 'شهري' : 'سنوي';
        const planIcon = subscription.plan === 'monthly' ? '📅' : '💎';
        container.innerHTML = `
            <div class="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-green-800">${planIcon} اشتراك ${planName}</p>
                        <p class="text-sm text-green-700">أسئلة غير محدودة</p>
                    </div>
                    <span class="px-4 py-2 bg-green-500 text-white rounded-lg font-medium text-sm">
                        نشط
                    </span>
                </div>
            </div>
        `;
    }
}

// عرض تحذير عند اقتراب نهاية التجربة المجانية
function showFreeLimitWarning() {
    const subscription = getSubscriptionStatus();
    
    if (subscription.isPaid) return;
    
    const remaining = getRemainingFreeAttempts();
    
    if (remaining <= 3 && remaining > 0) {
        const warning = document.getElementById('freeLimitWarning');
        if (warning) {
            warning.classList.remove('hidden');
            warning.innerHTML = `
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">⚠️</span>
                        <div class="flex-1">
                            <p class="font-medium text-amber-800">متبقي ${remaining} أسئلة فقط!</p>
                            <p class="text-sm text-amber-700">اشترك الآن لتستمر بدون حدود</p>
                        </div>
                        <a href="pricing.html" class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition">
                            اشترك
                        </a>
                    </div>
                </div>
            `;
        }
    }
}

// تصدير الوظائف للاستخدام العام
if (typeof window !== 'undefined') {
    window.getSubscriptionStatus = getSubscriptionStatus;
    window.getRemainingFreeAttempts = getRemainingFreeAttempts;
    window.canAccessFeature = canAccessFeature;
    window.checkPracticeAccess = checkPracticeAccess;
    window.showUpgradeModal = showUpgradeModal;
    window.closeUpgradeModal = closeUpgradeModal;
    window.displaySubscriptionStatus = displaySubscriptionStatus;
    window.showFreeLimitWarning = showFreeLimitWarning;
}
