/**
 * preview-mock.js — Supabase Client محاكي كامل لوضع ?preview
 * يُحمّل بعد @supabase/supabase-js ويستبدل client الحقيقي بـ mock محلي
 * البيانات تُحفظ في localStorage للاستمرارية عبر الصفحات
 *
 * أوضاع التشغيل:
 *  - ?preview                             → mock كامل (بدون Supabase)
 *  - ?preview&force_subscriber=true       → Supabase حقيقي + يتصرف كمشترك (لا mock)
 */
(function(){
'use strict';
const qs = new URLSearchParams(window.location.search);
if (!qs.has('preview')) return;

// وضع force_subscriber: Supabase حقيقي، نعلّم فقط flag عالمي بدون mock client
if (qs.get('force_subscriber') === 'true') {
    window.__MADAREK_FORCE_SUBSCRIBER = true;
    window.__MADAREK_PREVIEW_MODE = true;
    console.log('%c[Preview Mode] ⚡ Force Subscriber — Supabase حقيقي + تخطي تسجيل الدخول', 'color:#F59E0B;font-weight:bold');
    return; // لا تُركّب mock client
}

const LS_KEY = 'madarek_mock_db_v2';
// تنظيف النسخة القديمة من localStorage تلقائياً لتفادي بيانات قديمة
try { localStorage.removeItem('madarek_mock_db_v1'); } catch(e){}
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().split('T')[0];
const genId = () => 'mock-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);

// ── Mock User ──
const MOCK_USER_ID = 'mock-user-00000000';
const MOCK_USER = {
    id: MOCK_USER_ID,
    email: 'preview@madarek.demo',
    created_at: '2025-12-01T00:00:00Z'
};

// ── Seed Data ──
function seedData() {
    return {
        profiles: [
            { id: MOCK_USER_ID, full_name:'عبدالله الزهراني', email:'preview@madarek.demo', phone:'0555555555',
              role:'admin', avatar_emoji:'ع', subscription_type:'monthly',
              subscription_end: new Date(Date.now()+25*864e5).toISOString(),
              used_coupon: null,
              xp:560, level:3, level_name:'متدرب', streak_days:5, streak_last_date: today(),
              total_questions_solved:488, total_correct:320, total_sessions:12,
              notifications_enabled:true, sound_enabled:true, dark_mode:false,
              referral_code:'MADAR-AB789',
              created_at:'2025-12-01T00:00:00Z', last_seen_at: now() },
            { id:'u2', full_name:'خالد المطيري', email:'khalid@demo', phone:'0511111111', role:'user',
              avatar_emoji:'خ', subscription_type:'monthly', subscription_end: new Date(Date.now()+10*864e5).toISOString(),
              xp:650, level:3, level_name:'متدرب', streak_days:7, referral_code:'MADAR-KH01',
              total_questions_solved:530, total_correct:410, total_sessions:14,
              created_at:'2025-12-10T00:00:00Z', last_seen_at: new Date(Date.now()-3600000).toISOString() },
            { id:'u3', full_name:'سلطان العتيبي', email:'sultan@demo', phone:'0522222222', role:'user',
              avatar_emoji:'س', subscription_type:'yearly', subscription_end: new Date(Date.now()+300*864e5).toISOString(),
              xp:720, level:4, level_name:'متقدم', streak_days:14, referral_code:'MADAR-SL02',
              total_questions_solved:890, total_correct:650, total_sessions:22,
              created_at:'2025-11-01T00:00:00Z', last_seen_at: new Date(Date.now()-60000).toISOString() },
            { id:'u4', full_name:'عبدالعزيز الشمري', email:'aziz@demo', role:'user',
              avatar_emoji:'ع', subscription_type:null, xp:150, level:1, level_name:'مبتدئ',
              streak_days:1, total_questions_solved:45, total_correct:28, total_sessions:3,
              created_at: new Date(Date.now()-2*864e5).toISOString(), last_seen_at: new Date(Date.now()-1800000).toISOString() },
            { id:'u5', full_name:'رهف الوادعي', email:'rahaf@demo', role:'user',
              avatar_emoji:'ر', subscription_type:'monthly', subscription_end: new Date(Date.now()+5*864e5).toISOString(),
              xp:380, level:2, level_name:'مبتدئ', streak_days:3,
              total_questions_solved:200, total_correct:140, total_sessions:8,
              created_at:'2026-01-15T00:00:00Z', last_seen_at: new Date(Date.now()-120000).toISOString() }
        ],
        questions: [
            { id:'q1', question_text:'إذا كان نصف قطر الدائرة 7، فإن القطر يساوي', choices:['7','10','14','21'], correct_index:2, section:'quant', topic:'هندسة', explanation:'القطر = 2 × نصف القطر = 2 × 7 = 14', disabled:false, status:'active', created_at:'2026-01-01T00:00:00Z', question_type:'اختيار من متعدد', solve_count:45, accuracy_rate:78.5 },
            { id:'q2', question_text:'ما معنى كلمة "سؤدد"؟', choices:['المجد والشرف','الحزن','السرور','القوة'], correct_index:0, section:'verbal', topic:'مفردات', explanation:'السؤدد = المجد والشرف والسيادة', disabled:false, status:'active', created_at:'2026-01-02T00:00:00Z', question_type:'اختيار من متعدد', solve_count:60, accuracy_rate:82 },
            { id:'q3', question_text:'أكمل النمط: 2، 5، 10، 17، ...', choices:['20','24','26','30'], correct_index:2, section:'quant', topic:'متتاليات', explanation:'الفرق يزيد 2 كل مرة: +3، +5، +7، +9 → 17+9=26', disabled:false, status:'active', created_at:'2026-01-03T00:00:00Z', question_type:'اختيار من متعدد', solve_count:38, accuracy_rate:55 },
            { id:'q4', question_text:'الكتاب : القراءة كالقلم : ...', choices:['الورق','الكتابة','الحبر','المكتب'], correct_index:1, section:'verbal', topic:'تناظر', explanation:'العلاقة: الأداة ووظيفتها', disabled:false, status:'active', created_at:'2026-01-04T00:00:00Z', question_type:'اختيار من متعدد', solve_count:52, accuracy_rate:70 },
            { id:'q5', question_text:'اشترى شخص مزرعة وباعها بقيمة 4800 وربح 20%، كم سعر المزرعة الأساسي؟', choices:['2500','3000','3500','4000'], correct_index:3, section:'quant', topic:'نسب', explanation:'الأصلي × 1.2 = 4800 → الأصلي = 4000', disabled:false, status:'active', created_at:'2026-01-05T00:00:00Z', question_type:'اختيار من متعدد', solve_count:40, accuracy_rate:45 },
            { id:'q6', question_text:'التفاعل بين الحديد والأكسجين ينتج:', choices:['الصدأ','الفحم','الكبريت','النحاس'], correct_index:0, section:'tahsili', topic:'كيمياء', explanation:'Fe + O₂ → Fe₂O₃ (الصدأ)', disabled:false, status:'active', created_at:'2026-01-06T00:00:00Z', question_type:'اختيار من متعدد', solve_count:70, accuracy_rate:88 },
            { id:'q7', question_text:'عادة : سعادة', choices:['مطار : طيارة','طالب : مدرسة','رياضة : صحة','جوع : طعام'], correct_index:2, section:'verbal', topic:'تناظر', explanation:'النتيجة من السبب', disabled:false, status:'active', created_at:'2026-01-07T00:00:00Z', question_type:'اختيار من متعدد', solve_count:33, accuracy_rate:72 },
            { id:'q_review1', question_text:'ما أكبر قاسم مشترك لـ 24 و 36؟', choices:['6','8','12','18'], correct_index:2, section:'quant', topic:'نظرية الأعداد', explanation:'عوامل 24: 1,2,3,4,6,8,12,24 وعوامل 36: 1,2,3,4,6,9,12,18,36 — الأكبر المشترك 12', disabled:false, status:'review', created_at: new Date(Date.now()-3600000).toISOString(), question_type:'اختيار من متعدد', solve_count:0, accuracy_rate:0 },
            { id:'q_leak1', leak_group_id:'lg1', question_text:'كم نسبة الزيادة إذا ارتفع السعر من 80 إلى 100؟', choices:['15%','20%','25%','30%'], correct_index:2, section:'quant', topic:'نسب', explanation:'الزيادة = 20، النسبة = 20/80 × 100 = 25%', disabled:false, status:'active', created_at:'2026-04-16T06:10:00Z', question_type:'اختيار من متعدد', solve_count:12, accuracy_rate:68 },
            { id:'q_leak2', leak_group_id:'lg1', question_text:'صديق : وفاء كـ معلم : ...', choices:['طالب','صبر','علم','مدرسة'], correct_index:1, section:'verbal', topic:'تناظر', explanation:'العلاقة: الشخص وصفته المميزة', disabled:false, status:'active', created_at:'2026-04-16T06:15:00Z', question_type:'اختيار من متعدد', solve_count:10, accuracy_rate:75 },
            { id:'q_leak3', leak_group_id:'lg2', question_text:'ما مساحة مثلث قائم الزاوية ضلعاه 6 و 8؟', choices:['14','24','48','96'], correct_index:1, section:'quant', topic:'هندسة', explanation:'المساحة = ½ × القاعدة × الارتفاع = ½ × 6 × 8 = 24', disabled:false, status:'active', created_at:'2026-04-15T07:40:00Z', question_type:'اختيار من متعدد', solve_count:8, accuracy_rate:62 }
        ],
        attempts: [
            { id:'a1', user_id:MOCK_USER_ID, question_id:'q1', selected_answer:2, is_correct:true, created_at: new Date(Date.now()-3600000).toISOString() },
            { id:'a2', user_id:MOCK_USER_ID, question_id:'q2', selected_answer:1, is_correct:false, created_at: new Date(Date.now()-3000000).toISOString() },
            { id:'a3', user_id:MOCK_USER_ID, question_id:'q3', selected_answer:1, is_correct:false, created_at: new Date(Date.now()-86400000).toISOString() },
            { id:'a4', user_id:MOCK_USER_ID, question_id:'q4', selected_answer:1, is_correct:true, created_at: new Date(Date.now()-86400000*2).toISOString() },
            { id:'a5', user_id:MOCK_USER_ID, question_id:'q5', selected_answer:3, is_correct:true, created_at: new Date(Date.now()-86400000*2).toISOString() },
            { id:'a6', user_id:MOCK_USER_ID, question_id:'q6', selected_answer:0, is_correct:true, created_at: new Date(Date.now()-86400000*3).toISOString() },
            { id:'a7', user_id:MOCK_USER_ID, question_id:'q7', selected_answer:0, is_correct:false, created_at: new Date(Date.now()-86400000*4).toISOString() }
        ],
        saved_questions: [
            { id:'sq1', user_id:MOCK_USER_ID, question_id:'q1', saved_at: new Date(Date.now()-86400000).toISOString() }
        ],
        practice_sessions: [
            { id:'ps1', user_id:MOCK_USER_ID, section:'quant', total_questions:20, correct_answers:13, wrong_answers:7, show_mode:'instant', session_type:'practice', started_at: new Date(Date.now()-86400000).toISOString(), completed_at: new Date(Date.now()-86400000+1800000).toISOString() }
        ],
        coupons: [
            { id:'c1', code:'QUDRAT30', discount_type:'percentage', discount_value:30, plan_type:'all', duration_months:1, max_uses:1000, used_count:0, is_active:true, expires_at:'2026-07-14T00:00:00Z', created_at:'2026-01-01T00:00:00Z' },
            { id:'c2', code:'IZ73', discount_type:'free', discount_value:100, plan_type:'all', duration_months:1, max_uses:20, used_count:1, is_active:true, expires_at:null, created_at:'2025-12-01T00:00:00Z' },
            { id:'c3', code:'MADAR-WELCOME', discount_type:'percentage', discount_value:50, plan_type:'monthly', duration_months:1, max_uses:100, used_count:37, is_active:true, expires_at:null, created_at:'2025-11-01T00:00:00Z' }
        ],
        payments: [
            { id:'p1', user_id:'u2', amount:115, status:'paid', plan_type:'monthly', payment_id:'MF-123456', paid_at: new Date(Date.now()-2*86400000).toISOString(), created_at: new Date(Date.now()-2*86400000).toISOString() },
            { id:'p2', user_id:'u3', amount:900, status:'paid', plan_type:'yearly', payment_id:'MF-123457', paid_at: new Date(Date.now()-7*86400000).toISOString(), created_at: new Date(Date.now()-7*86400000).toISOString() },
            { id:'p3', user_id:'u5', amount:89.50, status:'paid', plan_type:'monthly', payment_id:'MF-123458', coupon_code:'MADAR-WELCOME', coupon_discount:25.50, paid_at: new Date(Date.now()-3*86400000).toISOString(), created_at: new Date(Date.now()-3*86400000).toISOString() }
        ],
        invoices: [
            { id:'inv1', invoice_number:'INV-2026-0001', user_id:'u2', customer_name:'خالد المطيري', customer_phone:'0511111111', plan_name:'شهري', amount_before_tax:100, tax_amount:15, total_amount:115, currency:'SAR', payment_id:'MF-123456', payment_status:'paid', created_at: new Date(Date.now()-2*86400000).toISOString() },
            { id:'inv2', invoice_number:'INV-2026-0002', user_id:'u3', customer_name:'سلطان العتيبي', customer_phone:'0522222222', plan_name:'سنوي', amount_before_tax:782.61, tax_amount:117.39, total_amount:900, currency:'SAR', payment_id:'MF-123457', payment_status:'paid', created_at: new Date(Date.now()-7*86400000).toISOString() }
        ],
        expenses: [
            { id:'e1', title:'اشتراك Supabase Pro', description:'اشتراك شهري', amount:95, category:'infrastructure', expense_date: today(), created_at: now() },
            { id:'e2', title:'حملة إعلانية تيك توك', amount:500, category:'marketing', expense_date: new Date(Date.now()-5*864e5).toISOString().split('T')[0], created_at: now() }
        ],
        reports: [
            { id:'r1', user_id:'u2', question_id:'q3', reason:'الإجابة الصحيحة خاطئة', status:'pending', created_at: new Date(Date.now()-86400000).toISOString() },
            { id:'r2', user_id:'u3', question_id:'q5', reason:'نص السؤال غير واضح', status:'pending', created_at: new Date(Date.now()-2*86400000).toISOString() }
        ],
        plans: [
            { id:'pl1', name:'شهري', slug:'monthly', price:115, original_price:null, discount_percentage:0, duration_days:30, is_active:true, is_featured:false, savings_text:null, subscriber_count:37, sort_order:1 },
            { id:'pl2', name:'3 أشهر', slug:'quarterly', price:290, original_price:345, discount_percentage:16, duration_days:90, is_active:true, is_featured:true, savings_text:'وفّر 55 ريال', subscriber_count:0, sort_order:2 },
            { id:'pl3', name:'سنوي', slug:'yearly', price:900, original_price:1380, discount_percentage:35, duration_days:365, is_active:true, is_featured:false, savings_text:'وفّر 480 ريال', subscriber_count:20, sort_order:3 }
        ],
        banners: [
            { id:'b1', banner_type:'ticker', is_active:true, config:{keyword:'جديد',keyword_color:'#FF6B35',text:'تسريبات 16 أبريل — 167 سؤال قدرات حقيقي مع شرح مفصّل',bg_color:'#6D5DF6',text_color:'#ffffff',speed:50}, sort_order:1 },
            { id:'b2', banner_type:'main', is_active:true, config:{tag:'اختبار محاكي أسبوعي',cta_text:'سجّل مشاركتي',title:'السبت القادم — القدرات',subtitle:'اختبار جماعي بنفس الوقت لكل المشتركين — أعلى 3 يُعلَن عنهم',bg_left:'#1A1230',bg_right:'#2D1B69',btn_color:'#F59E0B',btn_text_color:'#1A1230'}, sort_order:2 },
            { id:'b3', banner_type:'image', is_active:false, config:{image_url:''}, sort_order:3 },
            { id:'b4', banner_type:'leaks', is_active:true, config:{title:'تسريبات أبريل 2026',subtitle:'أحدث الأسئلة الحقيقية من اختبارات هذا الشهر — مع شروحات مفصّلة',bg_left:'#6D5DF6',bg_right:'#4838C7',label:'حصري للمشتركين'}, sort_order:4 }
        ],
        tips: [
            { id:'t1', emoji:'⏰', title:'نظّم وقتك', body:'خصص 30 دقيقة يومياً للتدريب — الاستمرارية أهم من الكثافة', sort_order:1, is_active:true },
            { id:'t2', emoji:'🎯', title:'ركّز على الضعف', body:'راجع أخطاءك أولاً — التعلم من الخطأ أسرع طريق للتحسن', sort_order:2, is_active:true },
            { id:'t3', emoji:'📊', title:'تابع تقدمك', body:'راقب إحصائياتك أسبوعياً — الأرقام ما تكذب', sort_order:3, is_active:true },
            { id:'t4', emoji:'🧠', title:'افهم لا تحفظ', body:'فهم طريقة الحل أفضل من حفظ الإجابة', sort_order:4, is_active:true },
            { id:'t5', emoji:'💪', title:'لا تستسلم', body:'كل خبير كان مبتدئ — المثابرة هي الفارق', sort_order:5, is_active:true }
        ],
        achievements: [
            { id:'ach1', name:'المئوي', description:'حل 100 سؤال', icon:'💯', target_value:100, achievement_type:'questions', sort_order:1, is_active:true },
            { id:'ach2', name:'الخطوة الأولى', description:'إكمال 10 جلسات', icon:'🎯', target_value:10, achievement_type:'sessions', sort_order:2, is_active:true },
            { id:'ach3', name:'مستمر', description:'التدريب 7 أيام متتالية', icon:'🔥', target_value:7, achievement_type:'streak', sort_order:3, is_active:true },
            { id:'ach4', name:'متفوق', description:'دقة 80% أو أعلى', icon:'⭐', target_value:80, achievement_type:'accuracy', sort_order:4, is_active:true },
            { id:'ach5', name:'لا يوقفك شيء', description:'التدريب 30 يوم متتالي', icon:'🏆', target_value:30, achievement_type:'streak', sort_order:5, is_active:true },
            { id:'ach6', name:'الخبير', description:'إكمال 5 اختبارات كاملة', icon:'👑', target_value:5, achievement_type:'sessions', sort_order:6, is_active:true }
        ],
        user_achievements: [
            { id:'ua1', user_id:MOCK_USER_ID, achievement_id:'ach1', current_value:488, unlocked:true, unlocked_at:'2026-01-20T00:00:00Z' },
            { id:'ua2', user_id:MOCK_USER_ID, achievement_id:'ach2', current_value:12, unlocked:true, unlocked_at:'2026-01-25T00:00:00Z' },
            { id:'ua3', user_id:MOCK_USER_ID, achievement_id:'ach3', current_value:5, unlocked:false },
            { id:'ua4', user_id:MOCK_USER_ID, achievement_id:'ach4', current_value:65, unlocked:false },
            { id:'ua5', user_id:MOCK_USER_ID, achievement_id:'ach5', current_value:5, unlocked:false },
            { id:'ua6', user_id:MOCK_USER_ID, achievement_id:'ach6', current_value:2, unlocked:false }
        ],
        referrals: [
            { id:'rf1', referrer_id:MOCK_USER_ID, referred_user_id:'u4', referred_status:'registered', bonus_days:0, created_at: new Date(Date.now()-5*86400000).toISOString() },
            { id:'rf2', referrer_id:MOCK_USER_ID, referred_user_id:'u5', referred_status:'subscribed', bonus_days:10, created_at: new Date(Date.now()-10*86400000).toISOString() },
            { id:'rf3', referrer_id:MOCK_USER_ID, referred_user_id:'u3', referred_status:'subscribed', bonus_days:10, created_at: new Date(Date.now()-15*86400000).toISOString() }
        ],
        referral_settings: [
            { id:'rs1', referrer_bonus_days:10, referred_bonus_days:7, is_active:true }
        ],
        daily_streaks: (() => {
            const arr = [];
            for (let i = 0; i < 5; i++) {
                const d = new Date(); d.setDate(d.getDate() - i);
                arr.push({ id:'ds'+i, user_id:MOCK_USER_ID, streak_date: d.toISOString().split('T')[0], completed:true, questions_solved:10 });
            }
            return arr;
        })(),
        leak_groups: [
            { id:'lg1', title:'تسريبات 16 أبريل 2026', leak_date:'2026-04-16', section:'مختلط', question_count:167, description:'167 سؤال قدرات حقيقي مع شرح مفصّل — أحدث التسريبات', is_active:true, created_at:'2026-04-16T06:00:00Z' },
            { id:'lg2', title:'تسريبات 15 أبريل 2026', leak_date:'2026-04-15', section:'قدرات كمي', question_count:44, description:'44 سؤال كمي من اختبار الصباح', is_active:true, created_at:'2026-04-15T07:30:00Z' },
            { id:'lg3', title:'تسريبات 14 أبريل 2026', leak_date:'2026-04-14', section:'قدرات لفظي', question_count:122, description:'122 سؤال لفظي — تناظر وإكمال جمل', is_active:true, created_at:'2026-04-14T09:00:00Z' },
            { id:'lg4', title:'تسريبات 13 أبريل 2026', leak_date:'2026-04-13', section:'تحصيلي', question_count:98, description:'98 سؤال تحصيلي — أحياء وكيمياء', is_active:true, created_at:'2026-04-13T08:00:00Z' },
            { id:'lg5', title:'تسريبات 10 أبريل 2026', leak_date:'2026-04-10', section:'مختلط', question_count:75, description:'75 سؤال مختلط من اختبار الأسبوع الماضي', is_active:true, created_at:'2026-04-10T10:00:00Z' }
        ],
        user_leak_progress: [
            { id:'ulp1', user_id:MOCK_USER_ID, leak_group_id:'lg3', completed_count:79, total_count:122, percentage:65, status:'in_progress', updated_at: new Date(Date.now()-2*86400000).toISOString() },
            { id:'ulp2', user_id:MOCK_USER_ID, leak_group_id:'lg4', completed_count:98, total_count:98, percentage:100, status:'completed', updated_at: new Date(Date.now()-3*86400000).toISOString() }
        ],
        pages: [
            { id:'pg1', slug:'privacy', title:'سياسة الخصوصية', description:'سياسة الخصوصية لتطبيق مدارك النخبة', content:'<h2>سياسة الخصوصية</h2><p>نحترم خصوصيتك...</p>', updated_at:'2026-01-01T00:00:00Z', is_active:true },
            { id:'pg2', slug:'terms', title:'شروط الاستخدام', description:'شروط استخدام تطبيق مدارك النخبة', content:'<h2>شروط الاستخدام</h2><p>باستخدام التطبيق...</p>', updated_at:'2026-01-01T00:00:00Z', is_active:true },
            { id:'pg3', slug:'about', title:'عن التطبيق', description:'معلومات عن التطبيق', content:'<h2>عن مدارك النخبة</h2><p>منصة تدريب احترافية...</p>', updated_at:'2026-01-01T00:00:00Z', is_active:true }
        ],
        seo_settings: [
            { id:'seo1', title_tag:'مدارك النخبة — تدريب الرخصة المهنية', meta_description:'منصة احترافية لتدريب الرخصة المهنية بذكاء', keywords:'تدريب, قدرات, تحصيلي, رخصة مهنية', og_title:'مدارك النخبة', og_description:'تدرّب بذكاء، حقّق أعلى النتائج', og_image_url:'' }
        ],
        site_settings: [
            { id:1, key:'whatsapp_number', value:'+966500000000' },
            { id:2, key:'app_name', value:'مدارك النخبة' },
            { id:3, key:'free_limit', value:'5' }
        ],
        user_notifications: [
            { id:'n1', user_id:MOCK_USER_ID, title:'🎉 مرحباً بك', body:'أكمل ملفك الشخصي للحصول على مكافأة', notif_type:'info', is_read:false, created_at: new Date(Date.now()-3600000).toISOString() },
            { id:'n2', user_id:MOCK_USER_ID, title:'🔥 سلسلة 5 أيام!', body:'ممتاز — واصل للوصول لأسبوع كامل', notif_type:'achievement', is_read:false, created_at: new Date(Date.now()-7200000).toISOString() }
        ],
        analytics_events: (() => {
            const arr = [];
            for (let i = 0; i < 25; i++) {
                arr.push({ id:'ev'+i, anonymous_id:'anon-'+i, event_type:'page_view', page_path:'/', created_at: new Date(Date.now()-i*3600000).toISOString() });
            }
            return arr;
        })(),
        activity_log: [],
        leaderboard_weekly: [],
        staff_stats: []
    };
}

// ── Load from localStorage or seed ──
let MOCK_DB;
try {
    const saved = localStorage.getItem(LS_KEY);
    MOCK_DB = saved ? JSON.parse(saved) : seedData();
} catch(e) { MOCK_DB = seedData(); }

// ── Self-heal: دمج أي جداول/بيانات seed جديدة ناقصة ──
// (لو المستخدم فتح نسخة قديمة من localStorage فيها جداول فارغة، نملأها من seed الحالي)
try {
    const freshSeed = seedData();
    let needsSave = false;
    for (const table of Object.keys(freshSeed)) {
        if (!MOCK_DB[table]) {
            MOCK_DB[table] = freshSeed[table];
            needsSave = true;
        } else if (Array.isArray(MOCK_DB[table]) && MOCK_DB[table].length === 0 && freshSeed[table].length > 0) {
            MOCK_DB[table] = freshSeed[table];
            needsSave = true;
        }
    }
    if (needsSave) {
        try { localStorage.setItem(LS_KEY, JSON.stringify(MOCK_DB)); } catch(e){}
    }
} catch(e) { console.warn('[Preview Mock] self-heal skipped:', e); }

function saveDB() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(MOCK_DB)); } catch(e){}
}

// ── Parse PostgREST filter string like "col.ilike.%x%,col2.eq.val" ──
function parseOrClause(str) {
    return str.split(',').map(p => {
        const m = p.match(/^([^.]+)\.([^.]+)\.(.*)$/);
        return m ? { col: m[1], op: m[2], val: m[3] } : null;
    }).filter(Boolean);
}

// ── Join resolver: select('*, profiles(*)') ──
function parseSelect(selectStr) {
    const joins = [];
    let cleaned = selectStr;
    // Match joins: tableName(fields) or fk_name!inner(fields)
    const re = /([a-zA-Z_]+)(?:!(inner|left))?\s*\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(selectStr)) !== null) {
        joins.push({ table: m[1], fields: m[3] });
        cleaned = cleaned.replace(m[0], '');
    }
    cleaned = cleaned.replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
    return { baseFields: cleaned || '*', joins };
}

function resolveJoin(row, joinTable) {
    // Guess FK: find column ending in _id matching joinTable (singular) or joinTable+'_id'
    const singularize = t => t.endsWith('s') ? t.slice(0, -1) : t;
    const singular = singularize(joinTable);
    const fkCol = Object.keys(row).find(k =>
        k === singular + '_id' ||
        k === joinTable + '_id' ||
        (k.endsWith('_id') && k.replace('_id','') === singular)
    );
    if (!fkCol || row[fkCol] == null) return null;
    const target = (MOCK_DB[joinTable] || []).find(r => r.id === row[fkCol]);
    return target || null;
}

// ── Apply filter ──
function matchFilter(row, f) {
    const [type, col, val, extra] = f;
    const cell = row[col];
    if (type === 'eq') return cell === val;
    if (type === 'neq') return cell !== val;
    if (type === 'gt') return cell > val;
    if (type === 'gte') return cell >= val;
    if (type === 'lt') return cell < val;
    if (type === 'lte') return cell <= val;
    if (type === 'in') return Array.isArray(val) && val.includes(cell);
    if (type === 'is') return cell === val || (val === null && cell == null);
    if (type === 'ilike') {
        if (cell == null) return false;
        const pattern = String(val).replace(/%/g,'').toLowerCase();
        return String(cell).toLowerCase().includes(pattern);
    }
    if (type === 'like') {
        if (cell == null) return false;
        return String(cell).includes(String(val).replace(/%/g,''));
    }
    if (type === 'or') {
        const parts = parseOrClause(col); // col holds the string here
        return parts.some(p => {
            const c = row[p.col];
            const pattern = p.val.replace(/%/g,'').toLowerCase();
            if (p.op === 'ilike') return c != null && String(c).toLowerCase().includes(pattern);
            if (p.op === 'eq') return c === p.val || c === Number(p.val);
            return false;
        });
    }
    return true;
}

// ── Query Builder ──
class MockQuery {
    constructor(table) {
        this.table = table;
        this.op = 'select';
        this.filters = [];
        this.selectStr = '*';
        this.orderBy = [];
        this.limitN = null;
        this.rangeFrom = null;
        this.rangeTo = null;
        this.countOpt = null;
        this.headOpt = false;
        this.isSingle = false;
        this.payload = null;
    }

    select(fields, opts) {
        this.selectStr = fields || '*';
        if (opts) {
            if (opts.count) this.countOpt = opts.count;
            if (opts.head) this.headOpt = true;
        }
        // Return self-thenable — when called after insert/update, return this (already set op)
        return this;
    }

    insert(data) { this.op = 'insert'; this.payload = data; return this; }
    update(data) { this.op = 'update'; this.payload = data; return this; }
    upsert(data, opts) { this.op = 'upsert'; this.payload = data; this.upsertOpts = opts; return this; }
    delete() { this.op = 'delete'; return this; }

    eq(c,v){ this.filters.push(['eq',c,v]); return this; }
    neq(c,v){ this.filters.push(['neq',c,v]); return this; }
    gt(c,v){ this.filters.push(['gt',c,v]); return this; }
    gte(c,v){ this.filters.push(['gte',c,v]); return this; }
    lt(c,v){ this.filters.push(['lt',c,v]); return this; }
    lte(c,v){ this.filters.push(['lte',c,v]); return this; }
    in(c,v){ this.filters.push(['in',c,v]); return this; }
    is(c,v){ this.filters.push(['is',c,v]); return this; }
    like(c,v){ this.filters.push(['like',c,v]); return this; }
    ilike(c,v){ this.filters.push(['ilike',c,v]); return this; }
    or(s){ this.filters.push(['or',s]); return this; }
    filter(){ return this; } // no-op
    match(obj){ for(const k in obj) this.filters.push(['eq',k,obj[k]]); return this; }

    order(col, opts) { this.orderBy.push({col, asc: opts?.ascending !== false}); return this; }
    limit(n) { this.limitN = n; return this; }
    range(from, to) { this.rangeFrom = from; this.rangeTo = to; return this; }
    single() { this.isSingle = true; return this; }
    maybeSingle() { this.isSingle = true; return this; }

    then(resolve, reject) {
        try { resolve(this._run()); } catch(e) { resolve({data:null, error:{message:e.message}, count:null}); }
    }

    _applyFilters(rows) {
        for (const f of this.filters) {
            rows = rows.filter(r => matchFilter(r, f));
        }
        return rows;
    }

    _applyJoins(rows) {
        const { joins } = parseSelect(this.selectStr);
        if (!joins.length) return rows;
        return rows.map(r => {
            const out = {...r};
            for (const j of joins) out[j.table] = resolveJoin(r, j.table);
            return out;
        });
    }

    _run() {
        const table = MOCK_DB[this.table] = MOCK_DB[this.table] || [];

        if (this.op === 'insert') {
            const items = Array.isArray(this.payload) ? this.payload : [this.payload];
            const inserted = items.map(it => ({
                id: it.id || genId(),
                created_at: it.created_at || now(),
                ...it
            }));
            MOCK_DB[this.table].push(...inserted);
            saveDB();
            return { data: this.isSingle ? inserted[0] : inserted, error: null, count: null };
        }

        if (this.op === 'update') {
            let matching = this._applyFilters([...table]);
            const updated = [];
            for (const m of matching) {
                const idx = table.findIndex(r => r.id === m.id);
                if (idx >= 0) {
                    MOCK_DB[this.table][idx] = {...table[idx], ...this.payload};
                    updated.push(MOCK_DB[this.table][idx]);
                }
            }
            saveDB();
            return { data: this.isSingle ? updated[0] : updated, error: null, count: null };
        }

        if (this.op === 'upsert') {
            const items = Array.isArray(this.payload) ? this.payload : [this.payload];
            const result = [];
            for (const it of items) {
                const keys = Object.keys(it);
                // Try match by id first
                let idx = -1;
                if (it.id) idx = table.findIndex(r => r.id === it.id);
                // Or by the onConflict columns if provided
                if (idx < 0 && this.upsertOpts?.onConflict) {
                    const cols = this.upsertOpts.onConflict.split(',');
                    idx = table.findIndex(r => cols.every(c => r[c] === it[c]));
                }
                // Or unique constraints for known tables
                if (idx < 0 && this.table === 'saved_questions' && it.user_id && it.question_id) {
                    idx = table.findIndex(r => r.user_id === it.user_id && r.question_id === it.question_id);
                }
                if (idx < 0 && this.table === 'user_achievements' && it.user_id && it.achievement_id) {
                    idx = table.findIndex(r => r.user_id === it.user_id && r.achievement_id === it.achievement_id);
                }
                if (idx >= 0) {
                    MOCK_DB[this.table][idx] = {...table[idx], ...it};
                    result.push(MOCK_DB[this.table][idx]);
                } else {
                    const newRow = { id: it.id||genId(), created_at: now(), ...it };
                    MOCK_DB[this.table].push(newRow);
                    result.push(newRow);
                }
            }
            saveDB();
            return { data: this.isSingle ? result[0] : result, error: null, count: null };
        }

        if (this.op === 'delete') {
            const matching = this._applyFilters([...table]);
            MOCK_DB[this.table] = table.filter(r => !matching.some(m => m.id === r.id));
            saveDB();
            return { data: null, error: null, count: null };
        }

        // SELECT
        let rows = this._applyFilters([...table]);
        const totalCount = rows.length;

        // Order
        for (let i = this.orderBy.length - 1; i >= 0; i--) {
            const {col, asc} = this.orderBy[i];
            rows.sort((a,b) => {
                const av = a[col], bv = b[col];
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                if (av < bv) return asc ? -1 : 1;
                if (av > bv) return asc ? 1 : -1;
                return 0;
            });
        }

        // Range / Limit
        if (this.rangeFrom !== null) rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
        else if (this.limitN) rows = rows.slice(0, this.limitN);

        // Joins
        rows = this._applyJoins(rows);

        if (this.headOpt) return { data: null, count: totalCount, error: null };
        if (this.isSingle) return { data: rows[0] || null, count: this.countOpt ? totalCount : null, error: rows[0] ? null : { message: 'No rows found', code: 'PGRST116' } };
        return { data: rows, count: this.countOpt ? totalCount : null, error: null };
    }
}

// ── Mock RPC ──
async function mockRPC(name, args) {
    const u = MOCK_DB.profiles.find(p => p.id === MOCK_USER_ID);
    switch (name) {
        case 'get_home_stats':
            return { data: {
                xp: u.xp, level: u.level, level_name: u.level_name, streak_days: u.streak_days,
                total_solved: u.total_questions_solved, total_correct: u.total_correct,
                week_correct: 48, week_total: 60, week_accuracy: 80, week_sessions: 4,
                rank: 4, referral_code: u.referral_code
            }, error: null };
        case 'get_my_referral_stats':
            const refs = MOCK_DB.referrals.filter(r => r.referrer_id === (args?.p_user_id || MOCK_USER_ID));
            return { data: {
                referral_code: u.referral_code,
                shared: refs.length,
                subscribed: refs.filter(r => r.referred_status === 'subscribed').length,
                days_earned: refs.reduce((s,r)=>s+Number(r.bonus_days||0),0)
            }, error: null };
        case 'get_user_leaks':
            return { data: [], error: null };
        case 'get_leaderboard_v2':
            const sorted = [...MOCK_DB.profiles].filter(p => p.role === 'user' || p.id === MOCK_USER_ID).sort((a,b) => (b.xp||0) - (a.xp||0));
            return { data: sorted.slice(0, args?.p_limit || 20).map((p,i) => ({
                user_id: p.id, name: p.full_name, avatar: p.avatar_emoji, xp: p.xp||0, rank: i+1
            })), error: null };
        case 'check_answer':
        case 'submit_answer': {
            const q = MOCK_DB.questions.find(x => x.id === args?.q_id || x.id === args?.p_question_id);
            const sel = args?.selected_answer ?? args?.p_selected_answer;
            const correct = q && q.correct_index === sel;
            return { data: correct, error: null };
        }
        case 'update_user_xp': {
            u.xp = (u.xp||0) + (args?.p_xp_amount||0);
            u.level = Math.floor(u.xp / 200) + 1;
            saveDB();
            return { data: { xp: u.xp, level: u.level, level_name: u.level_name, xp_added: args?.p_xp_amount||0 }, error: null };
        }
        case 'update_daily_streak':
            return { data: { streak: u.streak_days, already_done: false }, error: null };
        case 'check_achievements':
            return { data: { newly_unlocked: [] }, error: null };
        case 'log_activity':
            return { data: null, error: null };
        case 'apply_coupon':
            return { data: { ok: true }, error: null };
        case 'apply_referral':
            return { data: { success: true, referrer_bonus_days: 10, referred_bonus_days: 7 }, error: null };
        default:
            console.warn('[Preview Mock] Unknown RPC:', name, args);
            return { data: null, error: null };
    }
}

// ── Mock Supabase Client ──
const MockClient = {
    from(table) { return new MockQuery(table); },
    auth: {
        getUser: async () => ({ data: { user: MOCK_USER }, error: null }),
        getSession: async () => ({ data: { session: { user: MOCK_USER } }, error: null }),
        signOut: async () => {
            localStorage.removeItem(LS_KEY);
            window.location.href = 'welcome-v2.html';
        },
        onAuthStateChange: (cb) => ({ data: { subscription: { unsubscribe: () => {} } } }),
        updateUser: async (payload) => {
            if (payload.password) return { data: { user: MOCK_USER }, error: null };
            return { data: { user: MOCK_USER }, error: null };
        },
        signInWithPassword: async () => ({ data: { user: MOCK_USER, session: {user: MOCK_USER} }, error: null })
    },
    storage: {
        from(bucket) {
            return {
                upload: async () => ({
                    data: null,
                    error: { message: 'وضع المعاينة — استخدم رابط URL مباشر بدلاً من الرفع' }
                }),
                getPublicUrl: (path) => ({ data: { publicUrl: 'https://via.placeholder.com/600x400.png?text=Preview+Image' } }),
                remove: async () => ({ data: null, error: null })
            };
        }
    },
    rpc: async (name, args) => mockRPC(name, args),
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    removeChannel: () => {}
};

// ── Hijack createClient ──
function install() {
    if (!window.supabase) {
        // Supabase library not loaded yet — stub it
        window.supabase = { createClient: () => MockClient };
    } else {
        const orig = window.supabase.createClient;
        window.supabase.createClient = () => MockClient;
        window.supabase.__originalCreateClient = orig;
    }
    window.__MADAREK_PREVIEW_MODE = true;
    window.__MOCK_DB = MOCK_DB;
    window.__MOCK_CLIENT = MockClient;
    // Reset button helper
    window.__resetPreviewData = () => { localStorage.removeItem(LS_KEY); location.reload(); };
    console.log('%c[Preview Mode] ✓ Supabase mock installed', 'color:#6D5DF6;font-weight:bold');
    console.log('%cاستخدم window.__resetPreviewData() لإعادة البيانات', 'color:#6B7280');
}

install();

// Re-install if supabase library loads later
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase && window.supabase.createClient !== (() => MockClient)) {
        window.supabase.createClient = () => MockClient;
    }
});

})();
