/**
 * admin-v2-sections.js — تعريفات الأقسام الـ 16 المتبقية
 * يستخدم window.A = { sb, M, profile, currentPage }
 */
(function(){
'use strict';

const fmt = n => (n||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = s => { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
const SECTION_MAP = { quant:'قدرات كمي', verbal:'قدرات لفظي', tahsili:'تحصيلي', mixed:'مختلط' };
const sectionTag = s => SECTION_MAP[s] || s || 'عام';

// تنسيق تاريخ ميلادي موحّد (DD-MM-YYYY) — لا هجري في لوحة الإدارة
function fmtDate(d, withTime = false) {
    if (!d) return '—';
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const pad = n => String(n).padStart(2, '0');
    const out = `${pad(dt.getDate())}-${pad(dt.getMonth()+1)}-${dt.getFullYear()}`;
    if (withTime) return `${out} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    return out;
}
function fmtDateShort(d) {
    if (!d) return '—';
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    const pad = n => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}-${pad(dt.getMonth()+1)}`;
}

function $c() { return document.getElementById('contentArea'); }

// ═══════════════════════════════════════════════════════
// 2. QUESTIONS
// ═══════════════════════════════════════════════════════
// Persistent filter state
window._qFilters = window._qFilters || { section:'', topic:'', quality:'', status:'', sort:'new', search:'' };

// ════════════════════════════════════════════════════════════
// QIYAS OFFICIAL CATEGORIES — single source of truth for topics
// Reference: قياس (qiyas.sa) — Qudurat & Tahsili question types
// ════════════════════════════════════════════════════════════
window.QIYAS_TOPICS = {
    quant: ['الحساب', 'الجبر', 'الهندسة', 'الإحصاء والاحتمالات', 'التحليل'],
    verbal: ['التناظر اللفظي', 'إكمال الجملة', 'الخطأ السياقي', 'استيعاب المقروء', 'المفردة الشاذة'],
    tahsili: ['الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء']
};

// ════════════════════════════════════════════════════════════
// AUTO-CLASSIFIER — analyzes question text and suggests a Qiyas-standard topic.
// Uses Arabic + English keyword matching with weighted scoring + conflict resolution.
// Returns {topic, confidence, scores} where confidence ∈ 'high' | 'medium' | 'low' | 'none'
// ════════════════════════════════════════════════════════════
window.classifyQuestion = function(rawText, section) {
    if (!rawText || !section) return { topic: null, confidence: 'none', scores: {} };
    // Normalize: lowercase, strip diacritics, unify hamza forms
    const t = String(rawText).toLowerCase()
        .replace(/[ً-ْ]/g,'')       // tashkeel
        .replace(/[آأإ]/g,'ا')                  // alef variants
        .replace(/ى/g,'ي')                     // alef maksura
        .replace(/ة/g,'ه');                    // tah marbuta

    const KW = {
        tahsili: {
            'الكيمياء': {
                strong: ['اكسده','اختزال','تاكسد','اختزل','مول','تركيز','مولاري','مولالي','جدول دوري','تساهميه','ايونيه','هيدروجينيه','فلزيه','حمض','قاعده','هيدروكسيد','كلوريد','سلفات','نترات','كربونات','هيدروكربون','الديهايد','كيتون','كحول','استر','ايثر','امين','اميد','بنزين','ايثان','ميثان','بروبان','بوتان','نظير','نظائر','ايون','تاين','ذوبان','مذيب','مذاب','محلول','رابطه','عنصر','مركب','جزيء','جزيئه','تفاعل','ph','حمضي','قاعدي','اس هيدروجيني','تكافؤ','اوربيتال','مدار','محتوي حراري','انثالبي','انتروبي','تركيز مولاري','جزء بالمليون','حمض كبريتيك','كلوريد الصوديوم','كحول ايثيلي','حمض خليك','صوديوم','بوتاسيوم','كالسيوم','ماغنسيوم','حديد','نحاس','زنك','الومنيوم','هيدروجين','اكسجين','نيتروجين','كربون','ميثانول','ايثانول','جلوكوز','فركتوز','خليه كهروكيميائيه','خليه جلفانيه','تحليل كهربائي','معادله كيميائيه','حاله الاكسده'],
                weak: ['ذره']
            },
            'الأحياء': {
                strong: ['dna','rna','الحمض النووي','الحمض النووي الريبوزي','جين','جينات','كروموسوم','كروموسومات','جينوم','وراثه','وراثيه','وراثي','نبات','نباتات','بناء ضوئي','تمثيل ضوئي','تنفس خلوي','ميتوكوندريا','بلاستيده','بلاستيدات','يخضور','كلوروفيل','بكتيريا','فيروس','فيروسات','حيوان','حيوانات','فقاريات','لافقاريات','نسيج','انسجه','تطفر','طفره','طفرات','الجهاز العصبي','الجهاز التنفسي','الجهاز الهضمي','الجهاز الدوري','الجهاز الاخراجي','الجهاز التناسلي','الجهاز الهيكلي','الجهاز العضلي','بيئه','نظام بيئي','سلسله غذائيه','شبكه غذائيه','منتج','مستهلك','محلل','تكاثر','انقسام متساوي','انقسام اختزالي','ميوزس','ميتوزس','بلعمه','اخراج','هضم','زهره','بذره','جذر','ساق','ورقه','حشره','ثدييات','زواحف','طيور','اسماك','برمائيات','عضله','عضلات','جلد','عظام','هيكل','اعضاء','عضو','استجابه','هرمون','هرمونات','مناعه','جهاز المناعه','اجسام مضاده','بلازما','صفائح دمويه','كريات حمراء','كريات بيضاء','شعب هوائيه','حويصلات','كلي','كبد','معده','امعاء','قلب','رئه','مخ','نخاع','اعصاب','عصبون','تركيب البروتين','نسخ','ترجمه','رايبوسوم','شبكه اندوبلازميه','جهاز جولجي','ليسوسومات','نواه','غشاء بلازمي','جدار خلوي','فجوه','فجوات','سيتوبلازم','بكتيريا','ارخبيل','اوليه','ابتدائيه'],
                weak: ['خليه','انزيم','انزيمات']
            },
            'الفيزياء': {
                strong: ['نيوتن','جول','وات','امبير','فولت','اوم','هيرتز','تسلا','m/s²','m/s','كهرومغناطيسي','كهرومغناطيسيه','مجال مغناطيسي','مجال كهربائي','تيار كهربائي','تيار متردد','تيار مستمر','مقاومه كهربائيه','جهد كهربائي','شحنه كهربائيه','اشعاع','نووي','انشطار','اندماج','فوتون','كوارك','نيوترينو','تردد','طول الموجه','الموجه','عدسه','انعكاس','انكسار','حيود','تداخل','استقطاب','ميكانيكا الكم','الكوانتم','نسبيه','اينشتاين','جاذبيه','جاذبيه ارضيه','نوويه','تاين الذره','مدار ذري','شده المجال','زخم','عجله','تسارع','قوه شد','قوه احتكاك','قوه جاذبيه','قانون نيوتن','قانون اوم','قانون كولوم','شغل','طاقه حركيه','طاقه وضع','كثافه الفيض','امواج صوتيه','امواج ضوئيه','الطيف الكهرومغناطيسي','اشعاع جاما','اشعه سينيه','اشعه فوق بنفسجيه','عدسه محدبه','عدسه مقعره','مرايا محدبه','مرايا مقعره','بؤره','بعد بؤري','عدد كم','تردد الموجه','سعه الموجه','سرعه الضوء','بلانك','بور','رذرفورد','تنغستن','مفاعل نووي','عناصر مشعه','عمر النصف','نشاط اشعاعي','جسم مقذوف','الحركه الدائريه','حركه توافقيه','نواس','بندول','زنبرك','محرك','مولد','محول','مكثف','ملف','اوميغا','احتكاك','مرونه','قوه طارده مركزيه'],
                weak: ['قوه','سرعه','طاقه','مجال']
            },
            'الرياضيات': {
                strong: ['داله','د(س)','f(x)','مشتقه','اشتقاق','تفاضل','تكامل','نهايه','نهايات','لوغاريتم','اساس اللوغاريتم','اللوغاريتم الطبيعي','متجه','متجهات','مصفوفه','مصفوفات','محدد','مثلث','مضلع','مضلعات','مستطيل','مربع','معين','شبه منحرف','دائره','قطع مكافي','قطع ناقص','قطع زائد','معادله تربيعيه','معادله تفاضليه','معادله خطيه','متباينه','متتابعه','متسلسله','متتابعه حسابيه','متتابعه هندسيه','sin','cos','tan','جا','جتا','ظا','جيب','جيب التمام','ظل','نظريه فيثاغورس','احداثيات','المستوي الاحداثي','رأس','بؤره','محور','محور التماثل','نظريه ذات الحدين','تباديل','توافيق','احتمال','مساحه','محيط','حجم','كره','اسطوانه','مخروط','هرم','منشور','زاويه','محيطيه','مركزيه','حد محدود','عدد مركب','الاعداد المركبه','الاعداد التخيليه','iota','جزء حقيقي','جزء تخيلي','المنطق','وجوب','نفي','وصل','فصل','شرط','ثنائي شرطي','نظريه فيتا','نظريه الباقي','حساب التفاضل','حساب التكامل','المعادلات الانيه','مصفوفه مربعه','تحويلات','تماثل','انعكاس','انسحاب','دوران','تقريب الاعداد','اشتقاق ضمني','قاعده السلسله','نظريه القيمه المتوسطه','نظريه رول','اسي','اسس','جذر تربيعي','جذر تكعيبي','الاعداد النسبيه','الاعداد غير النسبيه','الاعداد الحقيقيه','مجموعه','مجموعات','اتحاد','تقاطع','مكمل','المتطابقات','هويه','اقتران','تركيب الاقترانات','عمليات على الاقترانات']
            }
        },
        quant: {
            'الحساب': {
                strong: ['نسبه مئويه','نسبه','معدل','متوسط','وسيط','منوال','كسر','كسور','عملات','تحويل','وحده','وحدات قياس','مقدار','اضعاف','اعداد اوليه','عدد اولي','قواسم','مضاعفات','قاسم مشترك','مضاعف مشترك','تربيع','جذر تربيعي','اس','اساسي','الربح','الخساره','تكلفه','بيع','شراء','الجملت','مستهلك','محتسب','معدل سرعه','زمن','مسافه','تسعيره','اشترك','عمال','انجزو','انجز','مبلغ','ريال','هلله','مبيعات','عاميل','تخفيض','اضافه','زياده','نقصان','نسبه التغير'],
                weak: []
            },
            'الجبر': {
                strong: ['معادله','متغير','مجهول','س ','ص ','ع ','هـ ','المعادله','حل المعادله','جذور المعادله','معامل','حدود','كثيره الحدود','تحليل','عوامل','فرق مربعين','فرق مكعبين','مجموع مكعبين','تربيع','مكمل المربع','قانون عام','مميز','الصيغه القياسيه','معادلتين انيتين','نظام معادلات','المتغيرين','صيغه','تبسيط','عبارت جبريه','اقترانات','اقتران خطي','اقتران تربيعي','الصورهالعامه'],
                weak: []
            },
            'الهندسة': {
                strong: ['زاويه','زوايا','مثلث','مستطيل','مربع','معين','متوازي','شبه منحرف','مضلع','رباعي','خماسي','سداسي','دائره','قطر','نصف قطر','محيط','مساحه','حجم','قاعده','ارتفاع','ضلع','وتر','زاويه قائمه','زاويه حاده','زاويه منفرجه','المثلث القائم','المثلث المتساوي','متطابق','متشابه','احداثيات','نقطه','مستقيم','مستوي','منصف','عمودي','مماس','محيطيه','مركزيه','هرم','اسطوانه','مخروط','منشور','كره','نصف الكره'],
                weak: []
            },
            'الإحصاء والاحتمالات': {
                strong: ['احتمال','احتمالات','تباديل','توافيق','مدى','تباين','انحراف معياري','وسط حسابي','تكرار','تكرارات','منحني','جدول تكراري','مدرج تكراري','عينه','مجتمع','حدث','احداث','مستقل','تبادل','مستحيل','اكيد','نرد','حجر','عمله','بطاقه','كرات','صناديق'],
                weak: []
            },
            'التحليل': {
                strong: ['نمط','انماط','الحد التالي','الحد القادم','تتابع','متتابعه','متسلسله','يلي','يأتي','المتسلسله','الحد المفقود','شكل تالي','شكل قادم','صف الاعداد','مقارنه بين','المقدار الاكبر','المقدار الاصغر','استنتاج','نتيجه','يستنتج','الاستدلال','عله ومعلول','سبب ونتيجه'],
                weak: []
            }
        },
        verbal: {
            'إكمال الجملة': {
                strong: ['اكمل','الفراغ','الفراغين','يكمل','يملا','........','الكلمه المناسبه','الكلمات المناسبه','الفراغ التالي','يكمل الجمله','اكمال الجمله','اكمال جمله'],
                weak: []
            },
            'التناظر اللفظي': {
                strong: [':','تناظر','يناظر','مثلما','كما','مماثل','نظير','يدل','يرمز','يعبر','تشابه','نسبه بين','علاقه بين'],
                weak: []
            },
            'الخطأ السياقي': {
                strong: ['الخطا','الخطأ','الكلمه الخاطئه','الكلمه التي لا تنتمي','غير المناسبه','غير المناسب','تحتها خط','الكلمه الشاذه','الكلمه التي لا تتناسب','المختلفه عن باقي'],
                weak: []
            },
            'استيعاب المقروء': {
                strong: ['اقرا القطعه','القطعه','النص','المقطع','يستفاد من النص','مضمون النص','الفقره','اقرا الفقره','اقرا النص','اقرا المقطع','الاديب','الكاتب','المعنى المراد','حسب النص','وفق النص'],
                weak: []
            },
            'المفردة الشاذة': {
                strong: ['مفرده شاذه','مفرده مختلفه','الكلمه الشاذه','الكلمه المختلفه','شذت','اختلفت','لا تنتمي للمجموعه','لا ينتمي للباقي','شذوذ','يختلف عن','ما عدا','عدا','ما يلي ما عدا','الكلمات التاليه ما عدا','الكلمات الاتيه ما عدا','الاتيه ما عدا','يدل علي ... ما عدا','جميعها ما عدا','كلها ما عدا'],
                weak: []
            }
        }
    };

    const sectionKW = KW[section];
    if (!sectionKW) return { topic: null, confidence: 'none', scores: {} };

    const scores = {};
    for (const [topic, kws] of Object.entries(sectionKW)) {
        let score = 0;
        for (const kw of (kws.strong||[])) {
            if (t.indexOf(kw) >= 0) score += 3;
        }
        for (const kw of (kws.weak||[])) {
            if (t.indexOf(kw) >= 0) score += 1;
        }
        scores[topic] = score;
    }

    const ranked = Object.entries(scores).sort((a,b) => b[1] - a[1]);
    if (ranked[0][1] === 0) return { topic: null, confidence: 'none', scores };

    const top = ranked[0], second = ranked[1] || ['',0];
    // High confidence: top score >= 6 AND clear gap (≥2x next)
    if (top[1] >= 6 && top[1] >= second[1] * 2) return { topic: top[0], confidence: 'high', scores };
    // Medium: top score >= 3 and beats second
    if (top[1] >= 3 && top[1] > second[1]) return { topic: top[0], confidence: 'medium', scores };
    return { topic: top[0], confidence: 'low', scores };
};

// Maps any legacy topic value (Arabic, English, variant) to a Qiyas-standard category
// Returns null if the value can't be classified (will appear under 'غير مصنّف')
window.mapToStandardTopic = function(section, raw) {
    if (!raw) return null;
    const t = String(raw).trim().toLowerCase();
    const M = {
        quant: {
            // الحساب
            'حساب':'الحساب','arithmetic':'الحساب','نسبة ومعدل':'الحساب','نسبة مئوية':'الحساب',
            'النسبة المئوية':'الحساب','تناسب':'الحساب','نسبة وتناسب':'الحساب','النسب':'الحساب',
            'متوسط حسابي':'الحساب','المتوسطات':'الحساب','منوال':'الحساب','الكسور':'الحساب',
            'كسور':'الحساب','مقارنة كسور':'الحساب','وحدات القياس':'الحساب','مسافة':'الحساب',
            'السرعة والمسافة':'الحساب','سرعة ومسافة':'الحساب','تحويل عملات':'الحساب',
            'مضاعفات':'الحساب','قاسم مشترك':'الحساب','قسمة بباقي':'الحساب','أعداد':'الحساب',
            'أعداد أولية':'الحساب','الربح والخسارة':'الحساب','مسائل حسابية':'الحساب',
            // الجبر
            'جبر':'الجبر','algebra':'الجبر','معادلات':'الجبر','المعادلات':'الجبر',
            'عمليات جبرية':'الجبر','فرق مربعين':'الجبر','الجبر':'الجبر',
            // الهندسة
            'هندسة':'الهندسة','geometry':'الهندسة','الزوايا':'الهندسة','مثلث ودائرة':'الهندسة',
            'مضلعات':'الهندسة','إحداثيات':'الهندسة',
            // الإحصاء والاحتمالات
            'إحصاء واحتمالات':'الإحصاء والاحتمالات','الإحصاء':'الإحصاء والاحتمالات',
            'احتمالات':'الإحصاء والاحتمالات','تباديل':'الإحصاء والاحتمالات',
            'قراءة جداول':'الإحصاء والاحتمالات','statistics':'الإحصاء والاحتمالات',
            // التحليل
            'أنماط':'التحليل','أنماط دورية':'التحليل','أنماط عددية':'التحليل',
            'المتتاليات':'التحليل','متتابعات':'التحليل','patterns':'التحليل',
            'استنتاج':'التحليل','مقارنة':'التحليل','المقارنة':'التحليل','comparison':'التحليل'
        },
        verbal: {
            // إكمال الجملة
            'إكمال جمل':'إكمال الجملة','إكمال الجمل':'إكمال الجملة','إكمال':'إكمال الجملة',
            'completion':'إكمال الجملة','sentence_completion':'إكمال الجملة','ترادف':'إكمال الجملة',
            // التناظر اللفظي
            'تناظر لفظي':'التناظر اللفظي','التناظر اللفظي':'التناظر اللفظي','analogy':'التناظر اللفظي',
            'ارتباط':'التناظر اللفظي','محتوى وحاوي':'التناظر اللفظي','جزء من كل':'التناظر اللفظي',
            'تتابع':'التناظر اللفظي','تضاد':'التناظر اللفظي','سبب ونتيجة':'التناظر اللفظي',
            'قواعد':'التناظر اللفظي','وصف مبالغة':'التناظر اللفظي',
            // الخطأ السياقي
            'خطأ سياقي':'الخطأ السياقي','الخطأ السياقي':'الخطأ السياقي','error_detection':'الخطأ السياقي',
            // استيعاب المقروء
            'استيعاب مقروء':'استيعاب المقروء','استيعاب المقروء':'استيعاب المقروء',
            'comprehension':'استيعاب المقروء','قطعة':'استيعاب المقروء',
            // المفردة الشاذة
            'مفردة شاذة':'المفردة الشاذة','المفردة الشاذة':'المفردة الشاذة','odd_one_out':'المفردة الشاذة'
        },
        tahsili: {
            // الرياضيات
            'رياضيات':'الرياضيات','math':'الرياضيات','جبر':'الرياضيات',
            'تفاضل وتكامل':'الرياضيات','حساب مثلثات':'الرياضيات','دوال':'الرياضيات',
            'صيغ رياضية':'الرياضيات','متتابعات':'الرياضيات','لوغاريتمات':'الرياضيات','هندسة':'الرياضيات',
            // الفيزياء
            'فيزياء':'الفيزياء','physics':'الفيزياء','فيزياء نووية':'الفيزياء',
            'فيزياء حديثة':'الفيزياء','ميكانيكا':'الفيزياء','كهرومغناطيسية':'الفيزياء',
            'كهرباء':'الفيزياء',
            // الكيمياء
            'كيمياء':'الكيمياء','chemistry':'الكيمياء','كيمياء عضوية':'الكيمياء',
            'روابط كيميائية':'الكيمياء','كيمياء حيوية':'الكيمياء','أحماض وقواعد':'الكيمياء',
            'فصل مخاليط':'الكيمياء',
            // الأحياء
            'أحياء':'الأحياء','biology':'الأحياء','وراثة':'الأحياء','علم الحيوان':'الأحياء',
            'سلوك':'الأحياء','بيئة':'الأحياء','تشريح':'الأحياء','نبات':'الأحياء',
            'انقسام خلوي':'الأحياء'
        }
    };
    return (M[section] || {})[t] || null;
};

window.loadQuestions = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 20;
    const f = window._qFilters;

    $c().innerHTML = `
    <!-- KPIs bar (overall quality at a glance) -->
    <div id="qKpis" style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px">
        <div class="kpi blue"><div class="kpi-label">المجموع</div><div class="kpi-val" id="qKpiTotal">—</div><div class="kpi-sub" id="qKpiTotalSub">سؤال نشط</div></div>
        <div class="kpi green"><div class="kpi-label">جودة كاملة</div><div class="kpi-val" id="qKpiHealthy">—</div><div class="kpi-sub">إجابة + شرح</div></div>
        <div class="kpi orange"><div class="kpi-label">بدون إجابة</div><div class="kpi-val" id="qKpiNoAnswer" style="color:var(--dng)">—</div><div class="kpi-sub" style="cursor:pointer;text-decoration:underline" onclick="qApplyQuickFilter('quality','no_answer')">عرض</div></div>
        <div class="kpi gold"><div class="kpi-label">بدون شرح</div><div class="kpi-val" id="qKpiNoExplanation" style="color:var(--gold)">—</div><div class="kpi-sub" style="cursor:pointer;text-decoration:underline" onclick="qApplyQuickFilter('quality','no_explanation')">عرض</div></div>
        <div class="kpi red"><div class="kpi-label">لها بلاغات</div><div class="kpi-val" id="qKpiReported" style="color:var(--dng)">—</div><div class="kpi-sub" style="cursor:pointer;text-decoration:underline" onclick="qApplyQuickFilter('quality','has_reports')">عرض البلاغات</div></div>
    </div>

    <!-- Topic breakdown (per section, click to filter) -->
    <div id="qTopicBreakdown" style="margin-bottom:14px"></div>

    <!-- Top toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap">
        <div class="search-box" style="flex:1;min-width:240px">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="qSearch" autocomplete="off" placeholder="ابحث في نص السؤال..." value="${esc(f.search||'')}" oninput="qSearchDebounce()">
        </div>
        <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" onclick="openClassifier()" title="تصنيف الأسئلة غير المصنّفة تلقائياً" style="border-color:var(--gold);color:var(--gold)"><svg viewBox="0 0 24 24"><path d="M12 2v6l3-3m-6 0 3 3 M2 12h6l-3 3m0-6 3 3 M22 12h-6l3-3m0 6-3-3 M12 22v-6l-3 3m6 0-3-3"/><circle cx="12" cy="12" r="3"/></svg>أداة التصنيف</button>
            <button class="btn btn-pri" onclick="openQuestionModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>إضافة سؤال</button>
        </div>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <select class="form-select" id="qSectionFilter" autocomplete="off" style="width:auto" onchange="qApplyFilter()" title="القسم">
            <option value="" ${!f.section?'selected':''}>كل الأقسام</option>
            <option value="quant" ${f.section==='quant'?'selected':''}>قدرات كمي</option>
            <option value="verbal" ${f.section==='verbal'?'selected':''}>قدرات لفظي</option>
            <option value="tahsili" ${f.section==='tahsili'?'selected':''}>تحصيلي</option>
        </select>
        <select class="form-select" id="qTopicFilter" autocomplete="off" style="width:auto;max-width:200px" onchange="qApplyFilter()" title="الموضوع">
            <option value="" ${!f.topic?'selected':''}>كل المواضيع</option>
            <!-- options injected dynamically based on selected section -->
        </select>
        <select class="form-select" id="qQualityFilter" autocomplete="off" style="width:auto" onchange="qApplyFilter()" title="جودة السؤال">
            <option value="" ${!f.quality?'selected':''}>كل الجودات</option>
            <option value="no_answer" ${f.quality==='no_answer'?'selected':''}>بدون إجابة</option>
            <option value="no_explanation" ${f.quality==='no_explanation'?'selected':''}>بدون شرح</option>
            <option value="no_topic" ${f.quality==='no_topic'?'selected':''}>بدون موضوع</option>
            <option value="with_image" ${f.quality==='with_image'?'selected':''}>بصورة فقط</option>
            <option value="has_reports" ${f.quality==='has_reports'?'selected':''}>لها بلاغات معلّقة</option>
        </select>
        <select class="form-select" id="qStatusFilter" autocomplete="off" style="width:auto" onchange="qApplyFilter()" title="الحالة">
            <option value="" ${!f.status?'selected':''}>نشطة فقط</option>
            <option value="review" ${f.status==='review'?'selected':''}>تحت المراجعة</option>
            <option value="all" ${f.status==='all'?'selected':''}>الكل (مع المعطّل)</option>
        </select>
        <select class="form-select" id="qSort" autocomplete="off" style="width:auto" onchange="qApplyFilter()" title="الترتيب">
            <option value="new" ${f.sort==='new'?'selected':''}>الأحدث</option>
            <option value="old" ${f.sort==='old'?'selected':''}>الأقدم</option>
        </select>
        <button class="btn btn-ghost" onclick="qClearFilters()" title="مسح الفلاتر" style="${(!f.section&&!f.topic&&!f.quality&&!f.status&&!f.search)?'display:none':''}">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>مسح
        </button>
    </div>
    <div id="qList"><div class="loader">جاري التحميل...</div></div>
    <div id="qPagination"></div>`;

    // Load KPIs + topic breakdown + reported question IDs in parallel
    loadQKpis();
    loadQTopicBreakdown(f.section);
    const reportedIdsPromise = loadReportedQuestionIds();

    try {
        let q = sb.from('questions').select('id,question_text,choices,correct_index,explanation,section,topic,sub_section,image_url,disabled,status,created_at', { count:'exact' });

        // Status filter
        if (f.status === 'review') q = q.eq('status','review').eq('disabled',false);
        else if (f.status === 'all') ; // no filter
        else q = q.eq('disabled', false); // active only (default)

        // Section
        if (f.section) q = q.eq('section', f.section);
        // Topic — translate standard topic into all legacy raw values (inverse mapping).
        // For "غير مصنّف" we apply it post-fetch (no server-side condition for "no match").
        let postFilterUnclassified = false;
        if (f.topic && f.topic !== '__unclassified__' && f.section) {
            const rawValues = qInverseTopicMap(f.section, f.topic);
            if (rawValues.length > 0) q = q.in('topic', rawValues);
            else q = q.eq('id', '00000000-0000-0000-0000-000000000000'); // empty result
        } else if (f.topic === '__unclassified__') {
            postFilterUnclassified = true;
        }
        // Quality
        if (f.quality === 'no_answer') q = q.is('correct_index', null);
        else if (f.quality === 'no_explanation') q = q.or('explanation.is.null,explanation.eq.');
        else if (f.quality === 'no_topic') q = q.or('topic.is.null,topic.eq.');
        else if (f.quality === 'with_image') q = q.not('image_url','is',null);
        // Search
        if (f.search) q = q.ilike('question_text', '%'+f.search+'%');

        // Quality "has_reports" needs special handling — fetch reported IDs first then filter
        let reportedIds = await reportedIdsPromise;
        if (f.quality === 'has_reports') {
            if (reportedIds.size === 0) {
                document.getElementById('qList').innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">لا أسئلة لها بلاغات معلّقة</div></div>';
                return;
            }
            q = q.in('id', Array.from(reportedIds));
        }

        // Sort
        const asc = f.sort === 'old';
        let { data, count } = await q.order('created_at',{ascending:asc})
            .range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1);

        // Post-filter for unclassified: keep only rows whose topic doesn't map to a standard
        if (postFilterUnclassified && data) {
            data = data.filter(row => !window.mapToStandardTopic(row.section, row.topic));
        }

        const list = document.getElementById('qList');
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا أسئلة</div></div>';
            return;
        }

        // Build report-count map for visible cards
        const reportCounts = await loadReportCountsForIds((data||[]).map(d => d.id));

        list.innerHTML = data.map(q => {
            const tagClass = q.section === 'verbal' ? 'lf' : q.section === 'tahsili' ? 'th' : '';
            const choices = q.choices || [];
            const missingCI = q.correct_index === null || q.correct_index === undefined;
            const missingExp = !q.explanation || q.explanation.trim() === '';
            const missingTopic = !q.topic;
            const reportCount = reportCounts[q.id] || 0;

            const badges = [];
            if (missingCI) badges.push('<span style="padding:2px 8px;border-radius:10px;background:rgba(239,68,68,.12);border:1px solid var(--dng);color:var(--dng);font-size:10px;font-weight:700">بدون إجابة</span>');
            if (missingExp) badges.push('<span style="padding:2px 8px;border-radius:10px;background:rgba(245,158,11,.12);border:1px solid var(--gold);color:var(--gold);font-size:10px;font-weight:700">بدون شرح</span>');
            if (missingTopic) badges.push('<span style="padding:2px 8px;border-radius:10px;background:rgba(107,114,128,.10);border:1px solid #9CA3AF;color:#6B7094;font-size:10px;font-weight:700">بدون موضوع</span>');
            if (reportCount > 0) badges.push(`<span onclick="showQuestionReports('${q.id}')" style="cursor:pointer;padding:2px 8px;border-radius:10px;background:var(--dng);color:#fff;font-size:10px;font-weight:700" title="اضغط لعرض البلاغات">${reportCount} بلاغ</span>`);
            if (q.disabled) badges.push('<span style="padding:2px 8px;border-radius:10px;background:#F3F4F6;color:#6B7094;font-size:10px;font-weight:700">معطّل</span>');
            if (q.status === 'review') badges.push('<span style="padding:2px 8px;border-radius:10px;background:rgba(109,93,246,.14);color:var(--pri);font-size:10px;font-weight:700">قيد المراجعة</span>');

            const cardBorder = missingCI ? 'border-right:3px solid var(--dng);'
                : reportCount > 0 ? 'border-right:3px solid var(--dng);'
                : missingExp ? 'border-right:3px solid var(--gold);' : '';
            return `<div class="q-card" style="${cardBorder}">
                <div class="q-card-top">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <span class="q-tag ${tagClass}">${sectionTag(q.section)}${(() => {
                            const std = window.mapToStandardTopic(q.section, q.topic);
                            if (std) return ' · ' + esc(std);
                            if (q.topic) return ' · ' + esc(q.topic) + ' (يحتاج تصنيف)';
                            return '';
                        })()}</span>
                        ${badges.join(' ')}
                    </div>
                    <div class="q-actions">
                        ${reportCount > 0 ? `<button class="q-act-btn" onclick='showQuestionReports(${JSON.stringify(q.id)})' title="عرض البلاغات" style="color:var(--dng)"><svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></button>` : ''}
                        <button class="q-act-btn" onclick='editQuestion(${JSON.stringify(q.id)})' title="تعديل"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="q-act-btn" onclick='deleteQuestion(${JSON.stringify(q.id)})' title="حذف"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </div>
                ${q.image_url ? '<img class="q-img-preview" src="'+esc(q.image_url)+'" onerror="this.style.display=\'none\'">' : ''}
                <div class="q-txt">${esc(q.question_text)}</div>
                <div class="q-opts-preview">
                    ${choices.map((c,i) => '<span class="q-opt-p'+(i===q.correct_index?' correct':'')+'">'+(i+1)+'. '+esc((c||'').substring(0,40))+'</span>').join('')}
                </div>
            </div>`;
        }).join('');

        // Pagination
        const totalPages = Math.ceil((count||0) / PAGE_SIZE);
        if (totalPages > 1) {
            let pg = '<div class="pagination"><div class="pg-info">صفحة '+page+' من '+totalPages+'</div><div class="pg-btns">';
            pg += '<button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadQuestions('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>';
            pg += '<button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadQuestions('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>';
            pg += '</div></div>';
            document.getElementById('qPagination').innerHTML = pg;
        }
    } catch(e) {
        console.error(e);
        document.getElementById('qList').innerHTML = '<div class="empty"><div class="empty-ic">⚠️</div><div class="empty-d">خطأ: '+(e.message||'')+'</div></div>';
    }
};

let qSearchTimer;
window.qSearchDebounce = function() {
    clearTimeout(qSearchTimer);
    window._qFilters.search = (document.getElementById('qSearch')?.value || '').trim();
    qSearchTimer = setTimeout(()=>loadQuestions(1), 400);
};

window.qApplyFilter = function() {
    const f = window._qFilters;
    f.section  = document.getElementById('qSectionFilter')?.value || '';
    f.topic    = document.getElementById('qTopicFilter')?.value || '';
    f.quality  = document.getElementById('qQualityFilter')?.value || '';
    f.status   = document.getElementById('qStatusFilter')?.value || '';
    f.sort     = document.getElementById('qSort')?.value || 'new';
    loadQuestions(1);
};

window.qApplyQuickFilter = function(key, val) {
    window._qFilters[key] = val;
    loadQuestions(1);
};

window.qClearFilters = function() {
    window._qFilters = { section:'', topic:'', quality:'', status:'', sort:'new', search:'' };
    loadQuestions(1);
};

// Load top-line KPIs (parallel with main query)
window.loadQKpis = async function() {
    const { sb } = window.A;
    try {
        const [total, healthy, noAns, noExp, reportedRows] = await Promise.all([
            sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false),
            sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false).not('correct_index','is',null).not('explanation','is',null).not('explanation','eq',''),
            sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false).is('correct_index',null),
            sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false).or('explanation.is.null,explanation.eq.'),
            sb.from('reports').select('question_id').eq('status','pending')
        ]);
        const reportedCount = new Set((reportedRows.data||[]).map(r => r.question_id)).size;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('qKpiTotal', fmt(total.count||0));
        set('qKpiHealthy', fmt(healthy.count||0));
        set('qKpiNoAnswer', fmt(noAns.count||0));
        set('qKpiNoExplanation', fmt(noExp.count||0));
        set('qKpiReported', fmt(reportedCount));
    } catch(e) { console.error('loadQKpis', e); }
};

// Load topic breakdown — uses Qiyas-standard categories only (Arabic, no English).
// Maps every legacy DB topic to its standard via mapToStandardTopic().
// Unmapped values are aggregated under "غير مصنّف" with a warning badge.
window.loadQTopicBreakdown = async function(section) {
    const { sb } = window.A;
    const wrap = document.getElementById('qTopicBreakdown');
    if (!wrap) return;
    try {
        // SERVER-SIDE ACCURATE counts via HEAD count={'exact'} requests.
        // Previous bug: .select('topic').limit(10000) was capped by PostgREST max-rows
        // (default 1000) → counts only reflected a sample, not the full table.
        const sectionsToShow = section ? [section] : ['quant','verbal','tahsili'];
        const counts = { quant:{}, verbal:{}, tahsili:{} };
        const sectionTotals = { quant:0, verbal:0, tahsili:0 };

        await Promise.all(sectionsToShow.flatMap(sec => {
            const stdList = window.QIYAS_TOPICS[sec] || [];
            const totalReq = sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false).eq('section',sec)
                .then(r => { sectionTotals[sec] = r.count || 0; });
            const stdReqs = stdList.map(std => {
                const raws = window.qInverseTopicMap(sec, std);
                if (raws.length === 0) { counts[sec][std] = 0; return Promise.resolve(); }
                return sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false).eq('section',sec).in('topic', raws)
                    .then(r => { counts[sec][std] = r.count || 0; });
            });
            return [totalReq, ...stdReqs];
        }));

        // Unclassified = section total − sum of standard counts
        const unclassified = { quant:0, verbal:0, tahsili:0 };
        sectionsToShow.forEach(sec => {
            const classified = Object.values(counts[sec]).reduce((s,n) => s+n, 0);
            unclassified[sec] = Math.max(0, sectionTotals[sec] - classified);
        });

        const sectionLabel = { quant:'قدرات كمي', verbal:'قدرات لفظي', tahsili:'تحصيلي' };
        const sectionColor = { quant:'#6D5DF6', verbal:'#22C55E', tahsili:'#FF8A3D' };

        const html = sectionsToShow.map(sec => {
            const stdList = window.QIYAS_TOPICS[sec] || [];
            const total = sectionTotals[sec]; // accurate count from DB
            if (total === 0) return '';

            // Build chips for each STANDARD topic (always shown, even if 0)
            const chips = stdList.map(t => {
                const n = counts[sec][t] || 0;
                const isActive = window._qFilters.topic === t && window._qFilters.section === sec;
                const dim = n === 0 ? 'opacity:.45;' : '';
                return `<button onclick="qPickTopic('${sec}', '${t.replace(/'/g,"\\'")}')" style="${dim}background:${isActive?sectionColor[sec]:'var(--s2)'};color:${isActive?'#fff':'var(--i2)'};border:1px solid ${isActive?sectionColor[sec]:'var(--ln)'};padding:6px 12px;border-radius:18px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:inherit;transition:all .15s">${esc(t)} <span style="background:${isActive?'rgba(255,255,255,.25)':'#fff'};color:${isActive?'#fff':sectionColor[sec]};padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700">${fmt(n)}</span></button>`;
            }).join(' ');

            // Unclassified chip (warning, only shown if > 0)
            const unclChip = unclassified[sec] > 0
                ? `<button onclick="qPickTopic('${sec}', '__unclassified__')" title="أسئلة بمواضيع قديمة لم تُصنّف على معايير قياس — تحتاج إعادة تصنيف" style="background:rgba(239,68,68,.10);color:var(--dng);border:1px dashed var(--dng);padding:6px 12px;border-radius:18px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:inherit"><svg style="width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.4" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>غير مصنّف <span style="background:#fff;color:var(--dng);padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700">${fmt(unclassified[sec])}</span></button>`
                : '';

            return `<div style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px"><span style="width:7px;height:7px;border-radius:50%;background:${sectionColor[sec]}"></span><b style="color:${sectionColor[sec]};font-size:13px">${sectionLabel[sec]}</b><span style="color:var(--i4)">${fmt(total)} سؤال · ${stdList.length} تصنيف رسمي</span></div>
                <div style="display:flex;flex-wrap:wrap;gap:6px">${chips} ${unclChip}</div>
            </div>`;
        }).filter(Boolean).join('');

        wrap.innerHTML = html ? `<div style="background:var(--sf);border:1px solid var(--ln);border-radius:10px;padding:14px 16px">${html}</div>` : '';

        // Populate the <select> with standard topics for the chosen section
        const topicSelect = document.getElementById('qTopicFilter');
        if (topicSelect && section) {
            const current = window._qFilters.topic;
            const stds = window.QIYAS_TOPICS[section] || [];
            topicSelect.innerHTML = '<option value="">كل المواضيع</option>' +
                stds.map(t => `<option value="${esc(t)}" ${current===t?'selected':''}>${esc(t)}</option>`).join('') +
                `<option value="__unclassified__" ${current==='__unclassified__'?'selected':''}>غير مصنّف (يحتاج مراجعة)</option>`;
        } else if (topicSelect) {
            topicSelect.innerHTML = '<option value="">كل المواضيع</option>';
        }
    } catch(e) { console.error('loadQTopicBreakdown', e); }
};

window.qPickTopic = function(section, topic) {
    window._qFilters.section = section;
    window._qFilters.topic = topic;
    loadQuestions(1);
};

// Inverse map: standard topic → all raw legacy values that map to it
window.qInverseTopicMap = function(section, standardTopic) {
    const map = {
        quant: {
            'الحساب': ['حساب','arithmetic','نسبة ومعدل','نسبة مئوية','النسبة المئوية','تناسب','نسبة وتناسب','النسب','متوسط حسابي','المتوسطات','منوال','الكسور','كسور','مقارنة كسور','وحدات القياس','مسافة','السرعة والمسافة','سرعة ومسافة','تحويل عملات','مضاعفات','قاسم مشترك','قسمة بباقي','أعداد','أعداد أولية','الربح والخسارة','مسائل حسابية'],
            'الجبر': ['جبر','algebra','معادلات','المعادلات','عمليات جبرية','فرق مربعين','الجبر'],
            'الهندسة': ['هندسة','geometry','الزوايا','مثلث ودائرة','مضلعات','إحداثيات'],
            'الإحصاء والاحتمالات': ['إحصاء واحتمالات','الإحصاء','احتمالات','تباديل','قراءة جداول','statistics'],
            'التحليل': ['أنماط','أنماط دورية','أنماط عددية','المتتاليات','متتابعات','patterns','استنتاج','مقارنة','المقارنة','comparison']
        },
        verbal: {
            'إكمال الجملة': ['إكمال جمل','إكمال الجمل','إكمال','completion','sentence_completion','ترادف'],
            'التناظر اللفظي': ['تناظر لفظي','التناظر اللفظي','analogy','ارتباط','محتوى وحاوي','جزء من كل','تتابع','تضاد','سبب ونتيجة','قواعد','وصف مبالغة'],
            'الخطأ السياقي': ['خطأ سياقي','الخطأ السياقي','error_detection'],
            'استيعاب المقروء': ['استيعاب مقروء','استيعاب المقروء','comprehension','قطعة'],
            'المفردة الشاذة': ['مفردة شاذة','المفردة الشاذة','odd_one_out']
        },
        tahsili: {
            'الرياضيات': ['رياضيات','math','جبر','تفاضل وتكامل','حساب مثلثات','دوال','صيغ رياضية','متتابعات','لوغاريتمات','هندسة'],
            'الفيزياء': ['فيزياء','physics','فيزياء نووية','فيزياء حديثة','ميكانيكا','كهرومغناطيسية','كهرباء'],
            'الكيمياء': ['كيمياء','chemistry','كيمياء عضوية','روابط كيميائية','كيمياء حيوية','أحماض وقواعد','فصل مخاليط'],
            'الأحياء': ['أحياء','biology','وراثة','علم الحيوان','سلوك','بيئة','تشريح','نبات','انقسام خلوي']
        }
    };
    return (map[section] || {})[standardTopic] || [];
};

// Load all question_ids that have at least one pending report (for filtering + counts)
window.loadReportedQuestionIds = async function() {
    const { sb } = window.A;
    try {
        const { data } = await sb.from('reports').select('question_id').eq('status','pending');
        return new Set((data||[]).map(r => r.question_id).filter(Boolean));
    } catch(e) { return new Set(); }
};

// Load report counts for a specific list of question_ids
window.loadReportCountsForIds = async function(ids) {
    if (!ids || ids.length === 0) return {};
    const { sb } = window.A;
    try {
        const { data } = await sb.from('reports').select('question_id').eq('status','pending').in('question_id', ids);
        const counts = {};
        (data||[]).forEach(r => { counts[r.question_id] = (counts[r.question_id]||0) + 1; });
        return counts;
    } catch(e) { return {}; }
};

// ════════════════════════════════════════════════════════════
// CLASSIFIER UI — uses classifyQuestion() to auto-tag unclassified questions
// ════════════════════════════════════════════════════════════
window._clState = window._clState || { all: [], idx: 0, autoApplied: 0, manualPending: [], section: 'tahsili' };

window.openClassifier = function() {
    const body = `
    <div style="max-height:75vh;overflow-y:auto">
        <div style="background:var(--ps);border:1px solid var(--pri-m);border-radius:10px;padding:14px;margin-bottom:14px">
            <div style="font-size:13px;font-weight:700;color:var(--pri);margin-bottom:6px">أداة التصنيف الذكي</div>
            <div style="font-size:11.5px;color:var(--i2);line-height:1.7">
                تحلّل نص كل سؤال غير مصنّف وتقترح التصنيف الصحيح بناءً على الكلمات المفتاحية.<br>
                • <b>عالية الثقة</b>: تُصنَّف تلقائياً (Auto-apply)<br>
                • <b>متوسطة/منخفضة</b>: تظهر لك للمراجعة بنقرة واحدة<br>
                • <b>غير قابلة للتصنيف</b>: تبقى كما هي للمراجعة اليدوية
            </div>
        </div>
        <div style="margin-bottom:14px">
            <label class="form-label">اختر القسم لتصنيفه</label>
            <select class="form-select" id="clSection" onchange="document.getElementById('clRunBtn').disabled=!this.value">
                <option value="">— اختر القسم —</option>
                <option value="tahsili">تحصيلي (4 مواد)</option>
                <option value="quant">قدرات كمي (5 تصنيفات)</option>
                <option value="verbal">قدرات لفظي (5 تصنيفات)</option>
            </select>
        </div>
        <div id="clProgress" style="display:none;margin-bottom:14px"></div>
        <div id="clReport" style="display:none;margin-bottom:14px"></div>
        <div id="clManual" style="display:none"></div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>
                  <button class="btn btn-pri" id="clRunBtn" disabled onclick="runClassifier()">تشغيل التصنيف</button>`;
    openModal('أداة التصنيف الذكي', body, foot);
};

window.runClassifier = async function() {
    const { sb } = window.A;
    const section = document.getElementById('clSection').value;
    if (!section) return;

    const progressEl = document.getElementById('clProgress');
    const reportEl = document.getElementById('clReport');
    progressEl.style.display = 'block';
    progressEl.innerHTML = '<div style="text-align:center;padding:14px"><div class="loader">جاري جلب الأسئلة غير المصنّفة...</div></div>';

    try {
        // Step 1: fetch all unclassified questions for the section (paginate to bypass 1000-row cap)
        const all = [];
        let offset = 0;
        const PAGE = 1000;
        while (offset < 50000) {
            const { data } = await sb.from('questions')
                .select('id, question_text, choices, correct_index, explanation, topic')
                .eq('disabled', false).eq('section', section)
                .range(offset, offset + PAGE - 1);
            if (!data || data.length === 0) break;
            all.push(...data);
            if (data.length < PAGE) break;
            offset += PAGE;
        }

        // Filter to only those whose current topic doesn't map to a Qiyas standard
        const unclassified = all.filter(q => !window.mapToStandardTopic(section, q.topic));
        if (unclassified.length === 0) {
            progressEl.innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">كل الأسئلة مصنّفة</div></div>';
            return;
        }

        // Step 2: classify each + bucket by confidence
        const buckets = { high: [], medium: [], low: [], none: [] };
        const enriched = unclassified.map(q => {
            const r = window.classifyQuestion(q.question_text, section);
            return { ...q, suggested: r.topic, confidence: r.confidence, scores: r.scores };
        });
        enriched.forEach(q => buckets[q.confidence].push(q));

        progressEl.innerHTML = `
        <div style="background:var(--s2);border-radius:10px;padding:12px;font-size:12px">
            <div style="margin-bottom:6px"><b>إجمالي الأسئلة غير المصنّفة:</b> ${fmt(unclassified.length)}</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px;font-size:11.5px">
                <div style="background:rgba(34,197,94,.1);border:1px solid var(--suc);padding:8px;border-radius:8px;text-align:center"><div style="color:var(--suc);font-size:18px;font-weight:800">${buckets.high.length}</div><div>عالية الثقة</div></div>
                <div style="background:rgba(245,158,11,.1);border:1px solid var(--gold);padding:8px;border-radius:8px;text-align:center"><div style="color:var(--gold);font-size:18px;font-weight:800">${buckets.medium.length}</div><div>متوسطة</div></div>
                <div style="background:rgba(255,138,61,.1);border:1px solid var(--acc);padding:8px;border-radius:8px;text-align:center"><div style="color:var(--acc);font-size:18px;font-weight:800">${buckets.low.length}</div><div>منخفضة</div></div>
                <div style="background:rgba(107,114,128,.1);border:1px solid var(--i4);padding:8px;border-radius:8px;text-align:center"><div style="color:var(--i4);font-size:18px;font-weight:800">${buckets.none.length}</div><div>غير قابل للتصنيف</div></div>
            </div>
        </div>`;

        // Step 3: auto-apply HIGH-confidence (always — confident enough)
        reportEl.style.display = 'block';
        let highApplied = 0, highFailed = 0;
        if (buckets.high.length > 0) {
            reportEl.innerHTML = `<div style="background:var(--ss);border:1px solid var(--suc);border-radius:8px;padding:10px;font-size:12px;color:var(--suc)"><div class="loader" style="display:inline">جاري تصنيف ${fmt(buckets.high.length)} سؤال عالي الثقة...</div></div>`;
            for (const q of buckets.high) {
                try {
                    const { error } = await sb.from('questions').update({ topic: q.suggested }).eq('id', q.id);
                    if (error) highFailed++; else highApplied++;
                } catch(_) { highFailed++; }
            }
        }

        // Step 4: build manual review queue (medium + low + none) + offer "apply all" shortcut
        window._clState.manualPending = [...buckets.medium, ...buckets.low, ...buckets.none];
        window._clState.idx = 0;
        window._clState.section = section;
        window._clState.autoApplied = highApplied;
        window._clState.highCount = buckets.high.length;
        window._clState.mediumCount = buckets.medium.length;
        window._clState.lowCount = buckets.low.length;
        window._clState.noneCount = buckets.none.length;

        const summaryHtml = highApplied > 0
            ? `<div style="background:var(--ss);border:1px solid var(--suc);border-radius:8px;padding:12px;font-size:12.5px;color:var(--suc);margin-bottom:8px"><b>تم تصنيف ${fmt(highApplied)} سؤال تلقائياً (عالية الثقة).</b>${highFailed > 0 ? ' فشل ' + highFailed + '.' : ''}</div>`
            : `<div style="background:var(--s2);border:1px solid var(--ln);border-radius:8px;padding:12px;font-size:12.5px;margin-bottom:8px">لا توجد أسئلة عالية الثقة في هذا القسم.</div>`;

        const suggestable = buckets.medium.length + buckets.low.length;
        const applyAllHtml = suggestable > 0
            ? `<div style="background:rgba(245,158,11,.10);border:1px solid var(--gold);border-radius:8px;padding:12px;font-size:12.5px;margin-bottom:8px">
                <div style="margin-bottom:8px"><b>${fmt(suggestable)} سؤال له اقتراح لكن بثقة أقل.</b></div>
                <div style="font-size:11px;color:var(--i3);margin-bottom:8px">يمكنك تطبيق كل اقتراحات الذكاء الاصطناعي دفعة واحدة (بثقة متوسطة + منخفضة)، أو مراجعتها يدوياً واحد واحد.</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button onclick="applyAllSuggestions()" class="btn btn-pri" style="background:var(--gold);border:none">تطبيق كل الاقتراحات تلقائياً (${fmt(suggestable)})</button>
                    <button onclick="document.getElementById('clManual').scrollIntoView({behavior:'smooth'})" class="btn btn-ghost">مراجعة يدوية واحد واحد</button>
                </div>
              </div>`
            : '';
        const noneHtml = buckets.none.length > 0
            ? `<div style="background:rgba(107,114,128,.08);border:1px solid var(--ln);border-radius:8px;padding:10px;font-size:11.5px;color:var(--i3);margin-bottom:8px">${fmt(buckets.none.length)} سؤال لم يستطع الذكاء الاصطناعي اقتراح تصنيف لها — تظهر للمراجعة اليدوية فقط.</div>`
            : '';
        reportEl.innerHTML = summaryHtml + applyAllHtml + noneHtml;

        renderManualReview();
    } catch(e) {
        progressEl.innerHTML = '<div style="background:var(--dng-s);border:1px solid var(--dng);border-radius:8px;padding:10px;color:var(--dng)">خطأ: '+esc(e.message||'')+'</div>';
    }
};

window.renderManualReview = function() {
    const wrap = document.getElementById('clManual');
    if (!wrap) return;
    const { manualPending: queue, idx, section, autoApplied } = window._clState;
    if (idx >= queue.length) {
        wrap.style.display = 'block';
        wrap.innerHTML = `<div class="empty"><div class="empty-ic">🎉</div><div class="empty-t">انتهى التصنيف</div><div class="empty-d">صُنِّف ${fmt(autoApplied)} تلقائياً + ${fmt(queue.length)} يدوياً = ${fmt(autoApplied + queue.length)} سؤال</div></div>`;
        return;
    }
    wrap.style.display = 'block';
    const q = queue[idx];
    const stds = window.QIYAS_TOPICS[section] || [];
    const confLabel = { medium:'متوسطة', low:'منخفضة', none:'لا يقترح' }[q.confidence] || '';
    const confColor = q.confidence === 'medium' ? 'var(--gold)' : q.confidence === 'low' ? 'var(--acc)' : 'var(--i4)';

    wrap.innerHTML = `
    <div style="border:1px solid var(--ln);border-radius:10px;padding:14px;background:var(--sf)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <b style="font-size:13px">المراجعة اليدوية · ${idx + 1} من ${queue.length}</b>
            <span style="background:${confColor}22;color:${confColor};padding:3px 10px;border-radius:10px;font-size:10.5px;font-weight:700">ثقة ${confLabel}</span>
        </div>
        <div style="background:var(--s2);border-radius:8px;padding:12px;font-size:13.5px;line-height:1.7;margin-bottom:10px">${esc(q.question_text)}</div>
        ${q.suggested ? `<div style="margin-bottom:10px;font-size:11.5px;color:var(--i3)">المقترح: <b style="color:${confColor}">${esc(q.suggested)}</b></div>` : ''}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
            ${stds.map(s => {
                const isPick = q.suggested === s;
                return `<button onclick="classifyPick('${s.replace(/'/g,"\\'")}')" style="background:${isPick?'var(--pri)':'var(--s2)'};color:${isPick?'#fff':'var(--i2)'};border:1px solid ${isPick?'var(--pri)':'var(--ln)'};padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex:1;min-width:120px">${esc(s)}</button>`;
            }).join('')}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button onclick="classifySkip()" class="btn btn-ghost" style="flex:1;min-width:120px">تخطّي</button>
            <button onclick="classifyMarkUnclassifiable()" class="btn btn-ghost" style="flex:1;min-width:120px;color:var(--dng)">يحتاج مراجعة لاحقة</button>
        </div>
    </div>`;
};

window.applyAllSuggestions = async function() {
    const { sb } = window.A;
    const s = window._clState;
    // Only apply where the AI actually suggested something (skip 'none')
    const queue = s.manualPending.filter(q => q.suggested);
    if (queue.length === 0) { showToast('لا توجد اقتراحات لتطبيقها', 'err'); return; }
    if (!confirm('تطبيق ' + queue.length + ' اقتراح؟ يمكنك مراجعة النتيجة لاحقاً عبر فلتر القسم.')) return;

    const reportEl = document.getElementById('clReport');
    if (reportEl) reportEl.innerHTML = '<div style="background:var(--ss);border:1px solid var(--suc);border-radius:8px;padding:12px;font-size:12.5px;color:var(--suc)"><div class="loader" style="display:inline">جاري تطبيق ' + queue.length + ' اقتراح...</div></div>';

    let applied = 0, failed = 0;
    for (const q of queue) {
        try {
            const { error } = await sb.from('questions').update({ topic: q.suggested }).eq('id', q.id);
            if (error) failed++; else applied++;
        } catch(_) { failed++; }
    }

    // Remove applied ones from manual queue (keep only 'none' confidence for manual review)
    s.manualPending = s.manualPending.filter(q => !q.suggested);
    s.idx = 0;
    s.autoApplied = (s.autoApplied || 0) + applied;

    if (reportEl) reportEl.innerHTML = '<div style="background:var(--ss);border:1px solid var(--suc);border-radius:8px;padding:12px;font-size:12.5px;color:var(--suc)"><b>تم تطبيق ' + fmt(applied) + ' اقتراح بنجاح.</b>' + (failed > 0 ? ' فشل ' + failed + '.' : '') + (s.manualPending.length > 0 ? ' بقي ' + s.manualPending.length + ' سؤال للمراجعة اليدوية.' : ' كل الأسئلة الآن مصنّفة.') + '</div>';

    renderManualReview();
};

window.classifyPick = async function(stdTopic) {
    const { sb } = window.A;
    const s = window._clState;
    const q = s.manualPending[s.idx];
    if (!q) return;
    try {
        await sb.from('questions').update({ topic: stdTopic }).eq('id', q.id);
    } catch(e) { showToast('خطأ: '+e.message, 'err'); return; }
    s.idx++;
    renderManualReview();
};

window.classifySkip = function() {
    window._clState.idx++;
    renderManualReview();
};

window.classifyMarkUnclassifiable = async function() {
    // Optional: tag with a special marker so it shows up in a "needs review" filter later
    window._clState.idx++;
    renderManualReview();
};

// Show all reports for a specific question in a modal
window.showQuestionReports = async function(questionId) {
    const { sb } = window.A;
    try {
        const { data } = await sb.from('reports')
            .select('id, reason, status, reported_at, admin_notes, profiles(full_name, email)')
            .eq('question_id', questionId)
            .order('reported_at', {ascending:false});
        const reports = data || [];
        if (reports.length === 0) { showToast('لا بلاغات على هذا السؤال','suc'); return; }
        const body = reports.map(r => {
            const u = r.profiles || {};
            const statusColor = r.status === 'pending' ? 'var(--dng)' : r.status === 'resolved' ? 'var(--suc)' : 'var(--i4)';
            const statusLabel = r.status === 'pending' ? 'معلّق' : r.status === 'resolved' ? 'محلول' : r.status === 'rejected' ? 'مرفوض' : r.status;
            return `<div style="border:1px solid var(--ln);border-radius:10px;padding:12px;margin-bottom:10px;background:var(--s2)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <div style="font-size:12px"><b>${esc(u.full_name||'مستخدم')}</b> <span style="color:var(--i4)">· ${esc(u.email||'')}</span></div>
                    <span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">${statusLabel}</span>
                </div>
                <div style="font-size:12.5px;color:var(--i2);margin-bottom:6px"><b>السبب:</b> ${esc(r.reason||'لم يحدّد')}</div>
                <div style="font-size:10.5px;color:var(--i4)">${fmtDate(r.reported_at)}</div>
                ${r.admin_notes ? `<div style="font-size:11px;color:var(--i3);margin-top:6px;padding-top:6px;border-top:1px dashed var(--ln)"><b>ملاحظات:</b> ${esc(r.admin_notes)}</div>` : ''}
            </div>`;
        }).join('');
        openModal('بلاغات السؤال (' + reports.length + ')', body, '<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button> <button class="btn btn-pri" onclick="closeModal();editQuestion(\'' + questionId + '\')">تعديل السؤال</button>');
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.openQuestionModal = function(existing) {
    const isEdit = !!existing;
    const data = existing || { section:'quant', question_type:'اختيار من متعدد', question_text:'', choices:['','','',''], correct_index:0, explanation:'', image_url:'' };
    const body = `
    <div class="form-grid">
        <div class="form-field">
            <label class="form-label">القسم</label>
            <select class="form-select" id="mqSection">
                <option value="quant" ${data.section==='quant'?'selected':''}>قدرات كمي</option>
                <option value="verbal" ${data.section==='verbal'?'selected':''}>قدرات لفظي</option>
                <option value="tahsili" ${data.section==='tahsili'?'selected':''}>تحصيلي</option>
            </select>
        </div>
        <div class="form-field">
            <label class="form-label">نوع السؤال</label>
            <select class="form-select" id="mqType">
                <option value="اختيار من متعدد" ${data.question_type==='اختيار من متعدد'?'selected':''}>اختيار من متعدد</option>
                <option value="قطعة" ${data.question_type==='قطعة'?'selected':''}>قطعة</option>
                <option value="صورة" ${data.question_type==='صورة'?'selected':''}>صورة</option>
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">نص السؤال</label>
            <textarea class="form-textarea" id="mqText">${esc(data.question_text)}</textarea>
        </div>
        <div class="form-field full">
            <label class="form-label">صورة السؤال (اختياري)</label>
            <div style="display:flex;gap:8px;margin-bottom:8px">
                <button type="button" class="btn btn-ghost" onclick="document.getElementById('mqImageFile').click()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>رفع ملف</button>
                <input type="file" id="mqImageFile" accept="image/*" style="display:none" onchange="uploadQuestionImage(this)">
                <span style="font-size:11px;color:var(--i4);align-self:center">أو</span>
                <input class="form-input" id="mqImage" type="url" placeholder="لصق رابط الصورة (URL)" value="${esc(data.image_url||'')}" style="flex:1" oninput="refreshImagePreview()">
            </div>
            <div id="mqImagePrev" style="margin-top:8px">${data.image_url?'<img src="'+esc(data.image_url)+'" style="max-width:200px;max-height:120px;border-radius:6px;border:1px solid var(--ln)" onerror="this.style.display=\'none\'"><button class="btn btn-dng" style="margin-right:8px" onclick="document.getElementById(\'mqImage\').value=\'\';document.getElementById(\'mqImagePrev\').innerHTML=\'\'">حذف الصورة</button>':''}</div>
            <div style="font-size:10px;color:var(--i4);margin-top:4px">الصيغ المدعومة: JPG, PNG, WebP · الحد الأقصى: 2MB</div>
        </div>
        ${[1,2,3,4].map(i => `
        <div class="form-field">
            <label class="form-label">الخيار ${i}</label>
            <input class="form-input" id="mqC${i-1}" value="${esc(data.choices[i-1]||'')}">
        </div>`).join('')}
        <div class="form-field full">
            <label class="form-label">الإجابة الصحيحة</label>
            <select class="form-select" id="mqCorrect">
                ${[0,1,2,3].map(i => '<option value="'+i+'" '+(data.correct_index===i?'selected':'')+'>الخيار '+(i+1)+'</option>').join('')}
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">الشرح</label>
            <textarea class="form-textarea" id="mqExp">${esc(data.explanation||'')}</textarea>
        </div>
    </div>`;
    const foot = '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveQuestion('+(isEdit?'"'+existing.id+'"':'null')+')">حفظ</button>';
    openModal(isEdit ? 'تعديل سؤال' : 'إضافة سؤال جديد', body, foot);

};

window.refreshImagePreview = function() {
    const url = (document.getElementById('mqImage')?.value || '').trim();
    const prev = document.getElementById('mqImagePrev');
    if (!prev) return;
    prev.innerHTML = url
        ? '<img src="'+esc(url)+'" style="max-width:200px;max-height:120px;border-radius:6px;border:1px solid var(--ln)" onerror="this.style.display=\'none\'"><button class="btn btn-dng" style="margin-right:8px" onclick="document.getElementById(\'mqImage\').value=\'\';document.getElementById(\'mqImagePrev\').innerHTML=\'\'">حذف الصورة</button>'
        : '';
};

window.uploadQuestionImage = async function(input) {
    const { sb } = window.A;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('الملف أكبر من 2MB','err'); return; }
    if (!/^image\//.test(file.type)) { showToast('يرجى اختيار صورة','err'); return; }

    const prev = document.getElementById('mqImagePrev');
    prev.innerHTML = '<div style="font-size:11px;color:var(--i3);padding:10px">جاري الرفع...</div>';

    try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = 'questions/' + Date.now() + '-' + Math.random().toString(36).substr(2,8) + '.' + ext;
        const { error } = await sb.storage.from('question-images').upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
            // Fallback: if bucket doesn't exist yet, inform user
            if (/bucket|not found/i.test(error.message)) {
                showToast('Storage bucket "question-images" غير موجود — راجع setup','err');
            } else {
                showToast('خطأ في الرفع: ' + error.message, 'err');
            }
            prev.innerHTML = '';
            return;
        }
        const { data } = sb.storage.from('question-images').getPublicUrl(path);
        document.getElementById('mqImage').value = data.publicUrl;
        refreshImagePreview();
        showToast('تم رفع الصورة','suc');
    } catch(e) {
        showToast('خطأ: ' + e.message, 'err');
        prev.innerHTML = '';
    } finally {
        input.value = '';
    }
};

window.saveQuestion = async function(id) {
    const { sb } = window.A;
    const data = {
        section: document.getElementById('mqSection').value,
        question_type: document.getElementById('mqType').value,
        question_text: document.getElementById('mqText').value.trim(),
        choices: [0,1,2,3].map(i => document.getElementById('mqC'+i).value.trim()),
        correct_index: parseInt(document.getElementById('mqCorrect').value),
        explanation: document.getElementById('mqExp').value.trim(),
        image_url: document.getElementById('mqImage').value.trim() || null
    };
    if (!data.question_text) return showToast('نص السؤال مطلوب','err');
    if (data.choices.some(c => !c)) return showToast('كل الخيارات الأربعة مطلوبة','err');
    if (!data.explanation) return showToast('الشرح مطلوب','err');

    try {
        if (id) {
            await sb.from('questions').update(data).eq('id', id);
            showToast('تم تحديث السؤال','suc');
        } else {
            await sb.from('questions').insert(data);
            showToast('تم إضافة السؤال','suc');
        }
        closeModal();
        loadQuestions();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editQuestion = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('questions').select('*').eq('id', id).single();
    if (data) openQuestionModal(data);
};

window.deleteQuestion = async function(id) {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    const { sb } = window.A;
    // Soft delete — set disabled=true بدل الحذف الكامل
    await sb.from('questions').update({disabled:true}).eq('id', id);
    showToast('تم حذف السؤال','suc');
    loadQuestions();
};

// ═══════════════════════════════════════════════════════
// 3. REVIEW (موحّد: أسئلة جديدة + بلاغات)
// ═══════════════════════════════════════════════════════
window.loadReview = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;gap:4px;border-bottom:1px solid var(--ln);margin-bottom:16px;padding:0 4px">
        <button class="rev-tab on" data-t="pending" onclick="switchReviewTab(this,'pending')" style="padding:10px 16px;font-size:12px;font-weight:600;background:none;border:none;border-bottom:2.5px solid var(--pri);color:var(--pri);cursor:pointer">أسئلة تحتاج مراجعة <span id="tabPendingCount" style="background:var(--pri);color:#fff;padding:1px 7px;border-radius:20px;font-size:10px;margin-right:4px">0</span></button>
        <button class="rev-tab" data-t="reports" onclick="switchReviewTab(this,'reports')" style="padding:10px 16px;font-size:12px;font-weight:600;background:none;border:none;border-bottom:2.5px solid transparent;color:var(--i3);cursor:pointer">بلاغات الطلاب <span id="tabReportsCount" style="background:var(--dng);color:#fff;padding:1px 7px;border-radius:20px;font-size:10px;margin-right:4px">0</span></button>
    </div>
    <div id="revPendingArea"><div class="loader">جاري التحميل...</div></div>
    <div id="revReportsArea" style="display:none"></div>`;

    // Load counts + default tab
    loadReviewPendingQuestions();
    loadReviewReportsCount();
};

window.switchReviewTab = function(btn, tab) {
    document.querySelectorAll('.rev-tab').forEach(b => {
        b.style.borderBottomColor = 'transparent';
        b.style.color = 'var(--i3)';
    });
    btn.style.borderBottomColor = 'var(--pri)';
    btn.style.color = 'var(--pri)';

    if (tab === 'pending') {
        document.getElementById('revPendingArea').style.display = '';
        document.getElementById('revReportsArea').style.display = 'none';
        loadReviewPendingQuestions();
    } else {
        document.getElementById('revPendingArea').style.display = 'none';
        document.getElementById('revReportsArea').style.display = '';
        loadReviewReports();
    }
};

async function loadReviewPendingQuestions() {
    const { sb } = window.A;
    const area = document.getElementById('revPendingArea');
    if (!area) return;
    area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    try {
        const { data, count } = await sb.from('questions')
            .select('id,question_text,choices,correct_index,explanation,image_url,section,topic,created_at', {count:'exact'})
            .eq('status', 'review').eq('disabled', false)
            .order('created_at', {ascending:false}).limit(50);

        document.getElementById('tabPendingCount').textContent = count || 0;

        if (!data || data.length === 0) {
            area.innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">لا أسئلة تحتاج مراجعة</div><div class="empty-d">كل الأسئلة الجديدة تمت الموافقة عليها</div></div>';
            return;
        }

        area.innerHTML = '<div style="margin-bottom:14px;font-size:13px;color:var(--i2)"><b>'+data.length+'</b> سؤال جديد يحتاج مراجعة قبل النشر</div>' +
        data.map(q => {
            const choices = q.choices || [];
            return `<div class="review-q">
                <div class="rq-top">
                    <span class="q-tag">${sectionTag(q.section)}${q.topic?' · '+esc(q.topic):''}</span>
                    <span style="font-size:10px;color:var(--i3)">أُضيف: ${fmtDate(q.created_at)}</span>
                </div>
                ${q.image_url ? '<img src="'+esc(q.image_url)+'" style="max-width:300px;border-radius:8px;margin-bottom:12px" onerror="this.style.display=\'none\'">' : ''}
                <div class="rq-txt">${esc(q.question_text)}</div>
                <div class="rq-opts">
                    ${choices.map((c,i) => `<div class="rq-opt ${i===q.correct_index?'marked-correct':''}"><div class="rq-opt-ltr" style="${i===q.correct_index?'background:var(--suc);border-color:var(--suc);color:#fff':''}">${i+1}</div>${esc(c)}</div>`).join('')}
                </div>
                ${q.explanation?'<div style="background:#FEFCE8;border:1px solid #FDE68A;border-radius:9px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--i2)"><b style="color:#92400E">الشرح:</b> '+esc(q.explanation)+'</div>':''}
                <div class="rq-actions">
                    <button class="btn btn-dng" onclick='approveQuestion("${q.id}","reject")'>رفض السؤال</button>
                    <button class="btn btn-ghost" onclick='editQuestion("${q.id}")'>تعديل</button>
                    <button class="btn btn-suc" onclick='approveQuestion("${q.id}","approve")'>قبول ونشر</button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        area.innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>';
    }
}

async function loadReviewReportsCount() {
    const { sb } = window.A;
    try {
        const { count } = await sb.from('reports').select('*',{count:'exact',head:true}).eq('status','pending');
        document.getElementById('tabReportsCount').textContent = count || 0;
    } catch(e){}
}

async function loadReviewReports() {
    const { sb } = window.A;
    const area = document.getElementById('revReportsArea');
    if (!area) return;
    area.innerHTML = '<div class="loader">جاري التحميل...</div>';
    try {
        // The reports table uses reported_at (not created_at). Using created_at causes
        // PostgREST to return 400 'column does not exist' which would silently empty the list.
        const { data, count } = await sb.from('reports')
            .select('id, reason, reported_at, status, user_id, questions(id,question_text,choices,correct_index,explanation,image_url,section,topic), profiles(full_name,email)', {count:'exact'})
            .eq('status','pending').order('reported_at',{ascending:false}).limit(50);

        document.getElementById('tabReportsCount').textContent = count || 0;

        if (!data || data.length === 0) {
            area.innerHTML = '<div class="empty"><div class="empty-ic">✅</div><div class="empty-t">لا بلاغات معلقة</div><div class="empty-d">كل البلاغات تمت مراجعتها</div></div>';
            return;
        }

        area.innerHTML = '<div style="margin-bottom:14px;font-size:13px;color:var(--i2)"><b>'+data.length+'</b> بلاغ من الطلاب يحتاج مراجعة</div>' +
        data.map(r => {
            const q = r.questions;
            if (!q) return '';
            const choices = q.choices || [];
            const u = r.profiles || {};
            return `<div class="review-q">
                <div class="rq-top">
                    <span class="q-tag">${sectionTag(q.section)}${q.topic?' · '+esc(window.mapToStandardTopic(q.section,q.topic)||q.topic):''}</span>
                    <span style="font-size:10px;color:var(--i3)">أبلغ: <b>${esc(u.full_name||'—')}</b>${u.email?' <span style="color:var(--i4)">· '+esc(u.email)+'</span>':''} · ${fmtDate(r.reported_at)}</span>
                </div>
                ${q.image_url ? '<img src="'+esc(q.image_url)+'" style="max-width:300px;border-radius:8px;margin-bottom:12px" onerror="this.style.display=\'none\'">' : ''}
                <div class="rq-txt">${esc(q.question_text)}</div>
                <div class="rq-opts">
                    ${choices.map((c,i) => `<div class="rq-opt ${i===q.correct_index?'marked-correct':''}"><div class="rq-opt-ltr" style="${i===q.correct_index?'background:var(--suc);border-color:var(--suc);color:#fff':''}">${i+1}</div>${esc(c)}</div>`).join('')}
                </div>
                <div style="background:var(--dng-s);border:1px solid rgba(239,68,68,.15);border-radius:9px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:var(--i2)"><b style="color:var(--dng)">سبب البلاغ:</b> ${esc(r.reason)}</div>
                <div class="rq-actions">
                    <button class="btn btn-dng" onclick='resolveReport("${r.id}","rejected","${q.id}",false)'>رفض السؤال</button>
                    <button class="btn btn-ghost" onclick='resolveReport("${r.id}","edit","${q.id}",false)'>تعديل وقبول</button>
                    <button class="btn btn-suc" onclick='resolveReport("${r.id}","resolved","${q.id}",true)'>قبول كما هو</button>
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        area.innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>';
    }
}

window.approveQuestion = async function(id, action) {
    const { sb } = window.A;
    try {
        if (action === 'approve') {
            await sb.from('questions').update({status:'active'}).eq('id', id);
            showToast('تم قبول ونشر السؤال','suc');
        } else if (action === 'reject') {
            if (!confirm('تأكيد رفض السؤال؟')) return;
            await sb.from('questions').update({status:'rejected',disabled:true}).eq('id', id);
            showToast('تم رفض السؤال','suc');
        }
        loadReviewPendingQuestions();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.resolveReport = async function(reportId, action, questionId, keepQuestion) {
    const { sb, profile } = window.A;
    try {
        if (action === 'rejected') {
            // Disable the question + reject report
            await sb.from('questions').update({disabled:true}).eq('id', questionId);
            await sb.from('reports').update({status:'rejected',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            showToast('تم حذف السؤال','suc');
        } else if (action === 'edit') {
            const { data:q } = await sb.from('questions').select('*').eq('id', questionId).single();
            await sb.from('reports').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            if (q) openQuestionModal(q);
            return;
        } else {
            await sb.from('reports').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:profile.id}).eq('id', reportId);
            showToast('تم قبول السؤال كما هو','suc');
        }
        loadReview();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 4. USERS
// ═══════════════════════════════════════════════════════
// ── حالة الفلاتر (تُحفظ بين الصفحات) ──
window._uFilters = window._uFilters || { search:'', sub:'', source:'', sort:'newest' };

window.loadUsers = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 20;
    // اقرأ القيم الحالية قبل rebuild حتى لا تُمسح
    const cur = window._uFilters;
    const prevSearch = (document.getElementById('uSearch')?.value || cur.search || '').trim();
    const prevSub    = document.getElementById('uSubFilter')?.value ?? cur.sub;
    const prevSrc    = document.getElementById('uSrcFilter')?.value ?? cur.source;
    const prevSort   = document.getElementById('uSort')?.value ?? cur.sort;
    cur.search = prevSearch; cur.sub = prevSub; cur.source = prevSrc; cur.sort = prevSort;

    const opt = (selected, val, label) => `<option value="${val}"${val===selected?' selected':''}>${label}</option>`;

    $c().innerHTML = `
    <div id="uStatsRow" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-card" id="statTotal" style="background:var(--sf);border:1px solid var(--ln);padding:14px;border-radius:14px"><div style="font-size:11px;color:var(--i3);font-weight:600">إجمالي الأعضاء</div><div style="font-size:22px;font-weight:800;color:var(--ink);margin-top:4px">…</div></div>
        <div class="stat-card" id="statActive" style="background:var(--sf);border:1px solid var(--ln);padding:14px;border-radius:14px;cursor:pointer" onclick="setUsersFilter('sub','active')"><div style="font-size:11px;color:var(--i3);font-weight:600">مشتركون فعليون</div><div style="font-size:22px;font-weight:800;color:var(--suc);margin-top:4px">…</div></div>
        <div class="stat-card" id="statFree" style="background:var(--sf);border:1px solid var(--ln);padding:14px;border-radius:14px;cursor:pointer" onclick="setUsersFilter('sub','free')"><div style="font-size:11px;color:var(--i3);font-weight:600">مجانيون</div><div style="font-size:22px;font-weight:800;color:var(--i2);margin-top:4px">…</div></div>
        <div class="stat-card" id="statExpired" style="background:var(--sf);border:1px solid var(--ln);padding:14px;border-radius:14px;cursor:pointer" onclick="setUsersFilter('sub','expired')"><div style="font-size:11px;color:var(--i3);font-weight:600">منتهي اشتراكهم</div><div style="font-size:22px;font-weight:800;color:var(--dng);margin-top:4px">…</div></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">
        <div class="search-box" style="flex:1;min-width:240px">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="uSearch" placeholder="ابحث بالاسم/الجوال/الإيميل/كود الكوبون/UUID..." value="${esc(prevSearch)}" oninput="uSearchDebounce()">
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <select class="form-select" id="uSubFilter" style="width:auto;min-width:130px" onchange="loadUsers(1)">
                ${opt(prevSub,'','كل الاشتراكات')}
                ${opt(prevSub,'active','مشتركون فعليون')}
                ${opt(prevSub,'monthly','شهري')}
                ${opt(prevSub,'quarterly','3 شهور')}
                ${opt(prevSub,'yearly','سنوي')}
                ${opt(prevSub,'free','مجانيون')}
                ${opt(prevSub,'expired','منتهي')}
            </select>
            <select class="form-select" id="uSrcFilter" style="width:auto;min-width:140px" onchange="loadUsers(1)">
                ${opt(prevSrc,'','كل المصادر')}
                ${opt(prevSrc,'coupon_free','كوبون مجاني')}
                ${opt(prevSrc,'coupon_discount','كوبون خصم')}
                ${opt(prevSrc,'paid','مدفوع (MyFatoorah)')}
                ${opt(prevSrc,'apple_iap','Apple IAP')}
                ${opt(prevSrc,'google_play','Google Play')}
                ${opt(prevSrc,'admin_grant','منحة إدارية')}
                ${opt(prevSrc,'referral','إحالة')}
                ${opt(prevSrc,'unknown','غير محدّد')}
            </select>
            <select class="form-select" id="uSort" style="width:auto;min-width:130px" onchange="loadUsers(1)">
                ${opt(prevSort,'newest','الأحدث')}
                ${opt(prevSort,'oldest','الأقدم')}
                ${opt(prevSort,'last_seen_desc','الأكثر نشاطاً')}
                ${opt(prevSort,'last_seen_asc','الأقل نشاطاً')}
                ${opt(prevSort,'name','أبجدي')}
            </select>
            <button class="btn btn-ghost" onclick="resetUsersFilters()" title="إعادة تعيين كل الفلاتر"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg></button>
            <button class="btn btn-ghost" onclick="exportUsers()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>CSV</button>
        </div>
    </div>
    <div class="card"><div class="tbl-wrap" id="uTable"><div class="loader">جاري التحميل...</div></div></div>
    <style>@media(max-width:780px){#uStatsRow{grid-template-columns:repeat(2,1fr)}}</style>`;

    // الحفاظ على cursor في البحث
    const searchInput = document.getElementById('uSearch');
    if (prevSearch && searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(prevSearch.length, prevSearch.length);
    }

    try {
        // مع الفلاتر الموسّعة، نجلب صفحة كبيرة (500) ونفلتر/نفرز ونرتّب client-side
        const rpcFilter = (prevSub === 'active') ? 'subscribed'
                        : (prevSub === 'free')   ? 'free'
                        : (prevSub === 'expired')? 'expired'
                        : '';
        const { data: rpcData, error } = await sb.rpc('admin_get_users', {
            p_filter: rpcFilter,
            p_search: '',                 // البحث client-side عشان يطابق email/coupon
            p_page: 1,
            p_page_size: 500
        });
        if (error) throw error;

        let data = rpcData?.users || [];

        const tbl = document.getElementById('uTable');
        if (data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">👥</div><div class="empty-t">لا أعضاء</div></div>';
            updateUsersStats({total:0,active:0,free:0,expired:0});
            return;
        }

        // الإحصائيات جاهزة من RPC (total_attempts + correct_attempts)
        const stats = {};
        data.forEach(u => {
            stats[u.id] = { total: u.total_attempts || 0, correct: u.correct_attempts || 0 };
        });

        // جلب email + subscription_source + referred_by + كوبون مُستخدَم فعلياً
        const userIds = data.map(u => u.id);
        const extraMap = {};
        const couponMap = {};       // user_id → { code, isFree, type, value }
        const paymentMap = {};      // user_id → آخر دفعة (amount, coupon_code, status)
        try {
            const [profRes, redRes, payRes] = await Promise.all([
                sb.from('profiles').select('id, email, subscription_source').in('id', userIds),
                sb.from('coupon_redemptions').select('user_id, coupon_code, discount_type, discount_value, final_amount, status, created_at').in('user_id', userIds).eq('status','success').order('created_at',{ascending:false}),
                sb.from('payments').select('user_id, amount, coupon_code, status, created_at').in('user_id', userIds).eq('status','paid').order('created_at',{ascending:false})
            ]);
            (profRes.data || []).forEach(e => { extraMap[e.id] = e; });
            // أحدث استخدام ناجح لكوبون لكل مستخدم
            (redRes.data || []).forEach(r => {
                if (!couponMap[r.user_id]) {
                    const isFree = r.discount_type === 'free' || (r.discount_type === 'percentage' && Number(r.discount_value) >= 100) || Number(r.final_amount) <= 0;
                    couponMap[r.user_id] = { code: r.coupon_code, isFree, type: r.discount_type, value: r.discount_value };
                }
            });
            // آخر دفعة لكل مستخدم
            (payRes.data || []).forEach(p => {
                if (!paymentMap[p.user_id]) paymentMap[p.user_id] = p;
            });
        } catch(_) { /* لو فشل، نكمّل */ }

        // helper: badge مصدر الاشتراك (مدفوع / كوبون مجاني / كوبون خصم / إحالة / منحة / IAP)
        const sourceBadge = (u) => {
            const ex = extraMap[u.id] || {};
            const src = ex.subscription_source || '';
            const cp = couponMap[u.id];          // من coupon_redemptions (المصدر الأدق)
            const lastPay = paymentMap[u.id];    // آخر دفعة paid
            const profCoupon = u.used_coupon || ''; // legacy field على profiles
            const isPaid = u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date();
            if (!isPaid) return '<span class="td-muted">—</span>';

            const pill = (txt, color, bg, title='') => `<span title="${esc(title)}" style="font-size:11px;font-weight:700;color:${color};background:${bg};padding:3px 9px;border-radius:8px;white-space:nowrap">${esc(txt)}</span>`;

            // 1) كوبون مجاني من coupon_redemptions (FREE26/FREE01/TURAIF/100%)
            if (cp && cp.isFree) {
                return pill('كوبون مجاني · ' + cp.code, '#9333EA', '#F3E8FF', 'اشتراك مجاني عبر كوبون: '+cp.code);
            }
            // 2) كوبون خصم جزئي من coupon_redemptions
            if (cp && !cp.isFree) {
                const valueLbl = cp.type === 'percentage' ? cp.value+'%' : cp.value+' ر.س';
                return pill('كوبون خصم · ' + cp.code, 'var(--acc)', 'var(--as)', 'دفع جزئي بكوبون '+cp.code+' (-'+valueLbl+')');
            }
            // 3) كوبون من جدول payments (لو ما في coupon_redemption record)
            if (lastPay && lastPay.coupon_code) {
                const isFreeFromPay = Number(lastPay.amount) === 0;
                if (isFreeFromPay) return pill('كوبون مجاني · ' + lastPay.coupon_code, '#9333EA', '#F3E8FF', 'دفعة بـ0 ر.س مع كوبون: '+lastPay.coupon_code);
                return pill('كوبون خصم · ' + lastPay.coupon_code, 'var(--acc)', 'var(--as)', 'دفعة جزئية بكوبون: '+lastPay.coupon_code+' (المبلغ: '+lastPay.amount+' ر.س)');
            }
            // 4) كوبون من profiles.used_coupon (legacy field)
            if (profCoupon) {
                return pill('كوبون · ' + profCoupon, 'var(--acc)', 'var(--as)', 'مسجَّل في profiles.used_coupon (قد يكون قديم)');
            }
            // 5) IAP
            if (src === 'apple_iap')   return pill('Apple IAP', '#1A1D2E', '#E5E7EB', 'اشتراك من iOS');
            if (src === 'google_play') return pill('Google Play', '#1A1D2E', '#E5E7EB', 'اشتراك من Android');
            // 6) منحة إدارية صريحة
            if (src === 'admin')       return pill('منحة إدارية', 'var(--pri)', 'var(--ps)', 'admin منح اشتراك يدوياً');
            // 7) دفع كامل (mfatoorah أو payment > 0)
            if (src === 'myfatoorah' || (lastPay && Number(lastPay.amount) > 0)) {
                return pill('مدفوع', 'var(--suc)', 'var(--ss)', 'دفع عبر MyFatoorah');
            }
            // 8) Fallback — مشترك لكن لا أثر في أي جدول دفع/كوبون → أُضيف يدوياً
            return pill('منحة (يدوي)', 'var(--pri)', 'var(--ps)', 'مشترك بدون payment/coupon — مفترض أُضيف يدوياً من admin');
        };

        // ── helper: تصنيف source لكل user (للفلتر) ──
        const classifyUser = (u) => {
            const ex = extraMap[u.id] || {};
            const cp = couponMap[u.id];
            const lastPay = paymentMap[u.id];
            const profCoupon = u.used_coupon || '';
            const isPaid = u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date();
            if (!isPaid) return 'none';
            if (cp && cp.isFree) return 'coupon_free';
            if (cp && !cp.isFree) return 'coupon_discount';
            if (lastPay && lastPay.coupon_code) return Number(lastPay.amount) === 0 ? 'coupon_free' : 'coupon_discount';
            if (profCoupon) return 'coupon_discount';
            if (ex.subscription_source === 'apple_iap')   return 'apple_iap';
            if (ex.subscription_source === 'google_play') return 'google_play';
            if (ex.subscription_source === 'admin')       return 'admin_grant';
            if (ex.subscription_source === 'myfatoorah' || (lastPay && Number(lastPay.amount) > 0)) return 'paid';
            return 'unknown';
        };

        // ── الإحصائيات (من البيانات الكاملة قبل الفلاتر) ──
        const now = new Date();
        let sCount = {total: data.length, active:0, free:0, expired:0};
        data.forEach(u => {
            const hasEnd = u.subscription_end && new Date(u.subscription_end) > now;
            if (u.subscription_type && u.subscription_type !== 'free' && hasEnd) sCount.active++;
            else if (u.subscription_end && new Date(u.subscription_end) <= now && u.subscription_type !== 'free') sCount.expired++;
            else sCount.free++;
        });
        updateUsersStats(sCount);

        // ── فلتر type-precise ──
        if (prevSub === 'monthly' || prevSub === 'quarterly' || prevSub === 'yearly') {
            data = data.filter(u => u.subscription_type === prevSub && u.subscription_end && new Date(u.subscription_end) > now);
        } else if (prevSub === 'active') {
            data = data.filter(u => u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > now);
        }

        // ── فلتر "كيف اشترك" ──
        if (prevSrc) {
            data = data.filter(u => classifyUser(u) === prevSrc);
        }

        // ── البحث الموسّع (name/phone/email/coupon/UUID) ──
        if (prevSearch) {
            const q = prevSearch.toLowerCase();
            data = data.filter(u => {
                const ex = extraMap[u.id] || {};
                const cp = couponMap[u.id];
                const lastPay = paymentMap[u.id];
                return (u.full_name||'').toLowerCase().includes(q)
                    || (u.phone||'').toLowerCase().includes(q)
                    || (ex.email||'').toLowerCase().includes(q)
                    || (cp && cp.code && cp.code.toLowerCase().includes(q))
                    || (lastPay && lastPay.coupon_code && lastPay.coupon_code.toLowerCase().includes(q))
                    || (u.used_coupon||'').toLowerCase().includes(q)
                    || (u.id||'').toLowerCase().includes(q);
            });
        }

        // ── الترتيب ──
        const sortFn = {
            'newest':         (a,b) => new Date(b.created_at) - new Date(a.created_at),
            'oldest':         (a,b) => new Date(a.created_at) - new Date(b.created_at),
            'last_seen_desc': (a,b) => new Date(b.last_seen_at||0) - new Date(a.last_seen_at||0),
            'last_seen_asc':  (a,b) => new Date(a.last_seen_at||0) - new Date(b.last_seen_at||0),
            'name':           (a,b) => (a.full_name||'').localeCompare(b.full_name||'', 'ar')
        }[prevSort] || ((a,b) => new Date(b.created_at) - new Date(a.created_at));
        data.sort(sortFn);

        // ── pagination client-side ──
        const filteredCount = data.length;
        const totalPages = Math.max(1, Math.ceil(filteredCount/PAGE_SIZE));
        if (page > totalPages) page = totalPages;
        const pageData = data.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

        if (pageData.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">🔎</div><div class="empty-t">لا نتائج</div><div class="empty-d">جرّب تغيير الفلاتر أو إعادة التعيين</div></div>';
            return;
        }

        tbl.innerHTML = `<table>
            <thead><tr><th>العضو</th><th>الجوال</th><th>الاشتراك</th><th>كيف اشترك</th><th>الانضمام</th><th>آخر نشاط</th><th>المحاولات</th><th>الدقة</th><th></th></tr></thead>
            <tbody>${pageData.map(u => {
                const st = stats[u.id] || {total:0,correct:0};
                const acc = st.total > 0 ? Math.round(st.correct/st.total*100) : 0;
                const sub = (u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date())
                    ? '<span class="status-pill active">' + (u.subscription_type === 'yearly' ? 'سنوي' : u.subscription_type === 'quarterly' ? '3 أشهر' : 'شهري') + '</span>'
                    : '<span class="status-pill free">مجاني</span>';
                const lastSeen = fmtDate(u.last_seen_at, true);
                const joined   = fmtDate(u.created_at, true);
                const name = u.full_name || '—';
                const email = (extraMap[u.id]||{}).email || '';
                return `<tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="tbl-avatar">${(window.buildAvatarHTML ? window.buildAvatarHTML(u.avatar_emoji, name, 36) : esc(name.charAt(0)))}</div><div><div class="td-name">${esc(name)}</div>${email ? '<div style="font-size:10.5px;color:var(--i4);direction:ltr;text-align:right;margin-top:2px">'+esc(email)+'</div>' : ''}</div></div></td>
                    <td class="td-muted">${esc(u.phone||'—')}</td>
                    <td>${sub}</td>
                    <td>${sourceBadge(u)}</td>
                    <td class="td-muted" style="white-space:nowrap;font-size:11.5px">${joined}</td>
                    <td class="td-muted" style="white-space:nowrap;font-size:11.5px">${lastSeen}</td>
                    <td><b>${fmt(st.total)}</b></td>
                    <td><b style="color:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'}">${acc}%</b></td>
                    <td><button class="q-act-btn" onclick="viewUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;

        // Pagination + count info
        if (totalPages > 1 || filteredCount > 0) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(filteredCount)+' عضو · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadUsers('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadUsers('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { document.getElementById('uTable').innerHTML = '<div class="empty-d">خطأ: '+e.message+'</div>'; }
};

// ── helpers لفلاتر الأعضاء ──
function updateUsersStats(c) {
    const tot = document.getElementById('statTotal');
    const act = document.getElementById('statActive');
    const fre = document.getElementById('statFree');
    const exp = document.getElementById('statExpired');
    if (tot) tot.querySelector('div:last-child').textContent = fmt(c.total);
    if (act) act.querySelector('div:last-child').textContent = fmt(c.active);
    if (fre) fre.querySelector('div:last-child').textContent = fmt(c.free);
    if (exp) exp.querySelector('div:last-child').textContent = fmt(c.expired);
}
window.setUsersFilter = function(key, val) {
    if (!window._uFilters) window._uFilters = {search:'',sub:'',source:'',sort:'newest'};
    window._uFilters[key] = val;
    loadUsers(1);
};
window.resetUsersFilters = function() {
    window._uFilters = {search:'',sub:'',source:'',sort:'newest'};
    loadUsers(1);
};

let uSearchTimer;
window.uSearchDebounce = function() { clearTimeout(uSearchTimer); uSearchTimer = setTimeout(()=>loadUsers(1), 400); };

window.viewUser = async function(id) {
    const { sb } = window.A;
    const { data: u } = await sb.from('profiles').select('*').eq('id', id).single();
    if (!u) return;
    const endDateVal = u.subscription_end ? new Date(u.subscription_end).toISOString().split('T')[0] : '';
    const subType = u.subscription_type || 'free';
    const role = u.role || 'user';
    const subSource = u.subscription_source || '';
    const autoRenew = u.auto_renew_enabled !== false;
    const sectionHead = (txt) => `<div class="form-field full" style="margin-top:6px"><div style="font-size:11px;font-weight:700;color:var(--pri);letter-spacing:.04em;padding:10px 0 4px;border-top:1px solid var(--ln)">${txt}</div></div>`;
    const body = `
    <div class="form-grid">
        ${sectionHead('— معلومات شخصية —')}
        <div class="form-field"><label class="form-label">الاسم الكامل</label><input class="form-input" id="euName" value="${esc(u.full_name||'')}"></div>
        <div class="form-field"><label class="form-label">الجوال</label><input class="form-input" id="euPhone" value="${esc(u.phone||'')}" placeholder="+966..."></div>
        <div class="form-field"><label class="form-label">البريد الإلكتروني (Login)</label><input class="form-input" id="euEmail" value="${esc(u.email||'')}" placeholder="user@example.com" style="direction:ltr;text-align:left"></div>
        <div class="form-field"><label class="form-label">كود الإحالة</label><input class="form-input" id="euRef" value="${esc(u.referral_code||'')}" placeholder="MADAR-..."></div>
        <div class="form-field"><label class="form-label">Avatar (ايموجي / dice / photo)</label><input class="form-input" id="euAvatar" value="${esc(u.avatar_emoji||'')}" placeholder="م أو dice:adventurer:seed أو photo:url"></div>
        <div class="form-field"><label class="form-label">الدور (Role)</label>
            <select class="form-select" id="euRole">
                <option value="user" ${role==='user'?'selected':''}>عضو عادي</option>
                <option value="staff" ${role==='staff'?'selected':''}>موظف (Staff)</option>
                <option value="admin" ${role==='admin'?'selected':''}>مدير (Admin)</option>
            </select>
        </div>

        ${sectionHead('— الاشتراك —')}
        <div class="form-field"><label class="form-label">نوع الاشتراك</label>
            <select class="form-select" id="euSub" onchange="autoFillSubEnd(this.value)">
                <option value="free" ${subType==='free'?'selected':''}>مجاني</option>
                <option value="monthly" ${subType==='monthly'?'selected':''}>شهري (Pro)</option>
                <option value="quarterly" ${subType==='quarterly'?'selected':''}>ربع سنوي</option>
                <option value="yearly" ${subType==='yearly'?'selected':''}>سنوي (Elite)</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">تاريخ انتهاء الاشتراك</label><input class="form-input" id="euEnd" type="date" value="${endDateVal}"></div>
        <div class="form-field"><label class="form-label">مصدر الاشتراك</label>
            <select class="form-select" id="euSource">
                <option value="" ${!subSource?'selected':''}>—</option>
                <option value="myfatoorah" ${subSource==='myfatoorah'?'selected':''}>MyFatoorah (دفع ويب)</option>
                <option value="apple_iap" ${subSource==='apple_iap'?'selected':''}>Apple IAP (iOS)</option>
                <option value="google_play" ${subSource==='google_play'?'selected':''}>Google Play (Android)</option>
                <option value="admin" ${subSource==='admin'?'selected':''}>منحة إدارية</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">التجديد التلقائي</label>
            <label style="display:flex;align-items:center;gap:8px;padding:11px 14px;background:var(--s2);border-radius:11px;cursor:pointer">
                <input type="checkbox" id="euAutoRenew" ${autoRenew?'checked':''}>
                <span style="font-size:13px">مفعّل (يحاول التجديد قبل الانتهاء)</span>
            </label>
        </div>
        <div class="form-field full"><label class="form-label">الكوبون المستخدم</label><input class="form-input" id="euCoupon" value="${esc(u.used_coupon||'')}" placeholder="—"></div>

        ${sectionHead('— التقدّم (Gamification) —')}
        <div class="form-field"><label class="form-label">XP</label><input class="form-input" type="number" id="euXp" value="${u.xp||0}" min="0"></div>
        <div class="form-field"><label class="form-label">المستوى</label><input class="form-input" type="number" id="euLevel" value="${u.level||1}" min="1"></div>
        <div class="form-field"><label class="form-label">السلسلة (أيام متتالية)</label><input class="form-input" type="number" id="euStreak" value="${u.streak_days||0}" min="0"></div>
        <div class="form-field"><label class="form-label">&nbsp;</label>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('euXp').value=0;document.getElementById('euLevel').value=1;document.getElementById('euStreak').value=0;showToast('سيتم التصفير عند الحفظ','info')" style="width:100%">تصفير الكل (XP/Level/Streak)</button>
        </div>

        <div class="form-field full" style="margin-top:6px">
            <div style="background:var(--s2);padding:12px 14px;border-radius:10px;font-size:12px;color:var(--i3);line-height:2">
                <div><b>سُجّل:</b> ${fmtDate(u.created_at)} &nbsp;·&nbsp; <b>آخر دخول:</b> ${fmtDate(u.last_seen_at)}</div>
                <div><b>المعرّف:</b> <code style="font-size:10px">${esc(u.id)}</code></div>
            </div>
        </div>

        ${sectionHead('— تغيير كلمة السر (تعيين مباشر) —')}
        <div class="form-field"><label class="form-label">كلمة سر جديدة</label><input class="form-input" type="text" id="euNewPwd" placeholder="6 أحرف على الأقل (اتركه فارغاً لعدم التغيير)" style="direction:ltr;text-align:left" autocomplete="off"></div>
        <div class="form-field"><label class="form-label">&nbsp;</label>
            <button type="button" class="btn btn-pri" onclick="adminChangeUserPassword('${u.id}')" style="width:100%">تعيين كلمة السر الآن</button>
        </div>

        ${sectionHead('— إجراءات أخرى —')}
        <div class="form-field full">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-ghost" onclick="adminSendPasswordReset('${esc(u.email||'')}')" style="font-size:12px"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>إرسال رابط إعادة كلمة السر للعضو</button>
            </div>
            <div style="font-size:11px;color:var(--i4);margin-top:8px;line-height:1.7">
                • <b>تغيير البريد:</b> عدّله أعلى الصفحة + اضغط "حفظ التغييرات" — يُحدَّث في auth.users و profiles.<br>
                • <b>كلمة السر (تعيين مباشر):</b> ادخل القيمة في الحقل أعلاه واضغط "تعيين الآن".<br>
                • <b>إعادة كلمة السر بريداً:</b> الزر السابق يرسل رابط للعضو ليعيدها بنفسه.<br>
                • <b>حذف الحساب:</b> يستخدمه العضو من تطبيقه (مطلوب Apple)؛ من هنا غير متاح للحماية.
            </div>
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveUser('${u.id}')">حفظ التغييرات</button>
    `;
    openModal('تعديل بيانات العضو', body, foot);
};

// ── إرسال رابط إعادة كلمة السر للعضو (يصل لإيميله) ──
window.adminSendPasswordReset = async function(email) {
    if (!email) return showToast('بريد العضو غير موجود','err');
    if (!confirm('سيرسل رابط إعادة كلمة السر إلى:\n' + email + '\n\nمتابعة؟')) return;
    const { sb } = window.A;
    try {
        const redirect = window.location.origin + '/login.html';
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        if (error) throw error;
        showToast('تم إرسال رابط إعادة كلمة السر', 'suc');
    } catch (e) {
        showToast('خطأ: ' + (e.message || 'فشل الإرسال'), 'err');
    }
};

// ── تعيين كلمة سر جديدة للعضو مباشرة (admin only — Edge Function) ──
window.adminChangeUserPassword = async function(userId) {
    const pwdInput = document.getElementById('euNewPwd');
    const pwd = pwdInput?.value || '';
    if (!pwd) return showToast('ادخل كلمة السر الجديدة','err');
    if (pwd.length < 6) return showToast('كلمة السر يجب أن تكون 6 أحرف على الأقل','err');
    if (!confirm('سيتم تعيين كلمة السر الجديدة للعضو فوراً.\n\nالعضو سيستخدمها للدخول. متابعة؟')) return;
    const { sb } = window.A;
    try {
        const { data, error } = await sb.functions.invoke('admin-update-user', {
            body: { user_id: userId, new_password: pwd }
        });
        if (error) {
            let msg = error.message || 'فشل التحديث';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const b = await error.context.json();
                    msg = b?.error || msg;
                }
            } catch(_) {}
            throw new Error(msg);
        }
        if (!data || data.error) throw new Error((data && data.error) || 'فشل التحديث');
        if (pwdInput) pwdInput.value = '';
        showToast('تم تعيين كلمة السر بنجاح', 'suc');
    } catch (e) {
        showToast('خطأ: ' + (e.message || 'فشل التحديث'), 'err');
    }
};

// ── تعبئة تاريخ نهاية الاشتراك تلقائياً عند تغيير النوع ──
window.autoFillSubEnd = function(subType) {
    const endEl = document.getElementById('euEnd');
    if (!endEl) return;
    if (subType === 'free') { endEl.value = ''; return; }
    const months = subType === 'yearly' ? 12 : subType === 'quarterly' ? 3 : 1;
    const d = new Date(); d.setMonth(d.getMonth() + months);
    endEl.value = d.toISOString().split('T')[0];
};

// ── حفظ تعديلات العضو ──
window.saveUser = async function(id) {
    const { sb } = window.A;
    const getVal = (key) => {
        const el = document.getElementById(key);
        return el ? el.value : null;
    };
    const xpVal = parseInt(getVal('euXp'),10);
    const lvlVal = parseInt(getVal('euLevel'),10);
    const streakVal = parseInt(getVal('euStreak'),10);
    const newEmail = (getVal('euEmail')||'').trim().toLowerCase();
    const patch = {
        full_name: (getVal('euName')||'').trim() || null,
        phone: (getVal('euPhone')||'').trim() || null,
        referral_code: (getVal('euRef')||'').trim() || null,
        avatar_emoji: (getVal('euAvatar')||'').trim() || null,
        role: getVal('euRole') || 'user',
        subscription_type: getVal('euSub'),
        subscription_source: getVal('euSource') || null,
        auto_renew_enabled: !!document.getElementById('euAutoRenew')?.checked,
        used_coupon: (getVal('euCoupon')||'').trim() || null,
        xp: Number.isFinite(xpVal) ? Math.max(0, xpVal) : 0,
        level: Number.isFinite(lvlVal) ? Math.max(1, lvlVal) : 1,
        streak_days: Number.isFinite(streakVal) ? Math.max(0, streakVal) : 0
    };
    const endVal = getVal('euEnd');
    patch.subscription_end = endVal ? new Date(endVal + 'T23:59:59').toISOString() : null;
    if (patch.subscription_type === 'free') {
        patch.subscription_end = null;
    } else if (!patch.subscription_end) {
        const months = patch.subscription_type === 'yearly' ? 12 : patch.subscription_type === 'quarterly' ? 3 : 1;
        const d = new Date(); d.setMonth(d.getMonth() + months); d.setHours(23,59,59,0);
        patch.subscription_end = d.toISOString();
    }
    if (patch.subscription_type !== 'free' && !patch.subscription_source) {
        patch.subscription_source = 'admin';
    }

    try {
        // 1) تحقّق إذا الإيميل تغيّر — حدّثه عبر Edge Function (auth.users + profiles)
        const { data: cur } = await sb.from('profiles').select('email').eq('id', id).single();
        const oldEmail = (cur?.email || '').toLowerCase();
        if (newEmail && newEmail !== oldEmail) {
            const { data: r, error: emErr } = await sb.functions.invoke('admin-update-user', {
                body: { user_id: id, new_email: newEmail }
            });
            if (emErr) {
                let msg = emErr.message || 'فشل تحديث البريد';
                try {
                    if (emErr.context && typeof emErr.context.json === 'function') {
                        const b = await emErr.context.json();
                        msg = b?.error || msg;
                    }
                } catch(_) {}
                throw new Error('البريد: ' + msg);
            }
            if (r?.error) throw new Error('البريد: ' + r.error);
        }
        // 2) باقي الحقول مباشرة على profiles
        const { error } = await sb.from('profiles').update(patch).eq('id', id);
        if (error) throw error;
        showToast('حُفظت التغييرات','suc');
        closeModal();
        loadUsers();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'err');
    }
};

window.exportUsers = async function() {
    const { sb } = window.A;
    showToast('جاري التصدير...','');
    const f = window._uaFilters || {};
    const NOW = Date.now();
    const DAY = 86400000;
    try {
        let q = sb.from('profiles').select('full_name,email,phone,subscription_type,subscription_end,subscription_source,used_coupon,xp,created_at,last_seen_at');
        const nowIso = new Date().toISOString();
        if (f.sub === 'active') q = q.in('subscription_type', ['monthly','quarterly','yearly']).gt('subscription_end', nowIso);
        else if (f.sub === 'free') q = q.or('subscription_type.eq.free,subscription_type.is.null');
        else if (['monthly','quarterly','yearly'].includes(f.sub)) q = q.eq('subscription_type', f.sub).gt('subscription_end', nowIso);
        else if (f.sub === 'expired') q = q.in('subscription_type', ['monthly','quarterly','yearly']).lt('subscription_end', nowIso);
        if (['myfatoorah','apple_iap','google_play','admin'].includes(f.source)) q = q.eq('subscription_source', f.source);
        if (f.activity === 'online') q = q.gt('last_seen_at', new Date(NOW - 5*60000).toISOString());
        else if (f.activity === 'week') q = q.gt('last_seen_at', new Date(NOW - 7*DAY).toISOString());
        else if (f.activity === 'month') q = q.gt('last_seen_at', new Date(NOW - 30*DAY).toISOString());
        else if (f.activity === 'dormant') q = q.or('last_seen_at.is.null,last_seen_at.lt.'+new Date(NOW - 30*DAY).toISOString());
        if (f.registered === 'today') q = q.gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
        else if (f.registered === 'week') q = q.gte('created_at', new Date(NOW - 7*DAY).toISOString());
        else if (f.registered === 'month') q = q.gte('created_at', new Date(NOW - 30*DAY).toISOString());
        if (f.search) {
            const term = f.search.replace(/'/g, "''");
            q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        }
        const { data } = await q.order('created_at',{ascending:false}).limit(10000);
        if (!data) return;
        const rows = [['الاسم','الإيميل','الجوال','الاشتراك','ينتهي','المصدر','الكوبون','تاريخ التسجيل','آخر دخول','XP']];
        data.forEach(u => rows.push([u.full_name||'', u.email||'', u.phone||'', u.subscription_type||'free', u.subscription_end||'', u.subscription_source||'', u.used_coupon||'', u.created_at||'', u.last_seen_at||'', u.xp||0]));
        const csv = rows.map(r => r.map(c => '"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
        const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const filterLabel = (window._uaFilters && (window._uaFilters.sub||window._uaFilters.source||window._uaFilters.activity||window._uaFilters.registered)) ? '-filtered' : '';
        a.download = 'users'+filterLabel+'-'+new Date().toISOString().split('T')[0]+'.csv';
        a.click();
        showToast('تم تصدير '+data.length+' عضو','suc');
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 5. PLANS
// ═══════════════════════════════════════════════════════
window.loadPlans = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">خطط الاشتراك</div>
        <button class="btn btn-pri" onclick="openPlanModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>إضافة خطة</button>
    </div>
    <div id="plansGrid" class="plan-grid"><div class="loader">جاري التحميل...</div></div>

    <div class="card" style="margin-top:24px"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="card-title">إعدادات الإحالة</div><div class="card-sub">أيام المكافأة للمُحيل والمُحال</div></div></div></div>
    <div class="card-body" id="refSettingsBox"><div class="loader">...</div></div></div>`;

    try {
        const { data: plans } = await sb.from('plans').select('*').order('sort_order');
        const grid = document.getElementById('plansGrid');
        if (!plans || plans.length === 0) {
            grid.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا خطط</div></div>';
        } else {
            grid.innerHTML = plans.map(p => {
                const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);
                const pct = hasDiscount ? Math.round((1 - Number(p.price)/Number(p.original_price)) * 100) : (p.discount_percentage || 0);
                return `
                <div class="plan-card${p.is_featured?' featured':''}">
                    <div class="plan-name">${esc(p.name)}</div>
                    ${hasDiscount ? '<div style="font-size:13px;color:var(--i4);text-decoration:line-through;margin-bottom:2px">'+p.original_price+' ريال</div>' : ''}
                    <div class="plan-price">${p.price} <small>ريال</small></div>
                    ${hasDiscount ? '<div style="display:inline-block;background:var(--dng);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;margin-top:4px">-'+pct+'%</div>' : ''}
                    <div class="plan-duration" style="margin-top:8px">${p.duration_days} يوم</div>
                    ${p.savings_text ? '<div style="font-size:10px;color:var(--suc);font-weight:600;margin-bottom:8px">'+esc(p.savings_text)+'</div>' : ''}
                    <div class="plan-subs">مشتركون حالياً: <span>${p.subscriber_count||0}</span></div>
                    <div style="margin-top:12px;display:flex;gap:6px">
                        <button class="btn btn-ghost" onclick='editPlan(${JSON.stringify(p.id)})'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>تعديل</button>
                    </div>
                </div>`;
            }).join('');
        }

        // Referral settings
        const { data: rs } = await sb.from('referral_settings').select('*').limit(1).single();
        document.getElementById('refSettingsBox').innerHTML = `
        <div class="form-grid">
            <div class="form-field">
                <label class="form-label">أيام المكافأة للمُحيل</label>
                <input class="form-input" type="number" id="refBonus1" value="${rs?.referrer_bonus_days||10}">
            </div>
            <div class="form-field">
                <label class="form-label">أيام المكافأة للمُحال</label>
                <input class="form-input" type="number" id="refBonus2" value="${rs?.referred_bonus_days||7}">
            </div>
        </div>
        <button class="btn btn-pri" style="margin-top:12px" onclick="saveRefSettings(${rs?.id?'"'+rs.id+'"':'null'})">حفظ</button>`;
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.openPlanModal = function(existing) {
    const d = existing || { name:'', slug:'', price:0, original_price:null, discount_percentage:0, duration_days:30, is_active:true, is_featured:false, savings_text:'' };
    // استنتج نوع الخصم الافتراضي
    const hasDiscount = d.original_price && Number(d.original_price) > Number(d.price);
    const defaultType = (d.discount_percentage && !hasDiscount) ? 'percent' : 'amount';
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">الاسم</label><input class="form-input" id="pnName" value="${esc(d.name)}" placeholder="شهري"></div>
        <div class="form-field"><label class="form-label">المعرف (slug)</label><input class="form-input" id="pnSlug" value="${esc(d.slug)}" ${existing?'readonly':''} placeholder="monthly"></div>

        <div class="form-field full" style="background:var(--s2);border-radius:var(--r);padding:12px;border:1px solid var(--ln)">
            <label class="form-label" style="margin-bottom:8px;display:block"><b>التسعير والخصم</b></label>

            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label">السعر الأصلي *</label>
                    <input class="form-input" type="number" step="0.01" id="pnOriginalPrice" value="${d.original_price||d.price||''}" placeholder="مثلاً 115" oninput="calcDiscountAuto()">
                    <div style="font-size:9px;color:var(--i4);margin-top:2px">السعر قبل الخصم</div>
                </div>
                <div class="form-field">
                    <label class="form-label">المدة (يوم) *</label>
                    <input class="form-input" type="number" id="pnDuration" value="${d.duration_days}">
                </div>
            </div>

            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--ln)">
                <label class="form-label" style="margin-bottom:6px;display:block">نوع الخصم</label>
                <div style="display:flex;gap:8px;margin-bottom:10px">
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='percent'?'var(--pri)':'var(--ln2)'};${defaultType==='percent'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="percent" ${defaultType==='percent'?'checked':''} onchange="setDiscountType('percent')" style="margin-left:6px">نسبة مئوية %
                    </label>
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='amount'?'var(--pri)':'var(--ln2)'};${defaultType==='amount'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="amount" ${defaultType==='amount'?'checked':''} onchange="setDiscountType('amount')" style="margin-left:6px">مبلغ ثابت (ريال)
                    </label>
                    <label style="flex:1;padding:9px;border-radius:8px;border:1.5px solid ${defaultType==='none'?'var(--pri)':'var(--ln2)'};${defaultType==='none'?'background:var(--pri-s);color:var(--pri);':''}font-size:12px;font-weight:600;text-align:center;cursor:pointer">
                        <input type="radio" name="pnDiscType" value="none" onchange="setDiscountType('none')" style="margin-left:6px">بدون خصم
                    </label>
                </div>

                <div class="form-grid" id="pnDiscountInputs">
                    <div class="form-field" id="pnPctField">
                        <label class="form-label">نسبة الخصم %</label>
                        <input class="form-input" type="number" min="0" max="100" id="pnDiscountPct" value="${d.discount_percentage||0}" placeholder="مثلاً 20" oninput="recalcFromPct()">
                    </div>
                    <div class="form-field" id="pnAmountField">
                        <label class="form-label">مبلغ الخصم (ريال)</label>
                        <input class="form-input" type="number" step="0.01" id="pnDiscountAmount" value="${hasDiscount ? (Number(d.original_price)-Number(d.price)).toFixed(2) : 0}" placeholder="مثلاً 26" oninput="recalcFromAmount()">
                    </div>
                    <div class="form-field full">
                        <label class="form-label">السعر النهائي بعد الخصم</label>
                        <input class="form-input" type="number" step="0.01" id="pnPrice" value="${d.price}" readonly style="background:var(--suc-s);color:var(--suc);font-weight:700;font-size:16px">
                    </div>
                </div>
            </div>

            <div id="pnPricePreview" style="margin-top:10px;padding:10px;background:var(--sf);border-radius:8px;border:1px solid var(--ln);font-size:12px;text-align:center">
                <div style="color:var(--i3);margin-bottom:4px">معاينة السعر في التطبيق:</div>
                <div id="pnPreviewContent"></div>
            </div>
        </div>

        <div class="form-field full"><label class="form-label">نص التوفير (اختياري)</label><input class="form-input" id="pnSavings" value="${esc(d.savings_text||'')}" placeholder="مثلاً: وفّر 26 ريال"></div>
        <div class="form-field"><label><input type="checkbox" id="pnFeatured" ${d.is_featured?'checked':''}> خطة مميزة</label></div>
        <div class="form-field"><label><input type="checkbox" id="pnActive" ${d.is_active!==false?'checked':''}> فعّالة</label></div>
    </div>`;
    openModal(existing?'تعديل خطة':'إضافة خطة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="savePlan('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
    setTimeout(() => { setDiscountType(defaultType); }, 50);
};

let _discountType = 'amount';

window.setDiscountType = function(type) {
    _discountType = type;
    // Update label styles
    document.querySelectorAll('input[name="pnDiscType"]').forEach(r => {
        const lbl = r.closest('label');
        if (r.value === type) {
            r.checked = true;
            lbl.style.borderColor = 'var(--pri)';
            lbl.style.background = 'var(--pri-s)';
            lbl.style.color = 'var(--pri)';
        } else {
            lbl.style.borderColor = 'var(--ln2)';
            lbl.style.background = '';
            lbl.style.color = '';
        }
    });
    const pctField = document.getElementById('pnPctField');
    const amtField = document.getElementById('pnAmountField');
    if (type === 'percent') {
        pctField.style.display = ''; amtField.style.display = 'none';
        recalcFromPct();
    } else if (type === 'amount') {
        pctField.style.display = 'none'; amtField.style.display = '';
        recalcFromAmount();
    } else {
        pctField.style.display = 'none'; amtField.style.display = 'none';
        // لا خصم
        const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
        document.getElementById('pnPrice').value = orig;
        document.getElementById('pnDiscountPct').value = 0;
        document.getElementById('pnDiscountAmount').value = 0;
        updatePricePreview();
    }
};

window.recalcFromPct = function() {
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    const pct = Math.max(0, Math.min(100, parseFloat(document.getElementById('pnDiscountPct').value) || 0));
    const discountAmt = orig * pct / 100;
    const finalPrice = Math.max(0, orig - discountAmt);
    document.getElementById('pnDiscountAmount').value = discountAmt.toFixed(2);
    document.getElementById('pnPrice').value = finalPrice.toFixed(2);
    updatePricePreview();
};

window.recalcFromAmount = function() {
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    let amt = parseFloat(document.getElementById('pnDiscountAmount').value) || 0;
    if (amt > orig) amt = orig;
    const finalPrice = Math.max(0, orig - amt);
    const pct = orig > 0 ? Math.round(amt / orig * 100) : 0;
    document.getElementById('pnDiscountPct').value = pct;
    document.getElementById('pnPrice').value = finalPrice.toFixed(2);
    updatePricePreview();
};

window.calcDiscountAuto = function() {
    // عند تغيير السعر الأصلي، إعادة الحساب حسب النوع الحالي
    if (_discountType === 'percent') recalcFromPct();
    else if (_discountType === 'amount') recalcFromAmount();
    else {
        const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
        document.getElementById('pnPrice').value = orig;
        updatePricePreview();
    }
};

function updatePricePreview() {
    const prev = document.getElementById('pnPreviewContent');
    if (!prev) return;
    const orig = parseFloat(document.getElementById('pnOriginalPrice').value) || 0;
    const price = parseFloat(document.getElementById('pnPrice').value) || 0;
    const pct = parseFloat(document.getElementById('pnDiscountPct').value) || 0;
    if (orig > price && pct > 0) {
        prev.innerHTML = '<span style="color:var(--i4);text-decoration:line-through;font-size:14px">'+orig+' ريال</span> <span style="margin-right:8px;color:var(--pri);font-size:20px;font-weight:700">'+price.toFixed(2)+' ريال</span> <span style="background:var(--dng);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;margin-right:6px">-'+pct+'%</span>';
    } else {
        prev.innerHTML = '<span style="color:var(--pri);font-size:20px;font-weight:700">'+(price||0).toFixed(2)+' ريال</span>';
    }
}

// legacy function name compatibility
window.calcDiscount = window.calcDiscountAuto;

window.savePlan = async function(id) {
    const { sb } = window.A;
    const origPrice = parseFloat(document.getElementById('pnOriginalPrice').value);
    const price = parseFloat(document.getElementById('pnPrice').value) || 0;
    const discountPct = parseInt(document.getElementById('pnDiscountPct').value) || 0;
    const data = {
        name: document.getElementById('pnName').value.trim(),
        slug: document.getElementById('pnSlug').value.trim(),
        price,
        original_price: (origPrice && origPrice > price) ? origPrice : null,
        discount_percentage: discountPct,
        duration_days: parseInt(document.getElementById('pnDuration').value) || 30,
        savings_text: document.getElementById('pnSavings').value.trim() || null,
        is_featured: document.getElementById('pnFeatured').checked,
        is_active: document.getElementById('pnActive').checked
    };
    if (!data.name || !data.slug) return showToast('الاسم والمعرف مطلوبان','err');
    try {
        if (id) await sb.from('plans').update(data).eq('id', id);
        else await sb.from('plans').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadPlans();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editPlan = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('plans').select('*').eq('id', id).single();
    if (data) openPlanModal(data);
};

window.saveRefSettings = async function(id) {
    const { sb } = window.A;
    const data = {
        referrer_bonus_days: parseInt(document.getElementById('refBonus1').value) || 10,
        referred_bonus_days: parseInt(document.getElementById('refBonus2').value) || 7
    };
    try {
        if (id) await sb.from('referral_settings').update(data).eq('id', id);
        else await sb.from('referral_settings').insert(data);
        showToast('تم الحفظ','suc');
    } catch(e) { showToast('خطأ','err'); }
};

// ═══════════════════════════════════════════════════════
// 6. COUPONS
// ═══════════════════════════════════════════════════════
window.loadCoupons = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">الكوبونات</div>
        <button class="btn btn-pri" onclick="openCouponModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>كوبون جديد</button>
    </div>
    <div id="couponsList"><div class="loader">جاري التحميل...</div></div>`;

    try {
        const { data, error } = await sb.from('coupons').select('*').order('created_at',{ascending:false});
        const list = document.getElementById('couponsList');
        if (error) {
            list.innerHTML = '<div class="empty"><div class="empty-ic">⚠️</div><div class="empty-t">خطأ في التحميل</div><div class="empty-d">'+esc(error.message||'')+'</div></div>';
            return;
        }
        if (!data || data.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-ic">🎟️</div><div class="empty-t">لا كوبونات</div></div>';
            return;
        }
        list.innerHTML = data.map(c => {
            // كوبون "مجاني" يُخزَّن كـpercentage=100 (CHECK constraint يمنع 'free')
            const isFree = c.discount_type === 'free' || (c.discount_type === 'percentage' && Number(c.discount_value) >= 100);
            const badge = isFree ? '<span class="coupon-badge free">مجاني</span>'
                        : c.discount_type === 'percentage' ? '<span class="coupon-badge discount">-'+c.discount_value+'%</span>'
                        : '<span class="coupon-badge discount">-'+c.discount_value+' ريال</span>';
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            return `<div class="coupon-item">
                <div class="coupon-code">${esc(c.code)}</div>
                <div class="coupon-info">
                    <div class="coupon-n">${isFree?'اشتراك مجاني':'خصم على الاشتراك'}</div>
                    <div class="coupon-d">${c.expires_at?'ينتهي '+fmtDate(c.expires_at):'لا ينتهي'}${expired?' (منتهي)':''} · ${c.plan_type==='all'?'كل الخطط':esc(c.plan_type||'—')}</div>
                </div>
                ${badge}
                <div class="coupon-uses"><div class="v">${c.used_count||0}</div><div>${c.max_uses?'من '+c.max_uses:'استخدام'}</div></div>
                <div style="display:flex;gap:4px">
                    <button class="q-act-btn" onclick='editCoupon("${c.id}")' title="تعديل"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="q-act-btn" onclick='deleteCoupon("${c.id}")' title="حذف"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                </div>
            </div>`;
        }).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openCouponModal = function(existing) {
    // عند التعديل: لو كوبون مخزّن كـpercentage=100 → اعرضه كـ"مجاني" في الـUI
    let displayed = existing ? { ...existing } : null;
    if (displayed && displayed.discount_type === 'percentage' && Number(displayed.discount_value) >= 100) {
        displayed.discount_type = 'free';
        displayed.discount_value = 0;
    }
    const d = displayed || { code:'', discount_type:'free', discount_value:0, plan_type:'all', duration_months:1, max_uses:null, expires_at:null, is_active:true };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">كود الكوبون</label><input class="form-input" id="cpCode" value="${esc(d.code)}" style="text-transform:uppercase"></div>
        <div class="form-field"><label class="form-label">النوع</label>
            <select class="form-select" id="cpType">
                <option value="free" ${d.discount_type==='free'?'selected':''}>مجاني</option>
                <option value="percentage" ${d.discount_type==='percentage'?'selected':''}>نسبة %</option>
                <option value="fixed" ${d.discount_type==='fixed'?'selected':''}>ثابت (ريال)</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">القيمة</label><input class="form-input" type="number" id="cpValue" value="${d.discount_value||0}"></div>
        <div class="form-field"><label class="form-label">الخطة</label>
            <select class="form-select" id="cpPlan">
                <option value="all" ${d.plan_type==='all'?'selected':''}>الكل</option>
                <option value="monthly" ${d.plan_type==='monthly'?'selected':''}>شهري</option>
                <option value="yearly" ${d.plan_type==='yearly'?'selected':''}>سنوي</option>
            </select>
        </div>
        <div class="form-field"><label class="form-label">المدة (شهور)</label><input class="form-input" type="number" id="cpMonths" value="${d.duration_months||1}"></div>
        <div class="form-field"><label class="form-label">الحد الأقصى للاستخدام</label><input class="form-input" type="number" id="cpMax" value="${d.max_uses||''}" placeholder="غير محدود"></div>
        <div class="form-field full"><label class="form-label">تاريخ الانتهاء</label><input class="form-input" type="date" id="cpExpires" value="${d.expires_at?d.expires_at.split('T')[0]:''}"></div>
        <div class="form-field"><label><input type="checkbox" id="cpActive" ${d.is_active!==false?'checked':''}> فعّال</label></div>
    </div>`;
    openModal(existing?'تعديل كوبون':'كوبون جديد', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveCoupon('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveCoupon = async function(id) {
    const { sb } = window.A;
    // ملاحظة: عمود is_active غير موجود في DB لجدول coupons.
    // التعطيل يتم عبر expires_at في الماضي (وحقل is_active في الـUI صار للعرض فقط).
    const isActive = document.getElementById('cpActive').checked;
    let expiresAt = document.getElementById('cpExpires').value || null;
    if (!isActive) {
        // غير فعّال → اضبط الانتهاء في الماضي
        expiresAt = '2000-01-01';
    }
    let uiType = document.getElementById('cpType').value;
    let uiValue = parseFloat(document.getElementById('cpValue').value) || 0;
    // DB لا يدعم discount_type='free' (CHECK constraint يقبل فقط 'percentage' و 'fixed').
    // النظام يخزّن "مجاني" كـpercentage=100 (نفس نمط FREE01 / IZ73 / RENAD).
    if (uiType === 'free') { uiType = 'percentage'; uiValue = 100; }
    const data = {
        code: document.getElementById('cpCode').value.trim().toUpperCase(),
        discount_type: uiType,
        discount_value: uiValue,
        plan_type: document.getElementById('cpPlan').value,
        duration_months: parseInt(document.getElementById('cpMonths').value) || 1,
        max_uses: parseInt(document.getElementById('cpMax').value) || null,
        expires_at: expiresAt
    };
    if (!data.code) return showToast('الكود مطلوب','err');
    if (!data.discount_value || data.discount_value <= 0) {
        return showToast('قيمة الخصم يجب أن تكون أكبر من صفر','err');
    }
    try {
        const res = id
            ? await sb.from('coupons').update(data).eq('id', id)
            : await sb.from('coupons').insert(data);
        if (res.error) {
            const msg = (res.error.code === '23505') ? 'الكود مستخدم بالفعل' : (res.error.message || 'فشل الحفظ');
            return showToast('خطأ: ' + msg, 'err');
        }
        showToast('تم الحفظ','suc');
        closeModal();
        loadCoupons();
    } catch(e) { showToast('خطأ: '+(e.message||'فشل الاتصال'),'err'); }
};

window.editCoupon = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('coupons').select('*').eq('id', id).single();
    if (data) openCouponModal(data);
};

window.deleteCoupon = async function(id) {
    if (!confirm('هل تريد حذف الكوبون؟')) return;
    const { sb } = window.A;
    const { error } = await sb.from('coupons').delete().eq('id', id);
    if (error) return showToast('خطأ: '+(error.message||'فشل الحذف'),'err');
    showToast('تم الحذف','suc');
    loadCoupons();
};

// ═══════════════════════════════════════════════════════
// 7. FINANCE (دفعات فعلية + مصروفات + صافي)
// ═══════════════════════════════════════════════════════
window.loadFinance = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <style>
    .acc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
    .acc-box{padding:18px 20px;border-radius:16px;color:#fff;position:relative;overflow:hidden;cursor:default}
    .acc-box .ah{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
    .acc-box .an{font-size:12px;font-weight:700;letter-spacing:.3px;opacity:.95;display:flex;align-items:center;gap:8px}
    .acc-box .an svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2}
    .acc-box .av{font-size:28px;font-weight:800;margin-bottom:2px;font-variant-numeric:tabular-nums}
    .acc-box .av small{font-size:14px;font-weight:600;opacity:.85;margin-right:4px}
    .acc-box .as{font-size:11px;opacity:.85;line-height:1.7}
    .acc-box.bank{background:linear-gradient(135deg,#1E3A8A,#3B5BDB)}
    .acc-box.treasury{background:linear-gradient(135deg,#0F766E,#14B8A6)}
    .acc-box::after{content:"";position:absolute;top:-30px;left:-30px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.05)}
    .acc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
    .acc-actions .btn svg{width:13px;height:13px}
    @media (max-width:640px){ .acc-grid{grid-template-columns:1fr} }
    </style>

    <div class="acc-actions">
        <button class="btn btn-ghost" onclick="openInitialBalanceModal()">
            <svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            ضبط الرصيد الأولي
        </button>
        <button class="btn btn-pri" onclick="openTransferModal()">
            <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            تحويل بين الصناديق
        </button>
        <button class="btn btn-ghost" onclick="openFeesModal()">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            رسوم وسائل الدفع
        </button>
        <select class="form-select" id="finPeriod" style="width:auto;margin-right:auto" onchange="loadFinance()">
            <option value="30">آخر 30 يوم</option>
            <option value="7">آخر 7 أيام</option>
            <option value="90">آخر 90 يوم</option>
            <option value="365">آخر سنة</option>
            <option value="0">الكل</option>
        </select>
    </div>

    <!-- صندوقا البنك والخزينة -->
    <div class="acc-grid">
        <div class="acc-box bank">
            <div class="ah">
                <div class="an"><svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M2 11h20"/><path d="M12 3l10 4H2z"/></svg>البنك (الحساب الجاري)</div>
            </div>
            <div class="av"><span id="bankBal">—</span> <small>ر.س</small></div>
            <div class="as" id="bankSub">الرصيد الأولي + الإيرادات الصافية − المصروفات − التحويلات الصادرة</div>
        </div>
        <div class="acc-box treasury">
            <div class="ah">
                <div class="an"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>الخزينة (الادخار)</div>
            </div>
            <div class="av"><span id="trsBal">—</span> <small>ر.س</small></div>
            <div class="as" id="trsSub">الرصيد الأولي + التحويلات الواردة − التحويلات الصادرة</div>
        </div>
    </div>

    <div style="font-size:11px;color:var(--i3);margin-bottom:12px">💡 الأرقام تعكس الدفعات الفعلية بعد خصم رسوم وسائل الدفع. الاشتراكات المجانية/الكوبونات مستبعدة.</div>

    <div class="finance-summary">
        <div class="fs-card inc"><div class="fs-label"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>الإيرادات الصافية</div><div class="fs-val" id="finInc">—</div><div class="fs-sub">ريال — <span id="finIncCount">0</span> معاملة مدفوعة · صافي بعد الرسوم</div></div>
        <div class="fs-card exp"><div class="fs-label"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>المصروفات</div><div class="fs-val" id="finExp">0</div><div class="fs-sub">ريال — <span id="finExpCount">0</span> مصروف</div></div>
        <div class="fs-card net"><div class="fs-label"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>الصافي</div><div class="fs-val" id="finNet">—</div><div class="fs-sub">الربح الصافي في الفترة</div></div>
    </div>

    <div class="card"><div class="card-hdr">
        <div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/></svg></div><div><div class="card-title">آخر الدفعات الفعلية</div><div class="card-sub">MyFatoorah فقط — بدون الاشتراكات المجانية</div></div></div>
        <button class="btn btn-ghost" onclick='switchAdminPage("invoices")'>عرض كل الفواتير</button>
    </div>
    <div class="tbl-wrap" id="txList"><div class="loader">...</div></div></div>`;

    try {
        const period = parseInt(document.getElementById('finPeriod').value) || 30;

        // RPC SECURITY DEFINER: كل الأرقام + آخر 50 دفعة في استدعاء واحد
        const { data, error } = await sb.rpc('admin_get_finance', { p_period_days: period });
        if (error) throw error;
        const f = data || {};

        const totalIncNet = Number(f.total_inc_net || 0);
        const totalExp    = Number(f.total_exp || 0);
        const realPayments = f.payments || [];

        document.getElementById('finInc').textContent = fmt(Math.round(totalIncNet));
        document.getElementById('finIncCount').textContent = f.inc_count || 0;
        document.getElementById('finExp').textContent = fmt(Math.round(totalExp));
        document.getElementById('finExpCount').textContent = f.exp_count || 0;
        document.getElementById('finNet').textContent = fmt(Math.round(f.net_profit || 0));

        // أرصدة البنك والخزينة (محسوبة في الـ RPC على كل الوقت)
        document.getElementById('bankBal').textContent = fmt(Math.round(f.bank_balance || 0));
        document.getElementById('trsBal').textContent  = fmt(Math.round(f.treasury_balance || 0));
        document.getElementById('bankSub').textContent =
            `رصيد أولي ${fmt(Math.round(f.init_bank||0))} + صافي ${fmt(Math.round(f.total_inc_net_all||0))} − مصروفات ${fmt(Math.round(f.total_exp_all||0))} − تحويلات صادرة ${fmt(Math.round(f.xfers_from_bank||0))}`;
        document.getElementById('trsSub').textContent =
            `رصيد أولي ${fmt(Math.round(f.init_treasury||0))} + تحويلات واردة ${fmt(Math.round(f.xfers_to_treasury||0))} − صادرة ${fmt(Math.round(f.xfers_from_treasury||0))}`;

        const list = document.getElementById('txList');
        if (realPayments.length === 0) {
            list.innerHTML = '<div class="empty"><div class="empty-d">لا دفعات فعلية في الفترة المحددة</div></div>';
            return;
        }
        list.innerHTML = '<table><thead><tr><th>العميل</th><th>الخطة</th><th>الكوبون</th><th>المبلغ</th><th>رقم الدفع</th><th>التاريخ</th></tr></thead><tbody>' +
            realPayments.map(p => `<tr>
                <td class="td-name">${esc(p.full_name||'—')}</td>
                <td>${esc(p.plan_type==='yearly'?'سنوي':p.plan_type==='monthly'?'شهري':p.plan_type||'—')}</td>
                <td class="td-muted">${p.coupon_code ? '<span class="status-pill" style="background:var(--acc-s);color:var(--acc)">'+esc(p.coupon_code)+'</span>' : '—'}</td>
                <td><b style="color:var(--suc)">+${fmt(Math.round(p.amount))} ر.س</b></td>
                <td class="td-muted" style="font-family:monospace;font-size:10px">${esc((p.payment_id||'').substring(0,14))}</td>
                <td class="td-muted">${fmtDate(p.paid_at||p.created_at)}</td>
            </tr>`).join('') + '</tbody></table>';
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.switchAdminPage = function(page) {
    document.querySelector('[data-page="'+page+'"]')?.click();
};

// ═══════════════════════════════════════════════════════
// 7A-extra. FINANCE ACCOUNTS (bank + treasury)
// ═══════════════════════════════════════════════════════

// ── ضبط الرصيد الأولي ──
window.openInitialBalanceModal = async function() {
    const { sb } = window.A;
    let bank = 0, treasury = 0;
    try {
        const { data } = await sb.from('finance_accounts').select('*');
        (data || []).forEach(a => {
            if (a.account_type === 'bank') bank = Number(a.initial_balance || 0);
            else if (a.account_type === 'treasury') treasury = Number(a.initial_balance || 0);
        });
    } catch(e){}

    const body = `
    <div class="form-grid">
        <div class="form-field full">
            <label class="form-label">رصيد البنك الأولي (ر.س)</label>
            <input class="form-input" id="ibBank" type="number" step="0.01" value="${bank}" placeholder="0">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">المبلغ الموجود في الحساب قبل بدء النظام</div>
        </div>
        <div class="form-field full">
            <label class="form-label">رصيد الخزينة الأولي (ر.س)</label>
            <input class="form-input" id="ibTrs" type="number" step="0.01" value="${treasury}" placeholder="0">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">المبلغ المدخّر أو المستقطع للأرباح قبل بدء النظام</div>
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveInitialBalance()">حفظ الأرصدة</button>
    `;
    openModal('ضبط الأرصدة الأولية', body, foot);
};

window.saveInitialBalance = async function() {
    const { sb } = window.A;
    const bank = parseFloat(document.getElementById('ibBank').value) || 0;
    const trs = parseFloat(document.getElementById('ibTrs').value) || 0;
    try {
        // upsert
        const { error: e1 } = await sb.from('finance_accounts')
            .upsert([
                { account_type: 'bank',     initial_balance: bank, updated_at: new Date().toISOString() },
                { account_type: 'treasury', initial_balance: trs,  updated_at: new Date().toISOString() }
            ], { onConflict: 'account_type' });
        if (e1) throw e1;
        showToast('حُفظت الأرصدة','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'error');
    }
};

// ── تحويل بين الصندوقين ──
window.openTransferModal = function() {
    const body = `
    <div class="form-grid">
        <div class="form-field">
            <label class="form-label">من</label>
            <select class="form-select" id="xfFrom">
                <option value="bank">البنك</option>
                <option value="treasury">الخزينة</option>
            </select>
        </div>
        <div class="form-field">
            <label class="form-label">إلى</label>
            <select class="form-select" id="xfTo">
                <option value="treasury">الخزينة</option>
                <option value="bank">البنك</option>
            </select>
        </div>
        <div class="form-field full">
            <label class="form-label">المبلغ (ر.س) *</label>
            <input class="form-input" id="xfAmt" type="number" step="0.01" min="0.01" placeholder="0.00" autofocus>
        </div>
        <div class="form-field full">
            <label class="form-label">ملاحظات</label>
            <input class="form-input" id="xfNotes" placeholder="مثلاً: استقطاع أرباح الشهر">
        </div>
    </div>`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveTransfer()">تنفيذ التحويل</button>
    `;
    openModal('تحويل بين الصندوقين', body, foot);
};

window.saveTransfer = async function() {
    const { sb } = window.A;
    const from = document.getElementById('xfFrom').value;
    const to = document.getElementById('xfTo').value;
    const amt = parseFloat(document.getElementById('xfAmt').value) || 0;
    const notes = document.getElementById('xfNotes').value.trim() || null;

    if (from === to) { showToast('لا يمكن التحويل لنفس الحساب','error'); return; }
    if (!amt || amt <= 0) { showToast('أدخل مبلغاً صحيحاً','error'); return; }

    try {
        const { error } = await sb.from('finance_transfers').insert({
            from_account: from,
            to_account: to,
            amount: amt,
            notes
        });
        if (error) throw error;
        showToast('تم التحويل بنجاح','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل التحويل'),'error');
    }
};

// ── رسوم وسائل الدفع ──
window.openFeesModal = async function() {
    const { sb } = window.A;
    let fees = [];
    try {
        const { data } = await sb.from('payment_fees').select('*').order('payment_method');
        fees = data || [];
    } catch(e){}

    if (fees.length === 0) {
        // fallback: الافتراضيات
        fees = [
            { payment_method:'visa',      fee_percent:2.75, fee_fixed:1.00, label:'فيزا / ماستركارد' },
            { payment_method:'apple_pay', fee_percent:2.50, fee_fixed:0.00, label:'Apple Pay' },
            { payment_method:'mada',      fee_percent:1.00, fee_fixed:0.00, label:'مدى' },
            { payment_method:'stc_pay',   fee_percent:2.50, fee_fixed:0.00, label:'STC Pay' },
            { payment_method:'default',   fee_percent:2.75, fee_fixed:0.00, label:'افتراضي' }
        ];
    }

    const rows = fees.map(f => `
        <tr>
            <td style="padding:10px 6px">${esc(f.label || f.payment_method)}</td>
            <td style="padding:10px 6px"><input class="form-input" type="number" step="0.01" id="fee_${esc(f.payment_method)}_pct" value="${f.fee_percent}" style="width:90px;padding:6px 8px"> <small style="color:var(--i3)">%</small></td>
            <td style="padding:10px 6px"><input class="form-input" type="number" step="0.01" id="fee_${esc(f.payment_method)}_fx" value="${f.fee_fixed}" style="width:90px;padding:6px 8px"> <small style="color:var(--i3)">ر.س</small></td>
        </tr>
    `).join('');

    const body = `
    <div style="font-size:12px;color:var(--i3);margin-bottom:10px">الرسوم المخصومة من كل عملية دفع. تُستخدم لحساب الإيرادات الصافية ورصيد البنك.</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:2px solid var(--ln)">
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">وسيلة الدفع</th>
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">نسبة مئوية</th>
            <th style="text-align:right;padding:8px 6px;font-size:11px;color:var(--i3)">رسم ثابت</th>
        </tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <input type="hidden" id="feesMethodList" value="${fees.map(f => f.payment_method).join(',')}">`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="saveFees()">حفظ الرسوم</button>
    `;
    openModal('رسوم وسائل الدفع', body, foot);
};

window.saveFees = async function() {
    const { sb } = window.A;
    const methods = document.getElementById('feesMethodList').value.split(',').filter(Boolean);
    const labels = {
        visa:'فيزا / ماستركارد', apple_pay:'Apple Pay', mada:'مدى',
        stc_pay:'STC Pay', default:'افتراضي'
    };
    const rows = methods.map(m => ({
        payment_method: m,
        fee_percent: parseFloat(document.getElementById('fee_'+m+'_pct').value) || 0,
        fee_fixed: parseFloat(document.getElementById('fee_'+m+'_fx').value) || 0,
        label: labels[m] || m,
        updated_at: new Date().toISOString()
    }));
    try {
        const { error } = await sb.from('payment_fees').upsert(rows, { onConflict: 'payment_method' });
        if (error) throw error;
        showToast('حُفظت الرسوم','success');
        closeModal();
        loadFinance();
    } catch(e) {
        showToast('خطأ: '+(e.message||'فشل الحفظ'),'error');
    }
};

// ═══════════════════════════════════════════════════════
// 7B. INVOICES
// ═══════════════════════════════════════════════════════
window.loadInvoices = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 25;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
        <div style="font-size:14px;font-weight:700">الفواتير الضريبية</div>
        <div style="display:flex;gap:8px">
            <div class="search-box">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="search" id="invSearch" placeholder="بحث برقم الفاتورة/الاسم..." oninput="invSearchDebounce()">
            </div>
            <select class="form-select" id="invFilter" style="width:auto" onchange="loadInvoices(1)">
                <option value="paid">المدفوعة فقط</option>
                <option value="all">كل الفواتير</option>
                <option value="pending">معلقة</option>
            </select>
        </div>
    </div>
    <div class="card"><div class="tbl-wrap" id="invTable"><div class="loader">...</div></div></div>`;

    try {
        const search = (document.getElementById('invSearch')?.value||'').trim();
        const filter = document.getElementById('invFilter').value;

        let q = sb.from('invoices').select('*', {count:'exact'});
        if (filter === 'paid') q = q.eq('payment_status', 'paid');
        else if (filter === 'pending') q = q.eq('payment_status', 'pending');
        if (search) q = q.or('invoice_number.ilike.%'+search+'%,customer_name.ilike.%'+search+'%');

        const { data, count } = await q.order('created_at',{ascending:false}).range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);
        const tbl = document.getElementById('invTable');
        if (!data || data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">📄</div><div class="empty-t">لا فواتير</div></div>';
            return;
        }
        tbl.innerHTML = '<table><thead><tr><th>رقم الفاتورة</th><th>العميل</th><th>الخطة</th><th>المبلغ قبل الضريبة</th><th>الضريبة 15%</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead><tbody>' +
            data.map(inv => {
                const status = inv.payment_status === 'paid' ? '<span class="status-pill active">مدفوعة</span>' : inv.payment_status === 'pending' ? '<span class="status-pill pending">معلقة</span>' : '<span class="status-pill expired">ملغاة</span>';
                return `<tr>
                    <td><b style="font-family:monospace;color:var(--pri)">${esc(inv.invoice_number)}</b></td>
                    <td class="td-name">${esc(inv.customer_name||'—')}${inv.customer_phone?'<div style="font-size:9px;color:var(--i4)">'+esc(inv.customer_phone)+'</div>':''}</td>
                    <td>${esc(inv.plan_name||'—')}</td>
                    <td class="td-muted">${fmt(Number(inv.amount_before_tax).toFixed(2))} ر.س</td>
                    <td class="td-muted">${fmt(Number(inv.tax_amount).toFixed(2))} ر.س</td>
                    <td><b>${fmt(Number(inv.total_amount).toFixed(2))} ر.س</b></td>
                    <td>${status}</td>
                    <td class="td-muted">${fmtDate(inv.created_at)}</td>
                    <td><button class="q-act-btn" onclick='downloadInvoicePDF("${inv.id}")' title="تنزيل PDF"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button></td>
                </tr>`;
            }).join('') + '</tbody></table>';
        const totalPages = Math.ceil((count||0)/PAGE_SIZE);
        if (totalPages > 1) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(count)+' فاتورة · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadInvoices('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadInvoices('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};
let invSearchTimer;
window.invSearchDebounce = function() { clearTimeout(invSearchTimer); invSearchTimer = setTimeout(()=>loadInvoices(1), 400); };

window.downloadInvoicePDF = async function(id) {
    try {
        // فتح صفحة الفاتورة v2 القابلة للطباعة (PDF عبر المتصفح)
        const url = 'invoice-v2.html?id=' + encodeURIComponent(id);
        window.open(url, '_blank');
        showToast('تم فتح الفاتورة — استخدم طباعة/حفظ PDF','suc');
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// 7C. EXPENSES
// ═══════════════════════════════════════════════════════
window.loadExpenses = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">المصروفات</div>
        <button class="btn btn-pri" onclick="openExpenseModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>مصروف جديد</button>
    </div>
    <div id="expSummary" class="finance-summary"><div class="loader">...</div></div>
    <div class="card"><div class="tbl-wrap" id="expTable"><div class="loader">...</div></div></div>`;

    try {
        const { data } = await sb.from('expenses').select('*').order('expense_date',{ascending:false}).limit(200);
        const total = (data||[]).reduce((s,e)=>s+Number(e.amount||0),0);
        const thisMonth = (data||[]).filter(e => new Date(e.expense_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((s,e)=>s+Number(e.amount||0),0);
        const byCategory = {};
        (data||[]).forEach(e => byCategory[e.category] = (byCategory[e.category]||0) + Number(e.amount||0));
        const topCat = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];

        document.getElementById('expSummary').innerHTML = `
            <div class="fs-card exp"><div class="fs-label">إجمالي المصروفات</div><div class="fs-val">${fmt(Math.round(total))}</div><div class="fs-sub">${(data||[]).length} مصروف</div></div>
            <div class="fs-card exp"><div class="fs-label">هذا الشهر</div><div class="fs-val">${fmt(Math.round(thisMonth))}</div><div class="fs-sub">ريال سعودي</div></div>
            <div class="fs-card exp"><div class="fs-label">أعلى فئة</div><div class="fs-val" style="font-size:18px">${topCat?esc(categoryName(topCat[0])):'—'}</div><div class="fs-sub">${topCat?fmt(Math.round(topCat[1]))+' ريال':'—'}</div></div>`;

        const tbl = document.getElementById('expTable');
        if (!data || data.length === 0) {
            tbl.innerHTML = '<div class="empty"><div class="empty-ic">💸</div><div class="empty-t">لا مصروفات مسجلة</div><div class="empty-d">أضف أول مصروف لتتبع التكاليف</div></div>';
            return;
        }
        tbl.innerHTML = '<table><thead><tr><th>العنوان</th><th>الفئة</th><th>المبلغ</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
            data.map(e => `<tr>
                <td><div class="td-name">${esc(e.title)}</div>${e.description?'<div style="font-size:10px;color:var(--i4);margin-top:2px">'+esc(e.description)+'</div>':''}</td>
                <td><span class="status-pill" style="background:var(--s2);color:var(--i2)">${esc(categoryName(e.category))}</span></td>
                <td><b style="color:var(--dng)">-${fmt(Number(e.amount).toFixed(2))} ر.س</b></td>
                <td class="td-muted">${fmtDate(e.expense_date)}</td>
                <td><div style="display:flex;gap:4px"><button class="q-act-btn" onclick='editExpense("${e.id}")'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button><button class="q-act-btn" onclick='deleteExpense("${e.id}")'><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button></div></td>
            </tr>`).join('') + '</tbody></table>';
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

function categoryName(c) {
    return { general:'عام', marketing:'تسويق', tools:'أدوات', salaries:'رواتب', infrastructure:'بنية تحتية', other:'أخرى' }[c] || c || 'عام';
}

window.openExpenseModal = function(existing) {
    const d = existing || { title:'', description:'', amount:0, category:'general', expense_date:new Date().toISOString().split('T')[0] };
    const cats = ['general','marketing','tools','salaries','infrastructure','other'];
    const body = `
    <div class="form-grid">
        <div class="form-field full"><label class="form-label">العنوان *</label><input class="form-input" id="exTitle" value="${esc(d.title)}" placeholder="مثلاً: اشتراك Supabase Pro"></div>
        <div class="form-field"><label class="form-label">المبلغ (ريال) *</label><input class="form-input" type="number" step="0.01" id="exAmount" value="${d.amount||''}" placeholder="25.00"></div>
        <div class="form-field"><label class="form-label">الفئة</label><select class="form-select" id="exCategory">${cats.map(c=>'<option value="'+c+'" '+(d.category===c?'selected':'')+'>'+categoryName(c)+'</option>').join('')}</select></div>
        <div class="form-field full"><label class="form-label">التاريخ</label><input class="form-input" type="date" id="exDate" value="${d.expense_date?d.expense_date.split('T')[0]:''}"></div>
        <div class="form-field full"><label class="form-label">الوصف (اختياري)</label><textarea class="form-textarea" id="exDesc">${esc(d.description||'')}</textarea></div>
    </div>`;
    openModal(existing?'تعديل مصروف':'مصروف جديد', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveExpense('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveExpense = async function(id) {
    const { sb, profile } = window.A;
    const data = {
        title: document.getElementById('exTitle').value.trim(),
        description: document.getElementById('exDesc').value.trim() || null,
        amount: parseFloat(document.getElementById('exAmount').value) || 0,
        category: document.getElementById('exCategory').value,
        expense_date: document.getElementById('exDate').value || new Date().toISOString().split('T')[0]
    };
    if (!data.title) return showToast('العنوان مطلوب','err');
    if (data.amount <= 0) return showToast('المبلغ يجب أن يكون أكبر من صفر','err');

    if (!id && profile?.id) data.created_by = profile.id;

    try {
        let result;
        if (id) result = await sb.from('expenses').update(data).eq('id', id).select();
        else result = await sb.from('expenses').insert(data).select();

        if (result.error) {
            showToast('خطأ في الحفظ: ' + result.error.message, 'err');
            return;
        }
        showToast('تم الحفظ','suc');
        closeModal();
        loadExpenses();
    } catch(e) {
        showToast('خطأ: ' + (e.message || 'غير معروف'), 'err');
    }
};

window.editExpense = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('expenses').select('*').eq('id', id).single();
    if (data) openExpenseModal(data);
};

window.deleteExpense = async function(id) {
    if (!confirm('حذف المصروف؟')) return;
    const { sb } = window.A;
    await sb.from('expenses').delete().eq('id', id);
    showToast('تم الحذف','suc');
    loadExpenses();
};

// ═══════════════════════════════════════════════════════
// 8. BANNERS
// ═══════════════════════════════════════════════════════
window.loadBanners = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="bannersArea"><div class="loader">جاري التحميل...</div></div>';
    try {
        const { data } = await sb.from('banners').select('*').order('sort_order');
        const banners = data || [];
        const getB = type => banners.find(b => b.banner_type === type) || { banner_type:type, is_active:false, config:{}, target_pages:['dashboard'], schedule_start:null, schedule_end:null };
        const tk = getB('ticker'), img = getB('image'), mn = getB('main'), mx = getB('mock_exam');
        const trnSub = getB('training_subscribe'), lksSub = getB('leaks_subscribe');

        // target_pages helper → اختيار واحد من 4
        const tgtValue = b => {
            const t = Array.isArray(b.target_pages) ? b.target_pages : ['dashboard'];
            if (t.includes('all')) return 'all';
            if (t.includes('leaks') && t.includes('dashboard')) return 'dashboard+leaks';
            if (t.includes('leaks')) return 'leaks';
            return 'dashboard';
        };
        const tgtSelect = (id, cur) => `
            <div class="form-field full" style="margin-top:8px"><label class="form-label">يظهر في</label>
                <select class="form-select" id="${id}">
                    <option value="dashboard" ${cur==='dashboard'?'selected':''}>الرئيسية فقط</option>
                    <option value="leaks" ${cur==='leaks'?'selected':''}>التسريبات فقط</option>
                    <option value="dashboard+leaks" ${cur==='dashboard+leaks'?'selected':''}>الرئيسية + التسريبات</option>
                    <option value="all" ${cur==='all'?'selected':''}>كل صفحات التطبيق</option>
                </select>
            </div>`;

        document.getElementById('bannersArea').innerHTML = `
        <!-- ═══ بنرات اشتراك بسيطة (toggle on/off فقط) ═══ -->
        <div class="banner-form" style="margin-bottom:14px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:1px solid #FCD34D">
          <div class="banner-form-top">
            <div class="banner-form-title" style="color:#92400E">🔒 بنر "اشترك لتفتح التدريب الكامل" <span class="banner-status ${trnSub.is_active?'live':'off'}">${trnSub.is_active?'مفعّل':'مخفي'}</span></div>
            ${_bannerToggleHTML('training_subscribe', trnSub.is_active)}
          </div>
          <div style="font-size:12px;color:#92400E;padding:0 4px">يظهر في صفحة التدريب للمستخدمين غير المشتركين فقط. الإيقاف يخفيه نهائياً.</div>
        </div>

        <div class="banner-form" style="margin-bottom:18px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:1px solid #FCD34D">
          <div class="banner-form-top">
            <div class="banner-form-title" style="color:#92400E">🔐 بنر "التسريبات حصرية للمشتركين" <span class="banner-status ${lksSub.is_active?'live':'off'}">${lksSub.is_active?'مفعّل':'مخفي'}</span></div>
            ${_bannerToggleHTML('leaks_subscribe', lksSub.is_active)}
          </div>
          <div style="font-size:12px;color:#92400E;padding:0 4px">يظهر في صفحة التسريبات للزائر غير المشترك. الإيقاف يخلي الزائر يشوف القائمة بدون عرض اشتراك.</div>
        </div>

        <!-- TICKER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🎯 الشريط المتحرك <span class="banner-status ${tk.is_active?'live':'off'}">${tk.is_active?'مفعّل':'معطّل'}</span></div>
                ${_bannerToggleHTML('ticker', tk.is_active)}
            </div>
            <div class="banner-preview" style="padding:0">
                <div class="ticker-preview-wrap" style="background:${esc(tk.config.bg_color||'#6D5DF6')};color:${esc(tk.config.text_color||'#fff')};border-radius:8px;overflow:hidden;white-space:nowrap;padding:9px 0;font-size:12.5px;font-weight:600">
                    <div class="ticker-preview-in">
                        <span class="seg">${tk.config.keyword?'<span style="font-weight:800;margin-left:6px;color:'+esc(tk.config.keyword_color||'#FFD700')+'">'+esc(tk.config.keyword)+'</span>':''}${esc(tk.config.text||'نص الشريط')}</span>
                        <span class="seg">${tk.config.keyword?'<span style="font-weight:800;margin-left:6px;color:'+esc(tk.config.keyword_color||'#FFD700')+'">'+esc(tk.config.keyword)+'</span>':''}${esc(tk.config.text||'نص الشريط')}</span>
                        <span class="seg">${tk.config.keyword?'<span style="font-weight:800;margin-left:6px;color:'+esc(tk.config.keyword_color||'#FFD700')+'">'+esc(tk.config.keyword)+'</span>':''}${esc(tk.config.text||'نص الشريط')}</span>
                        <span class="seg">${tk.config.keyword?'<span style="font-weight:800;margin-left:6px;color:'+esc(tk.config.keyword_color||'#FFD700')+'">'+esc(tk.config.keyword)+'</span>':''}${esc(tk.config.text||'نص الشريط')}</span>
                    </div>
                </div>
            </div>
            <div class="form-grid">
                <div class="form-field full">
                    <label class="form-label">الكلمة المميزة ولونها</label>
                    <div class="field-inline">
                        <input class="form-input" id="tk_keyword" value="${esc(tk.config.keyword||'')}" placeholder="مثلاً: جديد">
                        ${_emojiBtnHTML('tk_keyword')}
                        <input class="form-input color-pick" type="color" id="tk_keyword_color" value="${esc(tk.config.keyword_color||'#FF6B35')}" title="لون الكلمة">
                    </div>
                </div>
                <div class="form-field full">
                    <label class="form-label">نص الشريط ولونه</label>
                    <div class="field-inline">
                        <input class="form-input" id="tk_text" value="${esc(tk.config.text||'')}" placeholder="نص الإعلان...">
                        ${_emojiBtnHTML('tk_text')}
                        <input class="form-input color-pick" type="color" id="tk_text_color" value="${esc(tk.config.text_color||'#ffffff')}" title="لون النص">
                    </div>
                </div>
                <div class="form-field full">
                    <label class="form-label">لون خلفية الشريط</label>
                    <div class="field-inline">
                        <input class="form-input color-pick" type="color" id="tk_bg_color" value="${esc(tk.config.bg_color||'#6D5DF6')}" style="width:60px">
                        <span style="flex:1;font-size:11px;color:var(--i3);align-self:center;padding-right:6px">اختر خلفية الشريط المتحرك</span>
                    </div>
                </div>
                <div class="form-field full">
                    <label class="form-label">سرعة الحركة: <span id="tk_speed_v">${tk.config.speed||50}</span></label>
                    <input type="range" id="tk_speed" min="10" max="100" value="${tk.config.speed||50}" oninput="applyTickerSpeedPreview(this.value)">
                </div>
                ${tgtSelect('tk_target', tgtValue(tk))}
                ${_scheduleHTML('tk', tk.schedule_start, tk.schedule_end)}
            </div>
            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("ticker")'>حفظ</button>
        </div>

        <!-- MAIN BANNER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🎪 البنر الرئيسي <span class="banner-status ${mn.is_active?'live':'off'}">${mn.is_active?'مفعّل':'معطّل'}</span> <span class="banner-pos">${(mn.sort_order||0) < (img.sort_order||0) ? '⬆ أعلى' : '⬇ أسفل'}</span></div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="swapBannerOrder()" title="تبديل الترتيب مع بنر الصورة">↕ تبديل الترتيب</button>
                    ${_bannerToggleHTML('main', mn.is_active)}
                </div>
            </div>
            <div class="banner-preview"><div class="banner-block" style="background:linear-gradient(135deg,${esc(mn.config.bg_left||'#1A1230')},${esc(mn.config.bg_right||'#2D1B69')})">
                <div class="banner-block-info">
                    <div class="tag">${esc(mn.config.tag||'')}</div>
                    <div class="title">${esc(mn.config.title||'عنوان')}</div>
                    <div class="sub">${esc(mn.config.subtitle||'')}</div>
                    <button class="banner-block-btn" style="background:${esc(mn.config.btn_color||'#FFD700')};color:${esc(mn.config.btn_text_color||'#1A1230')}">${esc(mn.config.cta_text||'انقر')}</button>
                </div>
            </div></div>
            <div class="form-grid">
                <div class="form-field full"><label class="form-label">التاغ (ملصق صغير فوق العنوان)</label>
                    <div class="field-inline">
                        <input class="form-input" id="mn_tag" value="${esc(mn.config.tag||'')}" placeholder="مثلاً: اختبار محاكي">
                        ${_emojiBtnHTML('mn_tag')}
                    </div>
                </div>
                <div class="form-field full"><label class="form-label">العنوان الرئيسي</label>
                    <div class="field-inline">
                        <input class="form-input" id="mn_title" value="${esc(mn.config.title||'')}" placeholder="السبت القادم — القدرات">
                        ${_emojiBtnHTML('mn_title')}
                    </div>
                </div>
                <div class="form-field full"><label class="form-label">النص التوضيحي</label>
                    <div class="field-inline">
                        <input class="form-input" id="mn_subtitle" value="${esc(mn.config.subtitle||'')}" placeholder="وصف مختصر...">
                        ${_emojiBtnHTML('mn_subtitle')}
                    </div>
                </div>

                <div class="form-field full">
                    <label class="form-label">نص الزر ولونه ولون الخط</label>
                    <div class="field-inline">
                        <input class="form-input" id="mn_cta_text" value="${esc(mn.config.cta_text||'')}" placeholder="سجّل مشاركتي">
                        ${_emojiBtnHTML('mn_cta_text')}
                        <input class="form-input color-pick" type="color" id="mn_btn_color" value="${esc(mn.config.btn_color||'#FFD700')}" title="لون الزر">
                        <input class="form-input color-pick" type="color" id="mn_btn_text_color" value="${esc(mn.config.btn_text_color||'#1A1230')}" title="لون نص الزر">
                    </div>
                </div>

                <div class="form-field full">
                    <label class="form-label">تدرّج الخلفية (يسار ← يمين)</label>
                    <div class="field-inline">
                        <input class="form-input color-pick" type="color" id="mn_bg_left" value="${esc(mn.config.bg_left||'#1A1230')}" title="لون يسار">
                        <input class="form-input color-pick" type="color" id="mn_bg_right" value="${esc(mn.config.bg_right||'#2D1B69')}" title="لون يمين">
                        <span style="flex:1;font-size:11px;color:var(--i3);align-self:center;padding-right:6px">اختر لونين متدرّجين</span>
                    </div>
                </div>

                ${tgtSelect('mn_target', tgtValue(mn))}
                ${_scheduleHTML('mn', mn.schedule_start, mn.schedule_end)}
            </div>
            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("main")'>حفظ</button>
        </div>

        <!-- MOCK EXAM BANNER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">📝 بنر الاختبار المحاكي <span class="banner-status ${mx.is_active?'live':'off'}">${mx.is_active?'مفعّل':'معطّل'}</span></div>
                ${_bannerToggleHTML('mock_exam', mx.is_active)}
            </div>
            <div class="form-grid">
                <div class="form-field">
                    <label class="form-label">نوع الاختبار</label>
                    <select class="form-select" id="mx_exam_type" onchange="applyMockExamPreset()">
                        <option value="tahsili" ${mx.config.exam_type==='tahsili'?'selected':''}>تحصيلي</option>
                        <option value="qudurat_computer" ${mx.config.exam_type==='qudurat_computer'?'selected':''}>قدرات (محوسب)</option>
                        <option value="qudurat_paper" ${mx.config.exam_type==='qudurat_paper'?'selected':''}>قدرات (ورقي)</option>
                        <option value="custom" ${mx.config.exam_type==='custom'?'selected':''}>مخصّص</option>
                    </select>
                </div>
                <div class="form-field">
                    <label class="form-label">تاريخ الاختبار</label>
                    <input class="form-input" id="mx_exam_date" type="date" value="${esc(mx.config.exam_date||'')}">
                </div>
                <div class="form-field full">
                    <label class="form-label">عنوان البنر</label>
                    <div class="field-inline">
                        <input class="form-input" id="mx_title" value="${esc(mx.config.title||'')}" placeholder="محاكي التحصيلي — الفترة الأولى">
                        ${_emojiBtnHTML('mx_title')}
                    </div>
                </div>
                <div class="form-field">
                    <label class="form-label">عدد الأسئلة</label>
                    <input class="form-input" id="mx_questions" type="number" min="1" value="${esc(mx.config.questions||'')}">
                </div>
                <div class="form-field">
                    <label class="form-label">المدة (دقيقة)</label>
                    <input class="form-input" id="mx_duration" type="number" min="1" value="${esc(mx.config.duration_min||'')}">
                </div>
                <div class="form-field full">
                    <label class="form-label">نص الزر</label>
                    <div class="field-inline">
                        <input class="form-input" id="mx_cta_text" value="${esc(mx.config.cta_text||'سجّل الآن')}">
                        ${_emojiBtnHTML('mx_cta_text')}
                    </div>
                </div>
                ${_scheduleHTML('mx', mx.schedule_start, mx.schedule_end)}
            </div>
            <div style="display:flex;gap:8px;margin-top:12px">
                <button class="btn btn-pri" onclick='saveBanner("mock_exam")'>حفظ</button>
                <button class="btn btn-ghost" onclick='openMockExamRegList()'>قائمة المسجّلين</button>
            </div>
        </div>

        <!-- IMAGE BANNER -->
        <div class="banner-form">
            <div class="banner-form-top"><div class="banner-form-title">🖼️ بنر الصورة <span class="banner-status ${img.is_active?'live':'off'}">${img.is_active?'مفعّل':'معطّل'}</span> <span class="banner-pos">${(img.sort_order||0) < (mn.sort_order||0) ? '⬆ أعلى' : '⬇ أسفل'}</span></div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-ghost" style="padding:6px 10px;font-size:12px" onclick="swapBannerOrder()" title="تبديل الترتيب مع البنر الرئيسي">↕ تبديل الترتيب</button>
                    ${_bannerToggleHTML('image', img.is_active)}
                </div>
            </div>

            <!-- معاينة مباشرة -->
            <div class="banner-preview" style="background:var(--s2);padding:10px;display:flex;align-items:center;justify-content:center;min-height:140px">
                <img id="img_preview" src="${esc(img.config.image_url||'https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400')}" style="max-width:100%;border-radius:10px;max-height:200px" onerror="this.src='https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400'">
            </div>

            <!-- خياران: رفع ملف + لصق URL -->
            <div class="form-field full">
                <label class="form-label">صورة البنر (1200×400 موصى به)</label>
                <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
                    <button type="button" class="btn btn-ghost" onclick="document.getElementById('img_file').click()">
                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        رفع ملف
                    </button>
                    <input type="file" id="img_file" accept="image/*" style="display:none" onchange="uploadBannerImage(this)">
                    <span style="font-size:11px;color:var(--i4)">أو</span>
                    <input class="form-input" id="img_url" type="url" placeholder="لصق رابط الصورة (URL)" value="${esc(img.config.image_url||'')}" style="flex:1" oninput="refreshBannerImagePreview()">
                </div>
                <div style="font-size:10px;color:var(--i4)">الصيغ: JPG/PNG/WebP · الحد الأقصى: 2MB</div>
            </div>

            <!-- رابط الضغط -->
            <div class="form-grid" style="margin-top:10px">
                <div class="form-field">
                    <label class="form-label">نوع الرابط عند الضغط</label>
                    <select class="form-select" id="img_link_type" onchange="toggleLinkFields()">
                        <option value="none" ${!img.config.link_type||img.config.link_type==='none'?'selected':''}>بدون رابط</option>
                        <option value="internal" ${img.config.link_type==='internal'?'selected':''}>داخلي (صفحة في التطبيق)</option>
                        <option value="external" ${img.config.link_type==='external'?'selected':''}>خارجي (URL)</option>
                    </select>
                </div>
                <div class="form-field" id="img_internal_wrap" style="${img.config.link_type==='internal'?'':'display:none'}">
                    <label class="form-label">الصفحة الداخلية</label>
                    <select class="form-select" id="img_internal">
                        <option value="leaks.html" ${img.config.link==='leaks.html'?'selected':''}>التسريبات</option>
                        <option value="training.html" ${img.config.link==='training.html'?'selected':''}>التدريب</option>
                        <option value="reports.html" ${img.config.link==='reports.html'?'selected':''}>التقارير</option>
                        <option value="../pricing.html" ${img.config.link==='../pricing.html'?'selected':''}>الاشتراك</option>
                        <option value="profile.html" ${img.config.link==='profile.html'?'selected':''}>الملف الشخصي</option>
                    </select>
                </div>
                <div class="form-field full" id="img_external_wrap" style="${img.config.link_type==='external'?'':'display:none'}">
                    <label class="form-label">الرابط الخارجي</label>
                    <input class="form-input" id="img_external" type="url" value="${esc(img.config.link&&img.config.link_type==='external'?img.config.link:'')}" placeholder="https://example.com">
                </div>
                ${tgtSelect('img_target', tgtValue(img))}
                ${_scheduleHTML('img', img.schedule_start, img.schedule_end)}
            </div>

            <button class="btn btn-pri" style="margin-top:12px" onclick='saveBanner("image")'>حفظ</button>
        </div>`;

        // Apply initial ticker speed to preview
        try {
            if (typeof applyTickerSpeedPreview === 'function') {
                applyTickerSpeedPreview(tk.config.speed || 50);
            }
        } catch(_) {}
    } catch(e) { showToast('خطأ','err'); }
};

window.refreshBannerImagePreview = function() {
    const url = (document.getElementById('img_url')?.value || '').trim();
    const prev = document.getElementById('img_preview');
    if (!prev) return;
    prev.src = url || 'https://via.placeholder.com/1200x400/6D5DF6/ffffff?text=%D8%B5%D9%88%D8%B1%D8%A9+%D8%A7%D9%84%D8%A8%D9%86%D8%B1+1200x400';
};

window.uploadBannerImage = async function(input) {
    const { sb } = window.A;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('الملف أكبر من 2MB','err'); return; }
    if (!/^image\//.test(file.type)) { showToast('يرجى اختيار صورة','err'); return; }

    // كشف وضع المعاينة (Mock) → استخدم FileReader كبديل عن الرفع
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    showToast('جاري الرفع...','');
    try {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = 'banners/' + Date.now() + '-' + Math.random().toString(36).substr(2,8) + '.' + ext;
        const { error } = await sb.storage.from('question-images').upload(path, file, { upsert: false, contentType: file.type });
        if (error) {
            // في وضع المعاينة: احفظ كـ data URL محلي للمعاينة المباشرة
            if (isPreview) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    document.getElementById('img_url').value = ev.target.result;
                    refreshBannerImagePreview();
                    showToast('معاينة محلية (بدون رفع — وضع المعاينة)','suc');
                };
                reader.readAsDataURL(file);
                return;
            }
            showToast('خطأ في الرفع: ' + error.message, 'err');
            return;
        }
        const { data } = sb.storage.from('question-images').getPublicUrl(path);
        document.getElementById('img_url').value = data.publicUrl;
        refreshBannerImagePreview();
        showToast('تم رفع الصورة','suc');
    } catch(e) {
        showToast('خطأ: ' + e.message, 'err');
    } finally {
        input.value = '';
    }
};

window.openMockExamRegList = async function() {
    const { sb } = window.A;
    try {
        const { data: examData, error: examErr } = await sb.rpc('get_active_mock_exam_status');
        if (examErr) throw examErr;
        if (!examData || !examData.length) { showToast('لا يوجد اختبار نشط — احفظ البنر أوّلاً','err'); return; }
        const exam = examData[0];
        const { data: regs, error: regErr } = await sb.rpc('admin_list_mock_exam_registrations', { p_exam_id: exam.exam_id });
        if (regErr) throw regErr;
        const list = regs || [];
        const rows = list.length ? list.map(r => `
            <tr>
                <td style="padding:8px 10px">${esc(r.full_name || '—')}</td>
                <td style="padding:8px 10px;font-size:11px;color:var(--i3)">${esc(r.email)}</td>
                <td style="padding:8px 10px;font-size:11px;color:var(--i3)">${fmtDate(r.registered_at, true)}</td>
            </tr>`).join('') : `<tr><td colspan="3" style="padding:20px;text-align:center;color:var(--i3)">لا مسجّلون بعد</td></tr>`;
        const body = `
            <div style="font-size:13px;margin-bottom:12px">${esc(exam.title)} · <strong>${list.length}</strong> مسجّل</div>
            <div style="max-height:400px;overflow:auto;border:1px solid var(--bd);border-radius:8px">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead style="background:var(--s2);position:sticky;top:0">
                        <tr>
                            <th style="padding:8px 10px;text-align:start">الاسم</th>
                            <th style="padding:8px 10px;text-align:start">الإيميل</th>
                            <th style="padding:8px 10px;text-align:start">تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        openModal('قائمة المسجّلين في الاختبار', body, '<button class="btn btn-pri" onclick="closeModal()">إغلاق</button>');
    } catch(e) { showToast('خطأ: ' + (e.message || 'فشل'),'err'); }
};

window.applyMockExamPreset = function() {
    const presets = {
        tahsili:          { questions: 160, duration_min: 125, title: 'محاكي التحصيلي' },
        qudurat_computer: { questions: 96,  duration_min: 100, title: 'محاكي القدرات (محوسب)' },
        qudurat_paper:    { questions: 120, duration_min: 125, title: 'محاكي القدرات (ورقي)' }
    };
    const t = document.getElementById('mx_exam_type').value;
    const p = presets[t];
    if (!p) return;
    document.getElementById('mx_questions').value = p.questions;
    document.getElementById('mx_duration').value = p.duration_min;
    const titleEl = document.getElementById('mx_title');
    if (!titleEl.value.trim()) titleEl.value = p.title;
};

window.toggleLinkFields = function() {
    const type = document.getElementById('img_link_type').value;
    const intWrap = document.getElementById('img_internal_wrap');
    const extWrap = document.getElementById('img_external_wrap');
    if (intWrap) intWrap.style.display = type === 'internal' ? '' : 'none';
    if (extWrap) extWrap.style.display = type === 'external' ? '' : 'none';
};

window.swapBannerOrder = async function() {
    const { sb } = window.A;
    try {
        const { data } = await sb.from('banners').select('banner_type,sort_order').in('banner_type', ['main','image']);
        if (!data || data.length < 2) { showToast('لا يمكن التبديل','err'); return; }
        const mn = data.find(b => b.banner_type === 'main');
        const im = data.find(b => b.banner_type === 'image');
        await sb.from('banners').update({sort_order: im.sort_order}).eq('banner_type','main');
        await sb.from('banners').update({sort_order: mn.sort_order}).eq('banner_type','image');
        showToast('تم تبديل الترتيب','suc');
        loadBanners();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.toggleBanner = async function(type, el) {
    const { sb } = window.A;
    el.classList.toggle('on');
    const active = el.classList.contains('on');
    try {
        await sb.from('banners').update({is_active:active}).eq('banner_type', type);
        showToast((active?'تم تفعيل ':'تم إيقاف ')+type,'suc');
    } catch(e) { showToast('خطأ','err'); }
};

window.saveBanner = async function(type) {
    const { sb } = window.A;
    let config = {};
    let targetSelectId = null;
    let prefix = null;
    const labels = {
        ticker:'الشريط المتحرّك',
        main:'البنر الرئيسي',
        mock_exam:'بنر المحاكي',
        image:'بنر الصورة',
        training_subscribe:'بنر اشتراك التدريب',
        leaks_subscribe:'بنر اشتراك التسريبات'
    };
    if (type === 'ticker') {
        config = {
            keyword: document.getElementById('tk_keyword').value,
            keyword_color: document.getElementById('tk_keyword_color').value,
            text: document.getElementById('tk_text').value,
            bg_color: document.getElementById('tk_bg_color').value,
            text_color: document.getElementById('tk_text_color').value,
            speed: parseInt(document.getElementById('tk_speed').value)
        };
        targetSelectId = 'tk_target';
        prefix = 'tk';
    } else if (type === 'main') {
        config = {
            tag: document.getElementById('mn_tag').value,
            cta_text: document.getElementById('mn_cta_text').value,
            title: document.getElementById('mn_title').value,
            subtitle: document.getElementById('mn_subtitle').value,
            bg_left: document.getElementById('mn_bg_left').value,
            bg_right: document.getElementById('mn_bg_right').value,
            btn_color: document.getElementById('mn_btn_color').value,
            btn_text_color: document.getElementById('mn_btn_text_color').value
        };
        targetSelectId = 'mn_target';
        prefix = 'mn';
    } else if (type === 'image') {
        const linkType = document.getElementById('img_link_type').value;
        let link = null;
        if (linkType === 'internal') link = document.getElementById('img_internal').value;
        else if (linkType === 'external') link = document.getElementById('img_external').value.trim();
        config = {
            image_url: document.getElementById('img_url').value.trim(),
            link_type: linkType,
            link: link || null
        };
        targetSelectId = 'img_target';
        prefix = 'img';
    } else if (type === 'mock_exam') {
        const q = parseInt(document.getElementById('mx_questions').value, 10);
        const dur = parseInt(document.getElementById('mx_duration').value, 10);
        config = {
            exam_type: document.getElementById('mx_exam_type').value,
            title: document.getElementById('mx_title').value.trim(),
            exam_date: document.getElementById('mx_exam_date').value || null,
            questions: isNaN(q) ? null : q,
            duration_min: isNaN(dur) ? null : dur,
            cta_text: document.getElementById('mx_cta_text').value.trim() || 'سجّل الآن'
        };
        prefix = 'mx';
        // مزامنة مع mock_exams (للحجز الحقيقي + التسجيلات)
        if (config.exam_date && !isNaN(q) && !isNaN(dur) && config.title) {
            try {
                await sb.rpc('admin_upsert_active_mock_exam', {
                    p_exam_type: config.exam_type,
                    p_title: config.title,
                    p_exam_date: config.exam_date,
                    p_duration_min: dur,
                    p_questions_count: q
                });
            } catch(e) { /* SQL 36 may not be applied yet */ }
        }
    }

    // Build target_pages array from dropdown selection
    const targetMap = {
        dashboard: ['dashboard'],
        leaks: ['leaks'],
        'dashboard+leaks': ['dashboard','leaks'],
        all: ['all']
    };
    const sel = targetSelectId ? document.getElementById(targetSelectId) : null;
    const target_pages = sel ? (targetMap[sel.value] || ['dashboard']) : ['dashboard'];

    // Read schedule fields (optional — empty = no scheduling)
    const schedStartEl = prefix ? document.getElementById(prefix + '_sched_start') : null;
    const schedEndEl   = prefix ? document.getElementById(prefix + '_sched_end')   : null;
    const schedule_start = schedStartEl ? _readLocalDT(schedStartEl.value) : null;
    const schedule_end   = schedEndEl   ? _readLocalDT(schedEndEl.value)   : null;

    // Validate: end > start (if both provided)
    if (schedule_start && schedule_end && new Date(schedule_end) <= new Date(schedule_start)) {
        showSaveToast('خطأ: تاريخ نهاية الجدولة يجب أن يكون بعد تاريخ البداية','err');
        return;
    }

    try {
        const payload = { config, target_pages, schedule_start, schedule_end };
        let { error } = await sb.from('banners').update(payload).eq('banner_type', type);

        // Fallback A: schedule_* columns missing → drop them and retry
        if (error && /schedule_(start|end)/i.test(error.message || '')) {
            const p2 = { config, target_pages };
            const r2 = await sb.from('banners').update(p2).eq('banner_type', type);
            error = r2.error;
            if (!error) {
                showSaveToast('تم حفظ '+(labels[type]||type)+' — لتفعيل الجدولة شغّل Migration 62','err');
                loadBanners();
                return;
            }
        }
        // Fallback B: target_pages column missing → save config only
        if (error && /target_pages/i.test(error.message || '')) {
            await sb.from('banners').update({ config }).eq('banner_type', type);
            showSaveToast('تم الحفظ — شغّل Migration 13 لإكمال "يظهر في"','err');
        } else if (error) {
            throw error;
        } else {
            const schedNote = (schedule_start || schedule_end) ? ' — مع جدولة زمنية' : '';
            showSaveToast('تم حفظ '+(labels[type]||type)+' · منشور الآن'+schedNote,'suc');
        }
        loadBanners();
    } catch(e) { showSaveToast('خطأ: '+e.message,'err'); }
};

// ═══════════════════════════════════════════════════════
// BANNERS HELPERS — Save toast / Emoji picker / Schedule / Big toggle
// ═══════════════════════════════════════════════════════

window.showSaveToast = function(msg, type) {
    type = type || 'suc';
    const old = document.querySelector('.save-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'save-toast' + (type === 'err' ? ' err' : '');
    const icon = type === 'err'
        ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
    t.innerHTML = icon + '<span>' + msg + '</span><div class="x" title="إغلاق"><svg viewBox="0 0 24 24" style="width:12px;height:12px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    t.querySelector('.x').onclick = () => t.remove();
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'saveToastOut .3s var(--ease) forwards';
        setTimeout(() => t.remove(), 300);
    }, 4000);
};

window.COMMON_EMOJIS = ['🎉','🚀','⏰','📚','🎯','⚡','💡','✨','🔥','📢','🎁','💪','📝','🏆','⭐','🎓','📊','💎','🌟','🎊','📌','🆕','🔔','✅'];

window.openEmojiPicker = function(btn, inputId) {
    const old = document.querySelector('.emoji-pop');
    if (old) { old.remove(); if (old._for === inputId) return; }
    const input = document.getElementById(inputId);
    if (!input) return;
    const pop = document.createElement('div');
    pop.className = 'emoji-pop';
    pop._for = inputId;
    pop.innerHTML = window.COMMON_EMOJIS.map(e => '<div class="ep-item" data-e="'+e+'">'+e+'</div>').join('');
    document.body.appendChild(pop);
    const r = btn.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.right = Math.max(8, document.documentElement.clientWidth - r.right) + 'px';
    pop.addEventListener('click', e => {
        const it = e.target.closest('.ep-item');
        if (!it) return;
        const emoji = it.dataset.e;
        const start = input.selectionStart != null ? input.selectionStart : input.value.length;
        const end = input.selectionEnd != null ? input.selectionEnd : input.value.length;
        input.value = input.value.slice(0,start) + emoji + input.value.slice(end);
        input.focus();
        try { input.setSelectionRange(start + emoji.length, start + emoji.length); } catch(_) {}
        input.dispatchEvent(new Event('input',{bubbles:true}));
        pop.remove();
    });
    setTimeout(() => {
        const close = (ev) => {
            if (!pop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
                pop.remove();
                document.removeEventListener('click', close);
            }
        };
        document.addEventListener('click', close);
    }, 50);
};

window.clearBannerSchedule = function(prefix) {
    const s = document.getElementById(prefix + '_sched_start');
    const e = document.getElementById(prefix + '_sched_end');
    if (s) s.value = '';
    if (e) e.value = '';
};

window._fmtLocalDT = function(v) {
    if (!v) return '';
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        const tz = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tz).toISOString().slice(0,16);
    } catch(_) { return ''; }
};

window._readLocalDT = function(v) {
    if (!v) return null;
    try {
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch(_) { return null; }
};

window._bannerToggleHTML = function(type, isActive) {
    return ''
        + '<div class="toggle-big-wrap '+(isActive?'is-on':'')+'" onclick="toggleBannerBig(\''+type+'\', this)" title="اضغط للتفعيل أو الإيقاف">'
        +     '<span class="toggle-big-lbl"><span class="on-txt">نشط</span><span class="off-txt">متوقف</span></span>'
        +     '<div class="toggle-big '+(isActive?'on':'')+'"></div>'
        + '</div>';
};

window._emojiBtnHTML = function(targetInputId) {
    return '<button type="button" class="emoji-btn" onclick="openEmojiPicker(this,\''+targetInputId+'\')" title="إضافة إيموجي">😀</button>';
};

window._scheduleHTML = function(prefix, schedStart, schedEnd) {
    return ''
        + '<div class="form-field full" style="margin-top:6px">'
        +     '<label class="form-label">جدولة الظهور (اختياري — اتركها فارغة للظهور الدائم)</label>'
        +     '<div class="sched-row">'
        +         '<input class="form-input" id="'+prefix+'_sched_start" type="datetime-local" value="'+_fmtLocalDT(schedStart)+'" placeholder="من">'
        +         '<input class="form-input" id="'+prefix+'_sched_end" type="datetime-local" value="'+_fmtLocalDT(schedEnd)+'" placeholder="إلى">'
        +     '</div>'
        +     '<div class="sched-hint">'
        +         '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        +         '<span>يظهر فقط بين هذين الوقتين ويختفي تلقائياً</span>'
        +         '<button type="button" class="sched-clear" onclick="clearBannerSchedule(\''+prefix+'\')">مسح الجدولة</button>'
        +     '</div>'
        + '</div>';
};

window.toggleBannerBig = async function(type, wrap) {
    const { sb } = window.A;
    wrap.classList.toggle('is-on');
    const inner = wrap.querySelector('.toggle-big');
    if (inner) inner.classList.toggle('on');
    const active = wrap.classList.contains('is-on');
    const labels = {
        ticker:'الشريط المتحرّك',
        main:'البنر الرئيسي',
        mock_exam:'بنر المحاكي',
        image:'بنر الصورة',
        training_subscribe:'بنر اشتراك التدريب',
        leaks_subscribe:'بنر اشتراك التسريبات'
    };
    // مهمّ: لو الصف غير موجود في banners (مثل training_subscribe أوّل تفعيل)،
    // نعمل INSERT بدل UPDATE صامت. defaults حسب نوع البنر.
    const defaults = {
        training_subscribe: { sort_order: 80, config: {}, target_pages: ['training'] },
        leaks_subscribe:    { sort_order: 81, config: {}, target_pages: ['leaks'] },
    };
    try {
        // فحص: الصف موجود؟
        const { data: existing } = await sb.from('banners')
            .select('id').eq('banner_type', type).maybeSingle();
        if (existing) {
            const { error } = await sb.from('banners').update({is_active:active}).eq('banner_type', type);
            if (error) throw error;
        } else {
            const def = defaults[type] || { sort_order: 90, config: {}, target_pages: ['dashboard'] };
            const { error } = await sb.from('banners').insert({
                banner_type: type,
                is_active: active,
                sort_order: def.sort_order,
                config: def.config,
                target_pages: def.target_pages,
            });
            if (error) throw error;
        }
        showSaveToast((active?'تم تفعيل ':'تم إيقاف ') + (labels[type] || type),'suc');
        loadBanners();
    } catch(e) {
        wrap.classList.toggle('is-on');
        if (inner) inner.classList.toggle('on');
        showSaveToast('خطأ: '+e.message,'err');
    }
};

window.applyTickerSpeedPreview = function(v) {
    const n = parseInt(v, 10) || 50;
    // Map slider 10..100 → duration 60s..8s (linear, inversed)
    const dur = Math.max(8, Math.round((110 - n) * 0.6));
    const el = document.querySelector('.ticker-preview-in');
    if (el) el.style.animationDuration = dur + 's';
    const lbl = document.getElementById('tk_speed_v');
    if (lbl) lbl.textContent = n + ' (' + dur + ' ثانية لجولة كاملة)';
};

// ═══════════════════════════════════════════════════════
// 9. PAGES
// ═══════════════════════════════════════════════════════
window.loadPages = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">الصفحات التعريفية</div>
        <button class="btn btn-pri" onclick="openPageModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>صفحة جديدة</button>
    </div>
    <div id="pagesList"><div class="loader">...</div></div>`;
    try {
        const { data } = await sb.from('pages').select('*').order('updated_at',{ascending:false});
        const list = document.getElementById('pagesList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">📄</div><div class="empty-t">لا صفحات</div></div>'; return; }
        list.innerHTML = data.map(p => `
            <div class="card" style="padding:16px 18px;margin-bottom:10px;display:flex;align-items:center;gap:14px;cursor:pointer" onclick='editPage("${p.id}")'>
                ${p.logo_url?'<img src="'+esc(p.logo_url)+'" style="width:36px;height:36px;border-radius:10px" onerror="this.style.display=\'none\'">':'<div style="width:36px;height:36px;border-radius:10px;background:var(--pri-s);display:grid;place-items:center"><svg width="16" height="16" fill="none" stroke="var(--pri)" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>'}
                <div style="flex:1"><div style="font-size:13px;font-weight:700">${esc(p.title)}</div><div style="font-size:10px;color:var(--i3)">${esc(p.description||p.slug)}</div></div>
                <div style="font-size:10px;color:var(--i4)">${fmtDate(p.updated_at)}</div>
            </div>`).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openPageModal = function(existing) {
    const d = existing || { slug:'', title:'', description:'', content:'', logo_url:'' };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">العنوان</label><input class="form-input" id="pgTitle" value="${esc(d.title)}"></div>
        <div class="form-field"><label class="form-label">المعرف (slug)</label><input class="form-input" id="pgSlug" value="${esc(d.slug)}" ${existing?'readonly':''}></div>
        <div class="form-field full"><label class="form-label">الوصف</label><input class="form-input" id="pgDesc" value="${esc(d.description||'')}"></div>
        <div class="form-field full"><label class="form-label">رابط الشعار</label><input class="form-input" id="pgLogo" type="url" value="${esc(d.logo_url||'')}" placeholder="https://..."></div>
        <div class="form-field full"><label class="form-label">المحتوى (HTML)</label><textarea class="form-textarea" id="pgContent" style="min-height:200px;font-family:monospace">${esc(d.content||'')}</textarea></div>
    </div>`;
    openModal(existing?'تعديل صفحة':'صفحة جديدة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="savePage('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.savePage = async function(id) {
    const { sb } = window.A;
    const data = {
        title: document.getElementById('pgTitle').value.trim(),
        slug: document.getElementById('pgSlug').value.trim(),
        description: document.getElementById('pgDesc').value.trim() || null,
        logo_url: document.getElementById('pgLogo').value.trim() || null,
        content: document.getElementById('pgContent').value,
        updated_at: new Date().toISOString()
    };
    if (!data.title || !data.slug) return showToast('العنوان والمعرف مطلوبان','err');
    try {
        if (id) await sb.from('pages').update(data).eq('id', id);
        else await sb.from('pages').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadPages();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editPage = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('pages').select('*').eq('id', id).single();
    if (data) openPageModal(data);
};

// ═══════════════════════════════════════════════════════
// 10. REFERRALS — النظام النقدي (إعادة بناء 2026-05-09)
// ═══════════════════════════════════════════════════════
// المنطق: كل إحالة = 10 ر.س للمُحيل (بعد دفع المُحال) + 10% خصم للمُحال
// الحالات: awaiting_payment → confirmed (instant بعد الدفع) → paid_out (بعد الصرف)
window.loadReferrals = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="refArea"><div class="loader">...</div></div>';
    try {
        // ── جلب كل الإحالات بـcash + الـpayouts ──
        const [refsR, payoutsR] = await Promise.all([
            sb.from('referrals').select('id,referrer_id,referred_user_id,cash_amount,cash_status,paid_at,confirmed_at,created_at').limit(2000),
            sb.from('referral_payouts').select('id,user_id,amount,status,requested_at,processed_at,stc_pay_number').order('requested_at',{ascending:false}).limit(500)
        ]);

        const refs = refsR.data || [];
        const payouts = payoutsR.data || [];

        // ── احسب الـKPIs ──
        const totalRefs = refs.length;
        const paidRefs = refs.filter(r => r.cash_status === 'confirmed' || r.cash_status === 'paid_out').length;
        const conversionRate = totalRefs > 0 ? Math.round(paidRefs / totalRefs * 100) : 0;

        const sumByStatus = (status) => refs
            .filter(r => r.cash_status === status)
            .reduce((s,r)=>s + Number(r.cash_amount||10), 0);

        const cashAwaiting  = sumByStatus('awaiting_payment'); // المحال لم يدفع بعد
        const cashAvailable = sumByStatus('confirmed');         // متاح للصرف
        const cashPaidOut   = sumByStatus('paid_out');          // صُرف فعلاً
        const totalEarned   = cashAvailable + cashPaidOut;      // إجمالي ربح المُحيلين

        // طلبات الصرف المعلّقة
        const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'requested' || p.status === 'processing');

        document.getElementById('refArea').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
            <div class="kpi blue"><div class="kpi-label">إجمالي الإحالات</div><div class="kpi-val">${fmt(totalRefs)}</div><div class="kpi-sub">سجّلوا عبر الإحالة</div></div>
            <div class="kpi green"><div class="kpi-label">دفعوا فعلاً</div><div class="kpi-val">${fmt(paidRefs)}</div><div class="kpi-sub">نسبة التحويل ${conversionRate}%</div></div>
            <div class="kpi gold"><div class="kpi-label">كاش متاح للصرف</div><div class="kpi-val">${fmt(cashAvailable)} <small style="font-size:14px">ر.س</small></div><div class="kpi-sub">جاهز عند طلب الصرف</div></div>
            <div class="kpi orange"><div class="kpi-label">كاش مصروف</div><div class="kpi-val">${fmt(cashPaidOut)} <small style="font-size:14px">ر.س</small></div><div class="kpi-sub">حوالات مكتملة</div></div>
        </div>

        ${pendingPayouts.length > 0 ? `
        <div class="card" style="border:1px solid #FCD34D;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);margin-bottom:16px">
            <div class="card-hdr">
                <div class="card-hdr-l">
                    <div class="card-ic gold"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                    <div><div class="card-title">${pendingPayouts.length} طلب صرف بانتظار المعالجة</div>
                    <div style="font-size:11px;color:#92400E;margin-top:2px">إجمالي: ${fmt(pendingPayouts.reduce((s,p)=>s+Number(p.amount||0),0))} ر.س</div></div>
                </div>
                <button class="btn btn-pri" onclick="loadPayouts()" style="margin:0">عرض طلبات الصرف</button>
            </div>
        </div>` : ''}

        <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><div><div class="card-title">المُحيلون حسب الكاش</div></div></div></div>
            <div class="tbl-wrap" id="refTable"><div class="loader">...</div></div></div>

        <div class="card" style="margin-top:16px"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic blue"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg></div><div><div class="card-title">آخر 20 إحالة</div></div></div></div>
            <div class="tbl-wrap" id="refRecentTable"><div class="loader">...</div></div></div>`;

        // ── جدول 1: تجميع حسب المُحيل + جلب أسماء ──
        const referrerIds = [...new Set(refs.map(r => r.referrer_id).filter(Boolean))];
        let profilesMap = {};
        if (referrerIds.length > 0) {
            const { data: profs } = await sb.from('profiles').select('id,full_name,referral_code,avatar_emoji,email').in('id', referrerIds);
            (profs||[]).forEach(p => { profilesMap[p.id] = p; });
        }

        const byUser = {};
        refs.forEach(r => {
            const k = r.referrer_id;
            if (!byUser[k]) byUser[k] = { referrer: profilesMap[k]||{}, total:0, paid:0, awaiting:0, available:0, paidOut:0 };
            byUser[k].total++;
            if (r.cash_status === 'awaiting_payment') byUser[k].awaiting += Number(r.cash_amount||10);
            else if (r.cash_status === 'confirmed') { byUser[k].paid++; byUser[k].available += Number(r.cash_amount||10); }
            else if (r.cash_status === 'paid_out') { byUser[k].paid++; byUser[k].paidOut += Number(r.cash_amount||10); }
        });
        const rows = Object.values(byUser).sort((a,b)=>(b.available+b.paidOut)-(a.available+a.paidOut));
        const tbl = document.getElementById('refTable');
        if (rows.length === 0) {
            tbl.innerHTML = '<div class="empty-d">لا إحالات بعد</div>';
        } else {
            tbl.innerHTML = '<table><thead><tr><th>الكود</th><th>المُحيل</th><th>إجمالي</th><th>دفعوا</th><th>معلّق ر.س</th><th>متاح ر.س</th><th>مصروف ر.س</th></tr></thead><tbody>' +
                rows.map(r => `<tr>
                    <td><b style="color:var(--pri);letter-spacing:1px;font-family:monospace">${esc(r.referrer?.referral_code||'—')}</b></td>
                    <td><div style="display:flex;align-items:center;gap:8px"><div class="tbl-avatar">${(window.buildAvatarHTML ? window.buildAvatarHTML(r.referrer?.avatar_emoji, r.referrer?.full_name, 32) : esc((r.referrer?.full_name||'?').charAt(0)))}</div><div><div class="td-name">${esc(r.referrer?.full_name||'—')}</div><div style="font-size:10px;color:var(--i3)">${esc(r.referrer?.email||'')}</div></div></div></td>
                    <td>${r.total}</td>
                    <td><b style="color:var(--suc)">${r.paid}</b></td>
                    <td><span style="color:var(--i3)">${r.awaiting||0}</span></td>
                    <td><b style="color:var(--gold)">${r.available||0}</b></td>
                    <td><b style="color:var(--acc)">${r.paidOut||0}</b></td>
                </tr>`).join('') + '</tbody></table>';
        }

        // ── جدول 2: آخر 20 إحالة (نشاط حديث) ──
        const recent = refs.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,20);
        const referredIds = [...new Set(recent.map(r=>r.referred_user_id).filter(Boolean))];
        let referredMap = {};
        if (referredIds.length > 0) {
            const { data: rps } = await sb.from('profiles').select('id,full_name,email').in('id', referredIds);
            (rps||[]).forEach(p => { referredMap[p.id] = p; });
        }
        const recentTbl = document.getElementById('refRecentTable');
        if (recent.length === 0) {
            recentTbl.innerHTML = '<div class="empty-d">—</div>';
        } else {
            const statusBadge = (s) => {
                if (s==='awaiting_payment') return '<span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">في انتظار الدفع</span>';
                if (s==='confirmed') return '<span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">دفع — كاش متاح</span>';
                if (s==='paid_out') return '<span style="background:#FED7AA;color:#9A3412;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">صُرف</span>';
                return '<span style="color:var(--i3)">—</span>';
            };
            recentTbl.innerHTML = '<table><thead><tr><th>التاريخ</th><th>المُحيل</th><th>المُحال</th><th>الحالة</th><th>المبلغ</th></tr></thead><tbody>' +
                recent.map(r => {
                    const referrer = profilesMap[r.referrer_id] || {};
                    const referred = referredMap[r.referred_user_id] || {};
                    const d = new Date(r.created_at);
                    const dateStr = d.toLocaleDateString('en-GB') + ' ' + d.toTimeString().slice(0,5);
                    return `<tr>
                        <td style="font-size:11px;color:var(--i3)">${dateStr}</td>
                        <td><span style="font-family:monospace;color:var(--pri);font-size:11px">${esc(referrer.referral_code||'—')}</span><br><span style="font-size:10.5px">${esc(referrer.full_name||'—')}</span></td>
                        <td><div style="font-size:11.5px">${esc(referred.full_name||'مستخدم')}</div><div style="font-size:10px;color:var(--i3)">${esc(referred.email||'')}</div></td>
                        <td>${statusBadge(r.cash_status)}</td>
                        <td><b>${r.cash_amount||10} ر.س</b></td>
                    </tr>`;
                }).join('') + '</tbody></table>';
        }
    } catch(e) {
        console.error('[loadReferrals] error:', e);
        document.getElementById('refArea').innerHTML = '<div class="empty-d">تعذّر تحميل الإحالات: '+esc(e.message||'خطأ')+'</div>';
    }
};

// ═══════════════════════════════════════════════════════
// 11. TIPS
// ═══════════════════════════════════════════════════════
window.loadTips = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:14px;font-weight:700">النصائح اليومية</div>
        <button class="btn btn-pri" onclick="openTipModal()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>نصيحة جديدة</button>
    </div>
    <div id="tipsList"><div class="loader">...</div></div>`;
    try {
        const { data } = await sb.from('tips').select('*').order('sort_order');
        const list = document.getElementById('tipsList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">💡</div><div class="empty-t">لا نصائح</div></div>'; return; }
        list.innerHTML = data.map(t => `
            <div class="tip-manage-item">
                <div class="tip-manage-body"><div class="tip-manage-title">${t.emoji||'💡'} ${esc(t.title)}</div><div class="tip-manage-txt">${esc(t.body)}</div></div>
                <div class="tip-manage-actions">
                    <button class="q-act-btn" onclick='editTip("${t.id}")'><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="q-act-btn" onclick='deleteTip("${t.id}")'><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
                </div>
            </div>`).join('');
    } catch(e) { showToast('خطأ','err'); }
};

window.openTipModal = function(existing) {
    const d = existing || { emoji:'💡', title:'', body:'', sort_order:0, is_active:true };
    const body = `
    <div class="form-grid">
        <div class="form-field"><label class="form-label">إيموجي</label><input class="form-input" id="tpEmoji" value="${esc(d.emoji)}" maxlength="4"></div>
        <div class="form-field"><label class="form-label">الترتيب</label><input class="form-input" type="number" id="tpOrder" value="${d.sort_order||0}"></div>
        <div class="form-field full"><label class="form-label">العنوان</label><input class="form-input" id="tpTitle" value="${esc(d.title)}"></div>
        <div class="form-field full"><label class="form-label">النص</label><textarea class="form-textarea" id="tpBody">${esc(d.body)}</textarea></div>
        <div class="form-field"><label><input type="checkbox" id="tpActive" ${d.is_active!==false?'checked':''}> فعّالة</label></div>
    </div>`;
    openModal(existing?'تعديل نصيحة':'نصيحة جديدة', body, '<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button><button class="btn btn-pri" onclick="saveTip('+(existing?'"'+existing.id+'"':'null')+')">حفظ</button>');
};

window.saveTip = async function(id) {
    const { sb } = window.A;
    const data = {
        emoji: document.getElementById('tpEmoji').value,
        title: document.getElementById('tpTitle').value.trim(),
        body: document.getElementById('tpBody').value.trim(),
        sort_order: parseInt(document.getElementById('tpOrder').value) || 0,
        is_active: document.getElementById('tpActive').checked
    };
    if (!data.title || !data.body) return showToast('العنوان والنص مطلوبان','err');
    try {
        if (id) await sb.from('tips').update(data).eq('id', id);
        else await sb.from('tips').insert(data);
        showToast('تم الحفظ','suc');
        closeModal();
        loadTips();
    } catch(e) { showToast('خطأ: '+e.message,'err'); }
};

window.editTip = async function(id) {
    const { sb } = window.A;
    const { data } = await sb.from('tips').select('*').eq('id', id).single();
    if (data) openTipModal(data);
};

window.deleteTip = async function(id) {
    if (!confirm('حذف النصيحة؟')) return;
    const { sb } = window.A;
    await sb.from('tips').delete().eq('id', id);
    showToast('تم الحذف','suc');
    loadTips();
};

// ═══════════════════════════════════════════════════════
// 12. SEO
// ═══════════════════════════════════════════════════════
window.loadSEO = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="seoArea"><div class="loader">...</div></div>';
    try {
        const { data } = await sb.from('seo_settings').select('*').limit(1).single();
        const s = data || {};
        document.getElementById('seoArea').innerHTML = `
        <div class="row c2">
            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic pur"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div><div class="card-title">إعدادات SEO</div></div></div></div>
            <div class="card-body">
                <div class="form-field"><label class="form-label">عنوان الصفحة (Title Tag)</label><input class="form-input" id="seoTitle" value="${esc(s.title_tag||'')}" oninput="updateSeoPreview()"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">الوصف (Meta Description)</label><textarea class="form-textarea" id="seoDesc" oninput="updateSeoPreview()">${esc(s.meta_description||'')}</textarea></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">الكلمات المفتاحية</label><input class="form-input" id="seoKeywords" value="${esc(s.keywords||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">عنوان OG</label><input class="form-input" id="seoOgTitle" value="${esc(s.og_title||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">وصف OG</label><input class="form-input" id="seoOgDesc" value="${esc(s.og_description||'')}"></div>
                <div class="form-field" style="margin-top:12px"><label class="form-label">صورة OG (1200x630)</label><input class="form-input" id="seoOgImg" value="${esc(s.og_image_url||'')}" placeholder="https://..."></div>
                <button class="btn btn-pri" style="margin-top:14px" onclick='saveSEO(${data?'"'+data.id+'"':'null'})'>حفظ</button>
            </div></div>

            <div class="card"><div class="card-hdr"><div class="card-hdr-l"><div class="card-ic grn"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg></div><div><div class="card-title">معاينة Google</div></div></div></div>
            <div class="card-body">
                <div class="seo-preview" id="seoPreview">
                    <div class="seo-url">madarek-elite.com</div>
                    <div class="seo-title-p" id="seoPrevTitle">${esc(s.title_tag||'مدارك النخبة')}</div>
                    <div class="seo-desc-p" id="seoPrevDesc">${esc(s.meta_description||'تدريب الرخصة المهنية بذكاء')}</div>
                </div>
                <div style="font-size:11px;color:var(--i3);margin-top:16px">
                    <div style="font-weight:700;margin-bottom:8px">نصائح ASO:</div>
                    <div style="line-height:1.8">• استخدم كلمات بحثية شائعة<br>• العنوان الأقصى 60 حرف<br>• الوصف بين 150-160 حرف<br>• صورة OG بحجم 1200x630</div>
                </div>
            </div></div>
        </div>`;
    } catch(e) { showToast('خطأ','err'); }
};

window.updateSeoPreview = function() {
    document.getElementById('seoPrevTitle').textContent = document.getElementById('seoTitle').value || 'مدارك النخبة';
    document.getElementById('seoPrevDesc').textContent = document.getElementById('seoDesc').value || 'تدريب الرخصة المهنية';
};

window.saveSEO = async function(id) {
    const { sb } = window.A;
    const data = {
        title_tag: document.getElementById('seoTitle').value,
        meta_description: document.getElementById('seoDesc').value,
        keywords: document.getElementById('seoKeywords').value,
        og_title: document.getElementById('seoOgTitle').value,
        og_description: document.getElementById('seoOgDesc').value,
        og_image_url: document.getElementById('seoOgImg').value,
        updated_at: new Date().toISOString()
    };
    try {
        if (id) await sb.from('seo_settings').update(data).eq('id', id);
        else await sb.from('seo_settings').insert(data);
        showToast('تم الحفظ','suc');
    } catch(e) { showToast('خطأ','err'); }
};

// ═══════════════════════════════════════════════════════
// 13. USERS ANALYTICS
// ═══════════════════════════════════════════════════════
// State for filters (preserved across re-renders)
window._uaFilters = window._uaFilters || { sub:'', source:'', activity:'', registered:'', search:'', sort:'last_seen' };

window.loadUsersAnalytics = async function(page=1) {
    const { sb } = window.A;
    const PAGE_SIZE = 30;
    const f = window._uaFilters;
    const NOW = Date.now();
    const DAY = 86400000;

    // Render skeleton (preserves filter values via window._uaFilters)
    $c().innerHTML = `
    <!-- KPIs bar -->
    <div id="uaKpis" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px">
        <div class="kpi blue" style="cursor:pointer" onclick="uaQuick('','')" title="عرض كل الأعضاء"><div class="kpi-label">إجمالي الأعضاء</div><div class="kpi-val" id="uaKpiTotal">—</div><div class="kpi-sub" id="uaKpiTotalSub">—</div></div>
        <div class="kpi green" style="cursor:pointer" onclick="uaQuick('','week')" title="عرض من دخل آخر 7 أيام"><div class="kpi-label">دخلوا آخر 7 أيام</div><div class="kpi-val" id="uaKpiWeek">—</div><div class="kpi-sub" id="uaKpiWeekSub">—</div></div>
        <div class="kpi gold" style="cursor:pointer" onclick="uaQuick('active','')" title="عرض أصحاب الاشتراكات السارية"><div class="kpi-label">اشتراكات سارية</div><div class="kpi-val" id="uaKpiActive">—</div><div class="kpi-sub" id="uaKpiActiveSub">—</div></div>
        <div class="kpi red" style="cursor:pointer" onclick="uaQuick('','dormant')" title="عرض الخامدين"><div class="kpi-label">خامدون</div><div class="kpi-val" id="uaKpiDormant">—</div><div class="kpi-sub" id="uaKpiDormantSub">لم يدخلوا منذ أكثر من 30 يوماً</div></div>
    </div>

    <!-- Filter bar — autocomplete=off + selected on default option to prevent browser caching -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
        <div class="search-box" style="flex:1;min-width:220px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="search" id="uaSearch" autocomplete="off" placeholder="ابحث بالاسم / الإيميل / الجوال" value="${esc(f.search||'')}" oninput="uaSearchDebounce()"></div>
        <select class="form-select" id="uaFilterSub" style="width:auto" autocomplete="off" onchange="uaApplyFilter()" title="نوع الاشتراك">
            <option value="" ${!f.sub?'selected':''}>كل الاشتراكات</option>
            <option value="active" ${f.sub==='active'?'selected':''}>مشترك نشط</option>
            <option value="free" ${f.sub==='free'?'selected':''}>مجاني فقط</option>
            <option value="monthly" ${f.sub==='monthly'?'selected':''}>شهري</option>
            <option value="quarterly" ${f.sub==='quarterly'?'selected':''}>ربع سنوي</option>
            <option value="yearly" ${f.sub==='yearly'?'selected':''}>سنوي</option>
            <option value="expired" ${f.sub==='expired'?'selected':''}>اشتراك منتهي</option>
        </select>
        <select class="form-select" id="uaFilterSource" style="width:auto" autocomplete="off" onchange="uaApplyFilter()" title="مصدر الاشتراك">
            <option value="" ${!f.source?'selected':''}>كل المصادر</option>
            <option value="myfatoorah" ${f.source==='myfatoorah'?'selected':''}>MyFatoorah</option>
            <option value="apple_iap" ${f.source==='apple_iap'?'selected':''}>Apple IAP</option>
            <option value="google_play" ${f.source==='google_play'?'selected':''}>Google Play</option>
            <option value="admin" ${f.source==='admin'?'selected':''}>منحة إدارية</option>
            <option value="coupon_free" ${f.source==='coupon_free'?'selected':''}>كوبون مجاني</option>
            <option value="coupon_discount" ${f.source==='coupon_discount'?'selected':''}>كوبون خصم</option>
        </select>
        <select class="form-select" id="uaFilterActivity" style="width:auto" autocomplete="off" onchange="uaApplyFilter()" title="حالة النشاط">
            <option value="" ${!f.activity?'selected':''}>كل الحالات</option>
            <option value="online" ${f.activity==='online'?'selected':''}>متصل الآن</option>
            <option value="week" ${f.activity==='week'?'selected':''}>دخل آخر 7 أيام</option>
            <option value="month" ${f.activity==='month'?'selected':''}>دخل آخر 30 يوماً</option>
            <option value="dormant" ${f.activity==='dormant'?'selected':''}>خامد (أكثر من 30 يوماً)</option>
        </select>
        <select class="form-select" id="uaFilterRegistered" style="width:auto" autocomplete="off" onchange="uaApplyFilter()" title="تاريخ الانضمام">
            <option value="" ${!f.registered?'selected':''}>كل التواريخ</option>
            <option value="today" ${f.registered==='today'?'selected':''}>اليوم</option>
            <option value="week" ${f.registered==='week'?'selected':''}>آخر 7 أيام</option>
            <option value="month" ${f.registered==='month'?'selected':''}>آخر 30 يوم</option>
        </select>
        <select class="form-select" id="uaSort" style="width:auto" autocomplete="off" onchange="uaApplyFilter()">
            <option value="last_seen" ${f.sort==='last_seen'||!f.sort?'selected':''}>الأحدث نشاطاً</option>
            <option value="new" ${f.sort==='new'?'selected':''}>الأحدث تسجيلاً</option>
            <option value="xp" ${f.sort==='xp'?'selected':''}>الأكثر XP</option>
            <option value="dormant" ${f.sort==='dormant'?'selected':''}>الأقدم نشاطاً</option>
        </select>
        <button class="btn btn-ghost" onclick="exportUsers()" title="تصدير الفلتر الحالي"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>CSV</button>
        <button class="btn btn-ghost" onclick="uaClearFilters()" title="مسح كل الفلاتر" style="${(!f.sub&&!f.source&&!f.activity&&!f.registered&&!f.search)?'display:none':''}"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>مسح الفلاتر</button>
    </div>
    <div class="card"><div class="tbl-wrap" id="uaTable"><div class="loader">...</div></div></div>`;

    // ── Build query with filters ──
    try {
        let q = sb.from('profiles').select('id,full_name,email,phone,role,subscription_type,subscription_end,subscription_source,used_coupon,xp,avatar_emoji,created_at,last_seen_at', { count:'exact' });

        // Subscription filter
        const nowIso = new Date().toISOString();
        if (f.sub === 'active') q = q.in('subscription_type', ['monthly','quarterly','yearly']).gt('subscription_end', nowIso);
        else if (f.sub === 'free') q = q.or('subscription_type.eq.free,subscription_type.is.null');
        else if (f.sub === 'monthly') q = q.eq('subscription_type','monthly').gt('subscription_end', nowIso);
        else if (f.sub === 'quarterly') q = q.eq('subscription_type','quarterly').gt('subscription_end', nowIso);
        else if (f.sub === 'yearly') q = q.eq('subscription_type','yearly').gt('subscription_end', nowIso);
        else if (f.sub === 'expired') q = q.in('subscription_type', ['monthly','quarterly','yearly']).lt('subscription_end', nowIso);

        // Source filter (DB-side for direct sources only; coupon filtering happens after fetch)
        if (f.source === 'myfatoorah') q = q.eq('subscription_source','myfatoorah');
        else if (f.source === 'apple_iap') q = q.eq('subscription_source','apple_iap');
        else if (f.source === 'google_play') q = q.eq('subscription_source','google_play');
        else if (f.source === 'admin') q = q.eq('subscription_source','admin');
        // 'referral' option handled post-fetch via referrals table (see below)

        // Activity filter
        if (f.activity === 'online') q = q.gt('last_seen_at', new Date(NOW - 5*60000).toISOString());
        else if (f.activity === 'week') q = q.gt('last_seen_at', new Date(NOW - 7*DAY).toISOString());
        else if (f.activity === 'month') q = q.gt('last_seen_at', new Date(NOW - 30*DAY).toISOString());
        else if (f.activity === 'dormant') q = q.or('last_seen_at.is.null,last_seen_at.lt.'+new Date(NOW - 30*DAY).toISOString());

        // Registration date filter
        if (f.registered === 'today') q = q.gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
        else if (f.registered === 'week') q = q.gte('created_at', new Date(NOW - 7*DAY).toISOString());
        else if (f.registered === 'month') q = q.gte('created_at', new Date(NOW - 30*DAY).toISOString());

        // Search
        if (f.search) {
            const term = f.search.replace(/'/g, "''");
            q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
        }

        // Sort
        if (f.sort === 'new') q = q.order('created_at',{ascending:false});
        else if (f.sort === 'dormant') q = q.order('last_seen_at',{ascending:true,nullsFirst:true});
        else if (f.sort === 'xp') q = q.order('xp',{ascending:false,nullsFirst:false});
        else q = q.order('last_seen_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});

        const { data, count } = await q.range((page-1)*PAGE_SIZE, page*PAGE_SIZE-1);

        // Load KPIs in parallel (non-blocking)
        loadUaKpis();

        // Attempts counts + آخر تدريب لكل مستخدم
        const uids = (data||[]).map(u=>u.id);
        const [attsRes, redRes, payRes, profExtra] = await Promise.all([
            sb.from('attempts').select('user_id,is_correct,created_at').in('user_id', uids),
            sb.from('coupon_redemptions').select('user_id, coupon_code, discount_type, discount_value, final_amount, status, created_at').in('user_id', uids).eq('status','success').order('created_at',{ascending:false}),
            sb.from('payments').select('user_id, amount, coupon_code, status, created_at').in('user_id', uids).eq('status','paid').order('created_at',{ascending:false}),
            sb.from('profiles').select('id, subscription_source').in('id', uids)
        ]);
        const stats = {};
        (attsRes.data||[]).forEach(a => {
            if (!stats[a.user_id]) stats[a.user_id] = { t:0, c:0, last: null };
            stats[a.user_id].t++;
            if (a.is_correct) stats[a.user_id].c++;
            if (!stats[a.user_id].last || a.created_at > stats[a.user_id].last) stats[a.user_id].last = a.created_at;
        });
        const couponMap = {};
        (redRes.data || []).forEach(r => {
            if (!couponMap[r.user_id]) {
                const isFree = r.discount_type === 'free' || (r.discount_type === 'percentage' && Number(r.discount_value) >= 100) || Number(r.final_amount) <= 0;
                couponMap[r.user_id] = { code: r.coupon_code, isFree, type: r.discount_type, value: r.discount_value };
            }
        });
        const paymentMap = {};
        (payRes.data || []).forEach(p => { if (!paymentMap[p.user_id]) paymentMap[p.user_id] = p; });
        const extraMap = {};
        (profExtra.data || []).forEach(e => { extraMap[e.id] = e; });

        // Apply coupon-based source filters AFTER fetch (DB-side requires JOIN)
        let filteredData = data || [];
        if (f.source === 'coupon_free' || f.source === 'coupon_discount') {
            filteredData = filteredData.filter(u => {
                const cp = couponMap[u.id];
                if (!cp) return false;
                return f.source === 'coupon_free' ? cp.isFree : !cp.isFree;
            });
        }

        const tbl = document.getElementById('uaTable');
        if (!filteredData || filteredData.length === 0) { tbl.innerHTML = '<div class="empty-d" style="padding:30px;text-align:center"><div style="font-size:13px">لا توجد نتائج</div><div style="font-size:11px;color:var(--i4);margin-top:6px">جرّب تخفيف الفلاتر</div></div>'; return; }

        // حالة النشاط: آخر دخول أو آخر تدريب (الأحدث منهما) — الحسابات القديمة قد لا تملك last_seen_at
        const lifecycleBadge = (u) => {
            const st = stats[u.id];
            const lastSeen = Math.max(u.last_seen_at ? new Date(u.last_seen_at).getTime() : 0, st && st.last ? new Date(st.last).getTime() : 0);
            const elapsed = NOW - lastSeen;
            const pill = (txt, color, bg, title) => '<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:'+color+';background:'+bg+';padding:3px 8px;border-radius:8px;white-space:nowrap" title="'+(title||'')+'"><span style="width:6px;height:6px;border-radius:50%;background:'+color+'"></span>'+txt+'</span>';
            if (lastSeen && elapsed < 5*60000) return pill('متصل الآن', 'var(--suc)', 'var(--ss)');
            if (lastSeen && elapsed < 7*DAY) {
                const hrs = Math.floor(elapsed / 3600000);
                const lbl = hrs < 1 ? 'قبل دقائق' : hrs < 24 ? 'قبل '+hrs+' ساعة' : 'قبل '+Math.floor(hrs/24)+' يوم';
                return pill('نشط · '+lbl, 'var(--suc)', 'var(--ss)');
            }
            if (lastSeen && elapsed < 30*DAY) return pill('هذا الشهر', 'var(--acc)', 'var(--as)', 'آخر نشاط قبل '+Math.floor(elapsed/DAY)+' يوماً');
            if (!lastSeen) return pill('لم يدخل بعد', 'var(--i4)', 'var(--s2)', 'سجّل ولم يفتح حسابه');
            return pill('خامد', 'var(--i3)', 'var(--s2)', 'آخر نشاط قبل '+Math.floor(elapsed/DAY)+' يوماً');
        };

        const sourceBadge = (u) => {
            const ex = extraMap[u.id] || {};
            const src = ex.subscription_source || '';
            const cp = couponMap[u.id];
            const lastPay = paymentMap[u.id];
            const profCoupon = u.used_coupon || '';
            const isPaid = u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date();
            if (!isPaid) return '<span class="td-muted">—</span>';
            const pill = (txt, color, bg, title='') => `<span title="${esc(title)}" style="font-size:10px;font-weight:700;color:${color};background:${bg};padding:2px 8px;border-radius:8px;white-space:nowrap">${esc(txt)}</span>`;
            if (cp && cp.isFree) return pill('مجاني · '+cp.code, '#9333EA', '#F3E8FF', 'كوبون مجاني: '+cp.code);
            if (cp && !cp.isFree) {
                const v = cp.type === 'percentage' ? cp.value+'%' : cp.value+' ر.س';
                return pill('خصم · '+cp.code, 'var(--acc)', 'var(--as)', 'كوبون خصم '+cp.code+' (-'+v+')');
            }
            if (lastPay && lastPay.coupon_code) {
                if (Number(lastPay.amount) === 0) return pill('مجاني · '+lastPay.coupon_code, '#9333EA', '#F3E8FF', 'كوبون مجاني (من payments): '+lastPay.coupon_code);
                return pill('خصم · '+lastPay.coupon_code, 'var(--acc)', 'var(--as)', 'كوبون خصم (من payments): '+lastPay.coupon_code);
            }
            if (profCoupon) return pill('كوبون · '+profCoupon, 'var(--acc)', 'var(--as)', 'profiles.used_coupon');
            if (src === 'apple_iap')   return pill('Apple IAP', '#1A1D2E', '#E5E7EB');
            if (src === 'google_play') return pill('Google Play', '#1A1D2E', '#E5E7EB');
            if (src === 'admin')       return pill('منحة', 'var(--pri)', 'var(--ps)', 'منحة إدارية');
            if (src === 'myfatoorah' || (lastPay && Number(lastPay.amount) > 0)) return pill('مدفوع', 'var(--suc)', 'var(--ss)');
            return pill('منحة (يدوي)', 'var(--pri)', 'var(--ps)', 'بدون payment/coupon — أُضيف يدوياً');
        };

        tbl.innerHTML = '<table><thead><tr>'
            + '<th>العضو</th>'
            + '<th>الحالة</th>'
            + '<th>الاشتراك</th>'
            + '<th>كيف اشترك</th>'
            + '<th>المحلولة</th>'
            + '<th>نسبة الصح</th>'
            + '<th>آخر دخول</th>'
            + '<th>آخر تدريب</th>'
            + '<th>التسجيل</th>'
            + '<th></th>'
            + '</tr></thead><tbody>' +
            filteredData.map(u => {
                const st = stats[u.id] || {t:0,c:0,last:null};
                const acc = st.t > 0 ? Math.round(st.c/st.t*100) : 0;
                const subActive = u.subscription_type && u.subscription_type !== 'free' && u.subscription_end && new Date(u.subscription_end) > new Date();
                const subLabel = subActive
                    ? (u.subscription_type==='yearly'?'سنوي':u.subscription_type==='quarterly'?'ربع سنوي':'شهري')
                    : 'مجاني';
                const isTeam = u.role === 'admin' || u.role === 'staff';
                const sub = isTeam
                    ? '<span class="status-pill" style="background:var(--ps);color:var(--pri)">فريق العمل</span>'
                    : subActive
                    ? '<span class="status-pill active">'+subLabel+'</span>'
                    : '<span class="status-pill free">'+subLabel+'</span>';
                return `<tr>
                    <td><div style="display:flex;align-items:center;gap:10px"><div class="tbl-avatar">${(window.buildAvatarHTML ? window.buildAvatarHTML(u.avatar_emoji, u.full_name, 36) : esc((u.full_name||'?').charAt(0)))}</div><div><div class="td-name">${esc(u.full_name||'—')}</div><div style="font-size:10.5px;color:var(--i4);direction:ltr;text-align:right;margin-top:2px">${esc(u.email||'')}</div></div></div></td>
                    <td>${lifecycleBadge(u)}</td>
                    <td>${sub}</td>
                    <td>${isTeam ? '<span class="td-muted">—</span>' : sourceBadge(u)}</td>
                    <td><b>${fmt(st.t)}</b></td>
                    <td style="min-width:90px"><div style="display:flex;align-items:center;gap:6px"><div style="width:40px;height:4px;background:var(--s2);border-radius:2px;overflow:hidden"><div style="width:${acc}%;height:100%;background:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'}"></div></div><b style="color:${acc>=70?'var(--suc)':acc>=50?'var(--acc)':'var(--dng)'};font-size:11px">${acc}%</b></div></td>
                    <td class="td-muted">${fmtDate(u.last_seen_at)}</td>
                    <td class="td-muted">${fmtDate(st.last)}</td>
                    <td class="td-muted">${fmtDate(u.created_at)}</td>
                    <td><button class="q-act-btn" title="تعديل" onclick="viewUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
                </tr>`;
            }).join('') + '</tbody></table>';

        const totalPages = Math.ceil((count||0)/PAGE_SIZE);
        if (totalPages > 1) {
            tbl.innerHTML += '<div class="pagination" style="padding:14px"><div class="pg-info">'+fmt(count)+' عضو · صفحة '+page+'/'+totalPages+'</div><div class="pg-btns"><button class="pg-btn" '+(page<=1?'disabled':'')+' onclick="loadUsersAnalytics('+(page-1)+')"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button><button class="pg-btn" '+(page>=totalPages?'disabled':'')+' onclick="loadUsersAnalytics('+(page+1)+')"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div></div>';
        }
    } catch(e) { console.error(e); showToast('خطأ: '+(e.message||''),'err'); }
};

// Apply current filter values to state and reload
window.uaApplyFilter = function() {
    window._uaFilters.sub = document.getElementById('uaFilterSub')?.value || '';
    window._uaFilters.source = document.getElementById('uaFilterSource')?.value || '';
    window._uaFilters.activity = document.getElementById('uaFilterActivity')?.value || '';
    window._uaFilters.registered = document.getElementById('uaFilterRegistered')?.value || '';
    window._uaFilters.sort = document.getElementById('uaSort')?.value || 'last_seen';
    loadUsersAnalytics(1);
};

// Clear all filters (one-click reset)
window.uaClearFilters = function() {
    window._uaFilters = { sub:'', source:'', activity:'', registered:'', search:'', sort:'last_seen' };
    loadUsersAnalytics(1);
};

// Load KPI cards in parallel (non-blocking)
window.loadUaKpis = async function() {
    const { sb } = window.A;
    const NOW = Date.now();
    const DAY = 86400000;
    const nowIso = new Date().toISOString();
    const d7 = new Date(NOW - 7*DAY).toISOString();
    const d30 = new Date(NOW - 30*DAY).toISOString();
    const cnt = () => sb.from('profiles').select('id',{count:'exact',head:true});
    const subs = q => q.in('subscription_type',['monthly','quarterly','yearly']).gt('subscription_end', nowIso);
    try {
        const [total, new30, week, month, active, activeSeen, dormant] = await Promise.all([
            cnt(),
            cnt().gte('created_at', d30),
            cnt().gt('last_seen_at', d7),
            cnt().gt('last_seen_at', d30),
            subs(cnt()),
            subs(cnt()).gt('last_seen_at', d30),
            cnt().or('last_seen_at.is.null,last_seen_at.lt.'+d30)
        ]);
        const totalCount = total.count || 0;
        const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setT('uaKpiTotal', fmt(totalCount));
        setT('uaKpiTotalSub', '+'+fmt(new30.count||0)+' تسجيلاً آخر 30 يوماً');
        setT('uaKpiWeek', fmt(week.count||0));
        setT('uaKpiWeekSub', 'وآخر 30 يوماً: '+fmt(month.count||0));
        setT('uaKpiActive', fmt(active.count||0));
        setT('uaKpiActiveSub', 'دخل منهم آخر 30 يوماً: '+fmt(activeSeen.count||0));
        setT('uaKpiDormant', fmt(dormant.count||0));
        setT('uaKpiDormantSub', (totalCount ? Math.round((dormant.count||0)/totalCount*100) : 0)+'% من الأعضاء · لم يدخلوا منذ 30 يوماً');
    } catch(e) { console.error('loadUaKpis', e); }
};

// بطاقات المؤشرات تعمل كفلاتر سريعة
window.uaQuick = function(sub, activity) {
    window._uaFilters = { sub: sub, source:'', activity: activity, registered:'', search:'', sort: activity === 'dormant' ? 'dormant' : 'last_seen' };
    loadUsersAnalytics(1);
};

let uaTimer;
window.uaSearchDebounce = function() {
    clearTimeout(uaTimer);
    window._uaFilters.search = document.getElementById('uaSearch')?.value || '';
    uaTimer = setTimeout(()=>loadUsersAnalytics(1), 400);
};

// ═══════════════════════════════════════════════════════
// 14. STAFF — CRUD + صلاحيات + نشاط
// ═══════════════════════════════════════════════════════
const PERMISSION_SECTIONS = [
    { key:'questions', label:'الأسئلة والمراجعة', actions:['view','edit','delete'] },
    { key:'users',     label:'الأعضاء',           actions:['view','edit'] },
    { key:'finance',   label:'المالية والفواتير', actions:['view','edit'] },
    { key:'banners',   label:'البنرات والصفحات',  actions:['view','edit'] },
    { key:'tips',      label:'النصائح اليومية',   actions:['view','edit'] },
    { key:'reports',   label:'البلاغات والتسريبات', actions:['view','edit'] },
    { key:'analytics', label:'التحليلات والزوار', actions:['view'] },
    { key:'settings',  label:'إعدادات الموقع',    actions:['view','edit'] }
];
const ACTION_LABELS = { view:'عرض', edit:'تعديل', delete:'حذف' };

function defaultPermissions(role) {
    const perms = {};
    PERMISSION_SECTIONS.forEach(s => {
        perms[s.key] = {};
        s.actions.forEach(a => {
            perms[s.key][a] = role === 'admin';
        });
    });
    return perms;
}

window.loadStaff = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <style>
    .staff-toolbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
    .staff-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
    .staff-card{background:var(--sf);border:1px solid var(--ln);border-radius:14px;padding:18px;position:relative;overflow:hidden}
    .staff-card::before{content:"";position:absolute;top:0;right:0;left:0;height:3px;background:var(--role-clr)}
    .staff-card[data-role="admin"]{--role-clr:linear-gradient(90deg,#F59E0B,#EF4444)}
    .staff-card[data-role="staff"]{--role-clr:linear-gradient(90deg,#6D5DF6,#22C55E)}
    .staff-av{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:18px;margin-bottom:10px}
    .staff-name{font-size:15px;font-weight:700;margin-bottom:2px}
    .staff-role{font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;display:inline-block;margin-bottom:10px}
    .staff-role.admin{background:rgba(245,158,11,.12);color:#B45309}
    .staff-role.staff{background:rgba(109,93,246,.12);color:#5B4DD4}
    .staff-email{font-size:11px;color:var(--i3);margin-bottom:12px;word-break:break-all}
    .staff-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
    .staff-stat{background:var(--s2);padding:8px;border-radius:8px;text-align:center}
    .staff-stat .v{font-size:15px;font-weight:800;color:var(--pri)}
    .staff-stat .l{font-size:9px;color:var(--i3);margin-top:2px}
    .staff-actions{display:flex;gap:6px}
    .staff-actions .btn{flex:1;font-size:11px;padding:6px 8px}
    </style>

    <div class="staff-toolbar">
        <div style="font-size:14px;font-weight:700">الموظفون والصلاحيات</div>
        <button class="btn btn-pri" onclick="openAddStaffModal()">
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            إضافة موظف
        </button>
    </div>
    <div id="staffGrid" class="staff-grid"><div class="loader">جاري التحميل...</div></div>`;

    try {
        // 1. جلب الموظفين والمدراء
        const { data: staff } = await sb.from('profiles')
            .select('id,full_name,email,role,avatar_emoji,created_at,last_seen_at')
            .in('role', ['admin','staff']).order('full_name');

        // 2. جلب staff_stats
        const uids = (staff||[]).map(s => s.id);
        let statsMap = {};
        if (uids.length > 0) {
            try {
                const { data: stats } = await sb.from('staff_stats').select('*').in('user_id', uids);
                (stats||[]).forEach(s => { statsMap[s.user_id] = s; });
            } catch(e){}
        }

        // 3. عدد الأسئلة المضافة (إن كان الجدول يدعم created_by)
        let questionsMap = {};
        try {
            const { data: qs } = await sb.from('questions').select('id,created_by').in('created_by', uids);
            (qs||[]).forEach(q => { questionsMap[q.created_by] = (questionsMap[q.created_by]||0) + 1; });
        } catch(e){}

        const grid = document.getElementById('staffGrid');
        if (!staff || staff.length === 0) {
            grid.innerHTML = '<div class="empty"><div class="empty-ic">👤</div><div class="empty-t">لا موظفين بعد</div><div class="empty-d">اضغط "إضافة موظف" لبدء فريقك</div></div>';
            return;
        }

        const colors = ['#6D5DF6','#22C55E','#FF8A3D','#EF4444','#F59E0B','#0F766E','#3B5BDB'];
        grid.innerHTML = staff.map((s, i) => {
            const st = statsMap[s.id] || {};
            const qCount = questionsMap[s.id] || st.questions_added || 0;
            const tickets = st.tickets_resolved || 0;
            const lastSeen = s.last_seen_at ? fmtDate(s.last_seen_at) : '—';
            const roleLabel = s.role === 'admin' ? 'المدير العام' : 'موظف';
            return `
            <div class="staff-card" data-role="${esc(s.role)}">
                <div class="staff-av" style="background:${colors[i%colors.length]}">${(window.buildAvatarHTML ? window.buildAvatarHTML(s.avatar_emoji, s.full_name, 48) : esc((s.full_name||'?').charAt(0)))}</div>
                <div class="staff-name">${esc(s.full_name || '—')}</div>
                <span class="staff-role ${s.role}">${roleLabel}</span>
                <div class="staff-email">${esc(s.email || '')}</div>
                <div class="staff-stats">
                    <div class="staff-stat"><div class="v">${fmt(qCount)}</div><div class="l">أسئلة مُضافة</div></div>
                    <div class="staff-stat"><div class="v">${fmt(tickets)}</div><div class="l">بلاغات مُعالجة</div></div>
                </div>
                <div style="font-size:10px;color:var(--i4);margin-bottom:10px">آخر دخول: ${lastSeen}</div>
                <div class="staff-actions">
                    <button class="btn btn-pri" onclick="editStaffPermissions('${s.id}')">الصلاحيات</button>
                    <button class="btn btn-ghost" onclick="viewStaffActivity('${s.id}')">النشاط</button>
                    ${s.role !== 'admin' ? `<button class="btn btn-ghost" style="color:var(--dng)" onclick="removeStaff('${s.id}','${esc((s.full_name||'').replace(/'/g,"\\'"))}')">إزالة</button>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'err');
    }
};

// ── إضافة موظف ──
window.openAddStaffModal = function() {
    const body = `
    <div class="form-grid">
        <div class="form-field full">
            <label class="form-label">ابحث بالبريد الإلكتروني أو الاسم *</label>
            <input class="form-input" id="addStaffSearch" oninput="searchStaffCandidates()" placeholder="أدخل بريد/اسم مستخدم موجود">
            <div style="font-size:10px;color:var(--i3);margin-top:4px">يجب أن يكون المستخدم مسجّل في التطبيق</div>
        </div>
        <div class="form-field full" id="candidatesWrap" style="display:none">
            <label class="form-label">النتائج — اختر المستخدم</label>
            <div id="candidatesList" style="max-height:200px;overflow-y:auto;border:1px solid var(--ln);border-radius:8px"></div>
        </div>
        <div class="form-field full" id="addStaffRoleWrap" style="display:none">
            <label class="form-label">الدور</label>
            <select class="form-select" id="addStaffRole">
                <option value="staff">موظف (صلاحيات مخصّصة)</option>
                <option value="admin">مدير عام (صلاحيات كاملة)</option>
            </select>
        </div>
    </div>
    <input type="hidden" id="addStaffSelectedId" value="">
    `;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" id="addStaffConfirm" onclick="confirmAddStaff()" disabled>إضافة</button>
    `;
    openModal('إضافة موظف جديد', body, foot);
};

let staffSearchTimer;
window.searchStaffCandidates = function() {
    clearTimeout(staffSearchTimer);
    staffSearchTimer = setTimeout(async () => {
        const { sb } = window.A;
        const q = document.getElementById('addStaffSearch').value.trim();
        const wrap = document.getElementById('candidatesWrap');
        const list = document.getElementById('candidatesList');
        if (q.length < 2) { wrap.style.display = 'none'; return; }
        try {
            const { data } = await sb.from('profiles')
                .select('id,full_name,email,role')
                .or('full_name.ilike.%'+q+'%,email.ilike.%'+q+'%')
                .limit(10);
            const users = (data||[]).filter(u => u.role !== 'admin' && u.role !== 'staff');
            if (users.length === 0) {
                list.innerHTML = '<div style="padding:14px;text-align:center;font-size:12px;color:var(--i3)">لا نتائج — هل الحساب موظف بالفعل؟</div>';
            } else {
                list.innerHTML = users.map(u => `
                    <div onclick="selectCandidate('${u.id}','${esc((u.full_name||'').replace(/'/g,"\\'"))}','${esc((u.email||'').replace(/'/g,"\\'"))}')" style="padding:10px 12px;border-bottom:1px solid var(--ln);cursor:pointer;transition:background .15s" onmouseover="this.style.background='var(--ps)'" onmouseout="this.style.background=''">
                        <div style="font-size:13px;font-weight:600">${esc(u.full_name||'—')}</div>
                        <div style="font-size:11px;color:var(--i3)">${esc(u.email||'')}</div>
                    </div>`).join('');
            }
            wrap.style.display = '';
        } catch(e) {}
    }, 350);
};

window.selectCandidate = function(id, name, email) {
    document.getElementById('addStaffSelectedId').value = id;
    document.getElementById('addStaffSearch').value = name + ' — ' + email;
    document.getElementById('candidatesWrap').style.display = 'none';
    document.getElementById('addStaffRoleWrap').style.display = '';
    document.getElementById('addStaffConfirm').disabled = false;
};

window.confirmAddStaff = async function() {
    const { sb } = window.A;
    const userId = document.getElementById('addStaffSelectedId').value;
    const role = document.getElementById('addStaffRole').value;
    if (!userId) return;
    try {
        // 1. تحديث role في profiles
        const { error: e1 } = await sb.from('profiles').update({ role }).eq('id', userId);
        if (e1) throw e1;
        // 2. إنشاء/تحديث staff_stats مع الصلاحيات الافتراضية
        const perms = defaultPermissions(role);
        try {
            await sb.from('staff_stats').upsert({
                user_id: userId,
                display_role: role === 'admin' ? 'المدير العام' : 'موظف',
                custom_permissions: perms
            }, { onConflict: 'user_id' });
        } catch(e){ /* جدول قد لا يدعم upsert — لا بأس */ }
        showToast('تمت الإضافة','success');
        closeModal();
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── تعديل صلاحيات موظف ──
window.editStaffPermissions = async function(userId) {
    const { sb } = window.A;
    // جلب البيانات الحالية
    const [{ data: p }, statsRes] = await Promise.all([
        sb.from('profiles').select('id,full_name,email,role').eq('id', userId).single(),
        sb.from('staff_stats').select('*').eq('user_id', userId).maybeSingle()
    ]);
    if (!p) return;
    const existing = (statsRes.data && statsRes.data.custom_permissions) || defaultPermissions(p.role);

    const sectionsHtml = PERMISSION_SECTIONS.map(sec => {
        const cur = existing[sec.key] || {};
        const actionsHtml = sec.actions.map(a => `
            <label style="display:inline-flex;align-items:center;gap:5px;margin-left:12px;font-size:12px;cursor:pointer">
                <input type="checkbox" id="perm_${sec.key}_${a}" ${cur[a]?'checked':''}>
                ${ACTION_LABELS[a]}
            </label>`).join('');
        return `
            <div style="padding:10px 12px;border:1px solid var(--ln);border-radius:10px;margin-bottom:8px">
                <div style="font-size:13px;font-weight:700;margin-bottom:6px">${esc(sec.label)}</div>
                <div>${actionsHtml}</div>
            </div>`;
    }).join('');

    const body = `
    <div style="padding:10px 12px;background:var(--ps);border:1px solid var(--pm);border-radius:10px;margin-bottom:14px;font-size:12px">
        <b>${esc(p.full_name||'—')}</b> &nbsp;·&nbsp; ${esc(p.email||'')} &nbsp;·&nbsp; ${p.role==='admin'?'المدير العام':'موظف'}
    </div>
    <div class="form-field full" style="margin-bottom:10px">
        <label class="form-label">الدور</label>
        <select class="form-select" id="permRole">
            <option value="staff" ${p.role==='staff'?'selected':''}>موظف</option>
            <option value="admin" ${p.role==='admin'?'selected':''}>مدير عام</option>
        </select>
    </div>
    <div style="max-height:380px;overflow-y:auto">${sectionsHtml}</div>
    <input type="hidden" id="permUserId" value="${esc(userId)}">`;
    const foot = `
        <button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
        <button class="btn btn-pri" onclick="savePermissions()">حفظ الصلاحيات</button>
    `;
    openModal('إدارة صلاحيات الموظف', body, foot);
};

window.savePermissions = async function() {
    const { sb } = window.A;
    const userId = document.getElementById('permUserId').value;
    const role = document.getElementById('permRole').value;

    // اجمع الصلاحيات من الصناديق
    const perms = {};
    PERMISSION_SECTIONS.forEach(sec => {
        perms[sec.key] = {};
        sec.actions.forEach(a => {
            const cb = document.getElementById('perm_'+sec.key+'_'+a);
            perms[sec.key][a] = cb ? cb.checked : false;
        });
    });

    try {
        // 1. حدّث الدور في profiles
        await sb.from('profiles').update({ role }).eq('id', userId);
        // 2. حدّث الصلاحيات في staff_stats
        await sb.from('staff_stats').upsert({
            user_id: userId,
            display_role: role === 'admin' ? 'المدير العام' : 'موظف',
            custom_permissions: perms
        }, { onConflict: 'user_id' });
        showToast('حُفظت الصلاحيات','success');
        closeModal();
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── عرض نشاط موظف ──
window.viewStaffActivity = async function(userId) {
    const { sb } = window.A;
    try {
        const [{ data: p }, statsRes] = await Promise.all([
            sb.from('profiles').select('id,full_name,email,role,created_at,last_seen_at').eq('id', userId).single(),
            sb.from('staff_stats').select('*').eq('user_id', userId).maybeSingle()
        ]);
        if (!p) return;
        const st = statsRes.data || {};

        // آخر الأسئلة المضافة
        let recentQs = [];
        try {
            const { data } = await sb.from('questions')
                .select('id,question_text,section,created_at')
                .eq('created_by', userId).order('created_at',{ascending:false}).limit(10);
            recentQs = data || [];
        } catch(e){}

        const qCount = recentQs.length || st.questions_added || 0;
        const lastSeenStr = p.last_seen_at ? fmtDate(p.last_seen_at, true) : '—';
        const joinedStr = fmtDate(p.created_at);

        const qsHtml = recentQs.length > 0 ? recentQs.map(q => `
            <div style="padding:10px 12px;border-bottom:1px solid var(--ln);font-size:12px">
                <div style="font-weight:600;color:var(--ink)">${esc((q.question_text||'').substring(0,80))}${(q.question_text||'').length>80?'...':''}</div>
                <div style="font-size:10px;color:var(--i4);margin-top:3px">${esc(q.section||'—')} · ${fmtDate(q.created_at)}</div>
            </div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--i3);font-size:12px">لم يُضَف أي سؤال بعد</div>';

        const body = `
        <div style="padding:14px;background:var(--ps);border-radius:10px;margin-bottom:14px">
            <div style="font-size:15px;font-weight:700;margin-bottom:4px">${esc(p.full_name||'—')}</div>
            <div style="font-size:11px;color:var(--i3)">${esc(p.email||'')} · ${p.role==='admin'?'المدير العام':'موظف'}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--pri)">${fmt(qCount)}</div>
                <div style="font-size:10px;color:var(--i3)">أسئلة مضافة</div>
            </div>
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--suc)">${fmt(st.tickets_resolved||0)}</div>
                <div style="font-size:10px;color:var(--i3)">بلاغات مُعالجة</div>
            </div>
            <div style="padding:12px;background:var(--s2);border-radius:10px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:var(--acc)">${(Number(st.rating||0)).toFixed(1)}</div>
                <div style="font-size:10px;color:var(--i3)">تقييم الجودة</div>
            </div>
        </div>
        <div style="font-size:11px;color:var(--i3);margin-bottom:4px">انضم في: ${joinedStr}</div>
        <div style="font-size:11px;color:var(--i3);margin-bottom:14px">آخر دخول: ${lastSeenStr}</div>
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">آخر الأسئلة المضافة</div>
        <div style="border:1px solid var(--ln);border-radius:10px;max-height:260px;overflow-y:auto">${qsHtml}</div>
        `;
        openModal('نشاط ' + (p.full_name || 'الموظف'), body, '<button class="btn btn-ghost" onclick="closeModal()">إغلاق</button>');
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ── إزالة موظف (ترجعه لمستخدم عادي) ──
window.removeStaff = async function(userId, name) {
    if (!confirm('هل تريد إزالة "' + name + '" من الموظفين؟ سيعود مستخدماً عادياً.')) return;
    const { sb } = window.A;
    try {
        await sb.from('profiles').update({ role: 'user' }).eq('id', userId);
        showToast('تمت الإزالة','success');
        loadStaff();
    } catch(e) {
        showToast('خطأ: '+(e.message||''),'error');
    }
};

// ═══════════════════════════════════════════════════════
// 15. INCOMING REPORTS
// ═══════════════════════════════════════════════════════
window.loadIncomingReports = async function() {
    const { sb } = window.A;
    $c().innerHTML = '<div id="irepList"><div class="loader">...</div></div>';
    try {
        const { data, count } = await sb.from('reports')
            .select('id,reason,status,created_at,questions(id,question_text,section),profiles(full_name)',{count:'exact'})
            .order('created_at',{ascending:false}).limit(100);
        const list = document.getElementById('irepList');
        if (!data || data.length === 0) { list.innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا بلاغات</div></div>'; return; }
        const pending = data.filter(r => r.status === 'pending').length;
        list.innerHTML = '<div style="font-size:13px;margin-bottom:14px;color:var(--i2)"><b style="color:var(--dng)">'+pending+'</b> معلّق من إجمالي <b>'+data.length+'</b></div>' +
        '<div class="card"><div class="tbl-wrap"><table><thead><tr><th>المبلّغ</th><th>السؤال</th><th>السبب</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead><tbody>' +
        data.map(r => {
            const statusMap = {pending:'<span class="status-pill pending">معلق</span>',resolved:'<span class="status-pill active">تم الحل</span>',rejected:'<span class="status-pill expired">مرفوض</span>'};
            return `<tr>
                <td class="td-name">${esc(r.profiles?.full_name||'—')}</td>
                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis"><span class="q-tag" style="margin-left:6px">${sectionTag(r.questions?.section)}</span>${esc((r.questions?.question_text||'—').substring(0,60))}…</td>
                <td style="color:var(--dng);font-weight:600">${esc(r.reason)}</td>
                <td>${statusMap[r.status]||r.status}</td>
                <td class="td-muted">${fmtDate(r.created_at)}</td>
                <td>${r.status==='pending'?'<button class="btn btn-ghost" onclick="switchToReview()">مراجعة</button>':'—'}</td>
            </tr>`;
        }).join('') + '</tbody></table></div></div>';
    } catch(e) { showToast('خطأ','err'); }
};

window.switchToReview = function() { document.querySelector('[data-page="review"]')?.click(); };

// ═══════════════════════════════════════════════════════
// 16. VISITORS — صفحة الزوار (إعادة بناء 2026-11-13)
//   تجاوب ثلاثة أسئلة بالترتيب: كم زائر حقيقي؟ من أين جاء؟ ماذا فعل؟
//   تستبعد فريق العمل والروبوتات من كل الأرقام.
// ═══════════════════════════════════════════════════════
window._visState = window._visState || { range: 'today', refreshTimer: null };

const VIS_DAY = 86400000;
const VIS_PAGE_LABELS = {
    '/':'الرئيسية','/dashboard':'رئيسية العضو','/training':'التدريب','/leaks':'التسريبات',
    '/practice':'حلّ الأسئلة','/profile':'الملف الشخصي','/reports':'التقارير','/pricing':'صفحة الأسعار',
    '/login':'تسجيل الدخول','/register':'صفحة التسجيل','/demo':'التجربة المجانية',
    '/leaks-preview':'عينة التجميعات','/tahsili':'صفحة التحصيلي','/tahsili-top-400':'حملة التحصيلي',
    '/referrals':'الإحالات','/payment-return':'العودة من الدفع','/payment-callback':'العودة من الدفع',
    '/mock-exam':'الاختبار المحاكي','/about':'عن المنصة','/terms':'الشروط','/privacy':'الخصوصية',
    '/contact':'تواصل معنا','/subscription-policy':'سياسة الاشتراك','/invoice':'فاتورة',
    '/onboarding':'اختبار تحديد المستوى','/english-placement':'اختبار الإنجليزي','/select-section':'اختيار القسم',
    '/dl':'تحميل التطبيق','/question':'سؤال مشارك','/period1':'باقة الفترة الأولى'
};
function visPageLabel(path) {
    let p = (path || '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    p = p.replace(/^\/v2\//, '/').replace(/-v2$/, '');
    if (p === '/index' || p === '/home-v3' || p === '/welcome') return 'الرئيسية';
    if (p.indexOf('/brand-preview') === 0) return 'معاينة الهوية';
    if (p.indexOf('/r/') === 0 || p.indexOf('/invite') === 0) return 'دعوة صديق';
    if (p.indexOf('/p/') === 0) return 'رابط شريك';
    return VIS_PAGE_LABELS[p] || p;
}

// روبوتات: المتصفح يسجَّل في metadata.ua منذ 8 نوفمبر 2026. قبلها: روبوت متجر قوقل كان يفتح /contact فقط بلا مصدر
const VIS_BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|playstore-google|facebookexternalhit|pingdom|gtmetrix|uptime/i;
function visIsBot(e) {
    const ua = e.metadata && e.metadata.ua;
    if (ua) return VIS_BOT_RE.test(ua);
    return !e.user_id && /^\/contact/.test(e.page_path || '') && !(e.metadata && e.metadata.referrer);
}

// مصدر الزائر: رابط شريك أو حملة (utm) ثم الموقع الذي جاء منه، وإلا «مباشر»
function visSource(e) {
    const m = e.metadata || {};
    const us = String(m.utm_source || '').trim();
    const usl = us.toLowerCase();
    const known = (s) => {
        if (/chatgpt|openai/.test(s)) return { key:'chatgpt', label:'ChatGPT' };
        if (/tiktok/.test(s)) return { key:'tiktok', label:'تيك توك' };
        if (/instagram/.test(s)) return { key:'instagram', label:'إنستقرام' };
        if (/snapchat/.test(s)) return { key:'snapchat', label:'سناب شات' };
        if (/twitter|x\.com|^t\.co$|^x$/.test(s)) return { key:'x', label:'إكس (تويتر)' };
        if (/youtube|youtu\.be/.test(s)) return { key:'youtube', label:'يوتيوب' };
        if (/whatsapp|wa\.me/.test(s)) return { key:'whatsapp', label:'واتساب' };
        if (/telegram|t\.me/.test(s)) return { key:'telegram', label:'تيليقرام' };
        if (/facebook|fb\.com/.test(s)) return { key:'facebook', label:'فيسبوك' };
        if (/google/.test(s)) return { key:'google', label:'بحث قوقل' };
        if (/bing/.test(s)) return { key:'bing', label:'بحث بينق' };
        return null;
    };
    if (us) {
        if (m.utm_medium === 'partner') return { key:'p:' + usl, label:'شريك · ' + us.toUpperCase(), partner:true };
        if (usl === 'classroom') return { key:'classroom', label:'مسابقة الفصل' };
        return known(usl) || { key:'utm:' + usl, label: us };
    }
    const ref = m.referrer || '';
    if (ref) {
        try {
            const host = new URL(ref).hostname.replace(/^www\./, '').toLowerCase();
            if (host.indexOf('madarekelite') === -1) return known(host) || { key:'h:' + host, label: host };
        } catch(_) {}
    }
    return { key:'direct', label:'مباشر' };
}

function visAgo(t) {
    const s = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
    if (s < 60) return 'الآن';
    if (s < 3600) return 'قبل ' + Math.floor(s / 60) + ' د';
    if (s < 86400) return 'قبل ' + Math.floor(s / 3600) + ' س';
    return fmtDate(t);
}
// صيغة العدد العربية: 1 زائر واحد · 2 زائران · 3-10 زوار · 11+ زائراً
function visCount(n, one, two, few, many) {
    if (n === 1) return one;
    if (n === 2) return two;
    if (n >= 3 && n <= 10) return fmt(n) + ' ' + few;
    return fmt(n) + ' ' + many;
}
async function visFetchAll(build, maxPages = 8) {
    const out = [];
    for (let i = 0; i < maxPages; i++) {
        const { data, error } = await build().range(i * 1000, i * 1000 + 999);
        if (error) throw error;
        out.push(...(data || []));
        if (!data || data.length < 1000) break;
    }
    return out;
}

// بيانات وهمية للمعاينة المحلية (?preview) فقط
function visMockData() {
    const now = Date.now(), ev = [], H = 3600000;
    const add = (ago, id, path, meta, device, type, uid) => ev.push({ event_type: type || 'page_view', page_path: path, user_id: uid || null, anonymous_id: uid ? null : id, device: device || 'mobile', metadata: Object.assign({ ua:'Mozilla/5.0 Safari' }, meta || {}), created_at: new Date(now - ago).toISOString() });
    add(0.2*H,'anon_a1','/',{referrer:'https://www.tiktok.com/'},'mobile'); add(0.19*H,'anon_a1','/',{},'mobile','hero_question_answered'); add(0.18*H,'anon_a1','/demo',{}); add(0.15*H,'anon_a1','/register',{});
    add(1.1*H,'anon_b2','/',{utm_source:'NONY38',utm_medium:'partner'},'mobile'); add(1.05*H,'anon_b2','/pricing',{utm_source:'NONY38',utm_medium:'partner'});
    add(2*H,'anon_c3','/',{utm_source:'chatgpt.com'},'desktop'); add(1.9*H,'anon_c3','/leaks-preview',{utm_source:'chatgpt.com'},'desktop');
    add(3*H,'anon_d4','/',{},'mobile'); add(5*H,'anon_e5','/',{referrer:'https://www.google.com/'},'desktop');
    add(0.5*H,null,'/dashboard',{},'mobile','page_view','u-1'); add(0.45*H,null,'/practice',{},'mobile','page_view','u-1');
    add(4*H,'anon_bot','/contact',{ua:'PlayStore-Google'},'desktop'); add(0.1*H,null,'/admin',{},'desktop','page_view','team-1');
    for (let d = 1; d < 14; d++) for (let k = 0; k < (3 + (d * 7) % 9); k++) add(d*24*H + k*H, 'anon_x' + d + '_' + k, '/', k % 3 === 0 ? { referrer:'https://www.google.com/' } : {}, k % 2 ? 'desktop' : 'mobile');
    return {
        events: ev,
        signups: [{ id:'u-1', full_name:'سارة العتيبي', created_at: new Date(now - 0.6*H).toISOString(), role:'user' }, { id:'u-9', full_name:'فهد', created_at: new Date(now - 30*H).toISOString(), role:'user' }],
        attempts: [0.4,0.41,0.42,0.43].map(h => ({ user_id:'u-1', created_at: new Date(now - h*H).toISOString() })),
        payments: [{ user_id:'u-9', amount:79, payment_id:'p1', paid_at: new Date(now - 29*H).toISOString(), plan_type:'monthly' }],
        teamIds: ['team-1'], names: { 'u-1':'سارة العتيبي', 'u-9':'فهد' }
    };
}

window.visSetRange = function(range) {
    window._visState.range = range;
    document.querySelectorAll('#visRangeChips .vis-chip').forEach(c => c.classList.toggle('active', c.dataset.range === range));
    loadVisitors({ refresh: true });
};

window.loadVisitors = async function(opts = {}) {
    const { sb } = window.A;
    const isRefresh = opts.refresh === true;
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    if (!isRefresh) {
        const chip = (r, t) => `<button class="vis-chip ${window._visState.range === r ? 'active' : ''}" data-range="${r}" onclick="visSetRange('${r}')">${t}</button>`;
        $c().innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <div id="visRangeChips" style="display:inline-flex;background:var(--s2);border:1px solid var(--ln);border-radius:10px;padding:3px;gap:2px">
                ${chip('today','اليوم')}${chip('yesterday','أمس')}${chip('week','آخر 7 أيام')}${chip('month','آخر 30 يوماً')}
            </div>
            <div style="margin-right:auto;font-size:11px;color:var(--i3)">تتحدّث تلقائياً كل دقيقة · آخر تحديث <span id="visLastRefresh">الآن</span></div>
        </div>
        <div id="visArea"><div class="loader">جاري التحميل...</div></div>`;

        if (!document.getElementById('visChipStyles')) {
            const s = document.createElement('style');
            s.id = 'visChipStyles';
            s.textContent = `.vis-chip{padding:7px 15px;border:none;background:transparent;border-radius:8px;font-size:12px;font-weight:700;color:var(--i3);cursor:pointer;font-family:inherit;transition:all .15s}.vis-chip:hover{color:var(--pri)}.vis-chip.active{background:var(--sf);color:var(--pri);box-shadow:0 1px 3px rgba(0,0,0,.06)}
@keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}50%{box-shadow:0 0 0 4px rgba(34,197,94,0)}}
.vis-sum{background:var(--sf);border:1px solid var(--ln);border-right:4px solid var(--pri);border-radius:12px;padding:16px 18px;margin-bottom:14px;font-size:14.5px;line-height:1.9;color:var(--ink)}
.vis-sum b{font-weight:800}.vis-sum .vis-sum2{font-size:12.5px;color:var(--i3);margin-top:2px}
.vis-step{display:grid;grid-template-columns:150px 1fr 96px;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--ln)}.vis-step:last-child{border-bottom:none}
.vis-step-l{font-size:12.5px;font-weight:700;color:var(--ink)}.vis-step-l small{display:block;font-size:10px;font-weight:500;color:var(--i4);margin-top:1px}
.vis-bar{height:22px;background:var(--s2);border-radius:6px;overflow:hidden}.vis-bar>i{display:block;height:100%;border-radius:6px;background:var(--pri);min-width:2px}
.vis-step-n{font-size:15px;font-weight:800;text-align:left;font-variant-numeric:tabular-nums}.vis-step-n small{display:block;font-size:10px;font-weight:600;color:var(--i4)}
.vis-src{display:grid;grid-template-columns:1fr 110px 54px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--ln);font-size:12.5px}.vis-src:last-child{border-bottom:none}
.vis-src b{font-weight:700}.vis-src .n{font-weight:800;text-align:left;font-variant-numeric:tabular-nums}
.vis-days{display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:18px}
.vis-dcol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.vis-dcol .b{width:100%;max-width:38px;background:var(--pri);border-radius:5px 5px 0 0;min-height:2px;opacity:.85}.vis-dcol.today .b{opacity:1;background:var(--suc)}
.vis-dcol .v{font-size:11px;font-weight:800;color:var(--ink);margin-bottom:3px;font-variant-numeric:tabular-nums}
.vis-dcol .d{font-size:9.5px;color:var(--i4);margin-top:5px;white-space:nowrap;direction:ltr}
.vis-dcol .s{font-size:9px;font-weight:800;color:var(--suc);height:13px}
.vis-j{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--ln);align-items:flex-start}.vis-j:last-child{border-bottom:none}
.vis-j-ic{width:36px;height:36px;border-radius:10px;background:var(--s2);display:grid;place-items:center;flex-shrink:0;color:var(--i3)}.vis-j-ic svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.vis-j.member .vis-j-ic{background:var(--ps,rgba(124,58,237,.1));color:var(--pri)}
.vis-j-b{flex:1;min-width:0}.vis-j-t{font-size:12.5px;color:var(--ink)}.vis-j-t b{font-weight:800}.vis-j-t span{color:var(--i3)}
.vis-j-p{font-size:12px;color:var(--i2);margin-top:4px;line-height:1.8}.vis-j-p i{font-style:normal;color:var(--i4);margin:0 5px}
.vis-tag{display:inline-block;font-size:10px;font-weight:800;padding:2px 8px;border-radius:7px;margin-inline-start:6px;white-space:nowrap}
.vis-tag.g{background:var(--ss,rgba(34,197,94,.12));color:var(--suc)}.vis-tag.o{background:var(--as,rgba(245,158,11,.14));color:var(--acc)}.vis-tag.p{background:var(--ps,rgba(124,58,237,.1));color:var(--pri)}
.vis-j-time{font-size:11px;color:var(--i4);font-weight:600;flex-shrink:0;white-space:nowrap}
.vis-mini{display:grid;grid-template-columns:1fr 46px;gap:8px;align-items:center;padding:6px 0;font-size:12px}.vis-mini .n{font-weight:800;text-align:left}
.vis-hours{display:flex;align-items:flex-end;gap:2px;height:70px}.vis-hours i{flex:1;background:var(--pri);opacity:.7;border-radius:2px 2px 0 0;min-height:1px}
.vis-note{font-size:11px;color:var(--i4);margin-top:14px;line-height:1.8}
@media(max-width:900px){.vis-step{grid-template-columns:110px 1fr 70px}.vis-2{grid-template-columns:1fr !important}}`;
            document.head.appendChild(s);
        }

        if (window._visState.liveTimer) { clearInterval(window._visState.liveTimer); window._visState.liveTimer = null; }
        if (window._visState.refreshTimer) clearInterval(window._visState.refreshTimer);
        window._visState.refreshTimer = setInterval(() => {
            if (!document.getElementById('visArea')) { clearInterval(window._visState.refreshTimer); window._visState.refreshTimer = null; return; }
            if (!document.hidden) loadVisitors({ refresh: true });
        }, 60000);
    }

    // ── حدود الفترة والفترة السابقة لها ──
    const now = Date.now();
    const sod = new Date(); sod.setHours(0, 0, 0, 0);
    const today0 = sod.getTime();
    const range = window._visState.range || 'today';
    let a, b, pa, pb, rangeLabel, prevLabel;
    if (range === 'yesterday') { a = today0 - VIS_DAY; b = today0; pa = a - VIS_DAY; pb = a; rangeLabel = 'أمس'; prevLabel = 'قبل أمس'; }
    else if (range === 'week') { a = now - 7*VIS_DAY; b = now; pa = now - 14*VIS_DAY; pb = a; rangeLabel = 'آخر 7 أيام'; prevLabel = 'الأسبوع السابق'; }
    else if (range === 'month') { a = now - 30*VIS_DAY; b = now; pa = now - 60*VIS_DAY; pb = a; rangeLabel = 'آخر 30 يوماً'; prevLabel = 'الشهر السابق'; }
    else { a = today0; b = now; pa = today0 - VIS_DAY; pb = today0; rangeLabel = 'اليوم'; prevLabel = 'أمس'; }
    const since = Math.min(pa, today0 - 13*VIS_DAY);
    const sinceIso = new Date(since).toISOString();

    try {
        let D;
        if (isPreview) {
            D = visMockData();
        } else {
            const [events, signups, attempts, payments, team] = await Promise.all([
                visFetchAll(() => sb.from('analytics_events').select('event_type,page_path,user_id,anonymous_id,device,metadata,created_at').gte('created_at', sinceIso).in('event_type', ['page_view','hero_question_answered']).order('created_at', { ascending: false })),
                visFetchAll(() => sb.from('profiles').select('id,full_name,created_at,role').gte('created_at', sinceIso).order('created_at', { ascending: false }), 3),
                visFetchAll(() => sb.from('attempts').select('user_id,created_at').gte('created_at', sinceIso).order('created_at', { ascending: false }), 6),
                sb.from('payments').select('user_id,amount,payment_id,paid_at,plan_type').eq('status', 'paid').gte('paid_at', sinceIso).then(r => r.data || []),
                sb.from('profiles').select('id').in('role', ['admin','staff']).then(r => r.data || [])
            ]);
            D = { events, signups, attempts, payments, teamIds: team.map(t => t.id), names: {} };
        }
        const teamIds = new Set(D.teamIds);
        const inR = (t, x, y) => t >= x && t < y;

        // ── تنظيف: استبعاد فريق العمل والروبوتات وصفحات الإدارة ──
        const clean = [];
        let teamViews = 0, botViews = 0;
        D.events.forEach(e => {
            e._t = new Date(e.created_at).getTime();
            const cur = inR(e._t, a, b);
            if ((e.user_id && teamIds.has(e.user_id)) || (e.metadata && e.metadata.team) || /^\/(admin|partner|arena)/.test(e.page_path || '')) { if (cur) teamViews++; return; }
            if (visIsBot(e)) { if (cur) botViews++; return; }
            clean.push(e);
        });
        clean.sort((x, y) => x._t - y._t);

        // هوية الزائر: نفس الجهاز قبل التسجيل وبعده = شخص واحد (متى توفّر المعرّفان معاً)
        const anonToUser = {};
        clean.forEach(e => { if (e.user_id && e.anonymous_id) anonToUser[e.anonymous_id] = e.user_id; });
        const vidOf = e => e.user_id ? 'u:' + e.user_id : (anonToUser[e.anonymous_id] ? 'u:' + anonToUser[e.anonymous_id] : 'a:' + (e.anonymous_id || '?'));

        const realSignups = D.signups.filter(s => !teamIds.has(s.id) && !['admin','staff'].includes(s.role));
        const realAttempts = D.attempts.filter(x => x.user_id && !teamIds.has(x.user_id));
        const realPays = D.payments.filter(p => !(p.payment_id || '').startsWith('FREE-') && Number(p.amount || 0) > 0 && !teamIds.has(p.user_id));

        const stats = (x, y) => {
            const vis = new Map(); const tried = new Set(), intent = new Set(); let views = 0;
            clean.forEach(e => {
                if (!inR(e._t, x, y)) return;
                const id = vidOf(e);
                if (!vis.has(id)) vis.set(id, { id, evs: [], first: e, last: e });
                const v = vis.get(id); v.evs.push(e); v.last = e;
                if (e.event_type === 'page_view') views++;
                const lbl = visPageLabel(e.page_path);
                if (e.event_type === 'hero_question_answered' || lbl === 'التجربة المجانية' || lbl === 'عينة التجميعات') tried.add(id);
                if (lbl === 'صفحة التسجيل' || lbl === 'صفحة الأسعار') intent.add(id);
            });
            const su = realSignups.filter(s => inR(new Date(s.created_at).getTime(), x, y));
            const at = realAttempts.filter(t => inR(new Date(t.created_at).getTime(), x, y));
            const py = realPays.filter(p => inR(new Date(p.paid_at).getTime(), x, y));
            return { vis, tried, intent, views, signups: su, attempts: at, trainees: new Set(at.map(t => t.user_id)), pays: py, rev: py.reduce((s, p) => s + Number(p.amount || 0), 0) };
        };
        const C = stats(a, b), P = stats(pa, pb);
        const nVis = C.vis.size;

        // أسماء الأعضاء الظاهرين في الفترة
        const names = Object.assign({}, D.names);
        D.signups.forEach(s => { names[s.id] = s.full_name; });
        if (!isPreview) {
            const need = Array.from(C.vis.keys()).filter(k => k.startsWith('u:')).map(k => k.slice(2)).filter(id => !(id in names));
            if (need.length) {
                const { data: profs } = await sb.from('profiles').select('id,full_name').in('id', need.slice(0, 200));
                (profs || []).forEach(p => { names[p.id] = p.full_name; });
            }
        }

        // ── المصادر والأجهزة (لكل زائر مرة واحدة) ──
        const srcMap = {}; const dev = { mobile: 0, desktop: 0, app: 0 };
        C.vis.forEach(v => {
            const s = visSource(v.first);
            v.src = s;
            (srcMap[s.key] = srcMap[s.key] || { label: s.label, n: 0, partner: !!s.partner }).n++;
            const d = String(v.first.device || '').toLowerCase();
            dev[d === 'app' ? 'app' : d === 'desktop' ? 'desktop' : 'mobile']++;
        });
        const sources = Object.values(srcMap).sort((x, y) => y.n - x.n);
        const members = Array.from(C.vis.keys()).filter(k => k.startsWith('u:')).length;

        // ── الصفحات والساعات ──
        const pages = {}; const hours = new Array(24).fill(0);
        C.vis.forEach(v => v.evs.forEach(e => {
            if (e.event_type !== 'page_view') return;
            const l = visPageLabel(e.page_path); pages[l] = (pages[l] || 0) + 1;
            hours[new Date(e._t).getHours()]++;
        }));
        const topPages = Object.entries(pages).sort((x, y) => y[1] - x[1]).slice(0, 7);
        const peakHour = hours.indexOf(Math.max(...hours));

        // ── آخر 14 يوماً ──
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const x = today0 - i*VIS_DAY, y = x + VIS_DAY;
            const ids = new Set();
            clean.forEach(e => { if (inR(e._t, x, y)) ids.add(vidOf(e)); });
            const su = realSignups.filter(s => inR(new Date(s.created_at).getTime(), x, y)).length;
            const dt = new Date(x);
            days.push({ n: ids.size, su, lbl: dt.getDate() + '/' + (dt.getMonth() + 1), wd: dt.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long' }), today: i === 0 });
        }
        const maxDay = Math.max(1, ...days.map(d => d.n));

        // ── خلاصة بجملة واحدة ──
        const cmp = (cur, prev) => {
            const arrow = cur > prev ? '<span style="color:var(--suc);font-weight:800">↑</span> ' : cur < prev ? '<span style="color:var(--dng);font-weight:800">↓</span> ' : '';
            return arrow + prevLabel + ': ' + fmt(prev);
        };
        let summary;
        if (nVis === 0) {
            summary = `<b>${rangeLabel}:</b> لا زيارات حتى الآن.`;
        } else {
            const parts = [`زار الموقع <b>${visCount(nVis, 'زائر واحد', 'زائران', 'زوار', 'زائراً')}</b>`];
            parts.push(C.tried.size ? `جرّب الأسئلة منهم <b>${fmt(C.tried.size)}</b>` : 'ولم يجرّب أحد منهم الأسئلة');
            parts.push(C.signups.length ? `وسجّل حساباً <b>${fmt(C.signups.length)}</b>` : 'ولم يسجّل أحد');
            parts.push(C.pays.length ? `واشترك <b>${fmt(C.pays.length)}</b> بمبلغ <b>${fmt(Math.round(C.rev))} ر.س</b>` : 'ولا اشتراكات مدفوعة');
            summary = `<b>${rangeLabel}:</b> ${parts.join('، ')}.`;
            if (sources.length) summary += `<div class="vis-sum2">أكثر المصادر: ${sources.slice(0, 3).map(s => esc(s.label) + ' (' + fmt(s.n) + ')').join('، ')}${members ? ' · منهم ' + fmt(members) + ' عضو مسجّل دخل حسابه' : ''}</div>`;
        }

        // ── مسار التحويل ──
        const step = (title, hint, n, base, color) => {
            const w = nVis > 0 ? Math.max(0, Math.min(100, n / nVis * 100)) : 0;
            const pct = base > 0 ? Math.round(n / base * 100) + '% من الخطوة السابقة' : '';
            return `<div class="vis-step"><div class="vis-step-l">${title}<small>${hint}</small></div><div class="vis-bar"><i style="width:${w}%;background:${color || 'var(--pri)'}"></i></div><div class="vis-step-n">${fmt(n)}<small>${pct}</small></div></div>`;
        };
        const funnel = step('زاروا الموقع', 'فتحوا أي صفحة', nVis, 0)
            + step('جرّبوا الأسئلة', 'سؤال الواجهة أو التجربة', C.tried.size, nVis)
            + step('فتحوا التسجيل أو الأسعار', 'أبدوا اهتماماً', C.intent.size, C.tried.size || nVis)
            + step('سجّلوا حساباً', 'من الموقع والتطبيق', C.signups.length, C.intent.size || nVis, 'var(--acc)')
            + step('اشتركوا ودفعوا', fmt(Math.round(C.rev)) + ' ر.س', C.pays.length, C.signups.length || nVis, 'var(--suc)');

        const srcHtml = sources.length === 0 ? '<div class="empty-d" style="padding:18px">لا زوار في هذه الفترة</div>' : sources.slice(0, 9).map(s =>
            `<div class="vis-src"><div><b>${esc(s.label)}</b>${s.partner ? '<span class="vis-tag p">رابط شريك</span>' : ''}</div><div class="vis-bar" style="height:10px"><i style="width:${Math.round(s.n / nVis * 100)}%;background:${s.partner ? 'var(--acc)' : 'var(--pri)'}"></i></div><div class="n">${fmt(s.n)}</div></div>`).join('');

        // ── رحلات آخر الزوار ──
        const attByUser = {}; C.attempts.forEach(t => { attByUser[t.user_id] = (attByUser[t.user_id] || 0) + 1; });
        const newIds = new Set(C.signups.map(s => s.id)); const paidIds = new Set(C.pays.map(p => p.user_id));
        const icPhone = '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><line x1="11" y1="18" x2="13" y2="18"/></svg>';
        const icDesk = '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
        const journeys = Array.from(C.vis.values()).sort((x, y) => y.last._t - x.last._t).slice(0, 40).map(v => {
            const uid = v.id.startsWith('u:') ? v.id.slice(2) : null;
            const steps = [];
            v.evs.forEach(e => { const l = e.event_type === 'hero_question_answered' ? 'جاوب سؤال الواجهة' : visPageLabel(e.page_path); if (steps[steps.length - 1] !== l) steps.push(l); });
            const shown = steps.length > 7 ? steps.slice(0, 6).concat('… +' + (steps.length - 6)) : steps;
            const d = String(v.first.device || '').toLowerCase();
            const devLbl = d === 'app' ? 'التطبيق' : d === 'desktop' ? 'كمبيوتر' : 'جوال';
            let tags = '';
            if (uid && newIds.has(uid)) tags += '<span class="vis-tag g">سجّل حساباً</span>';
            if (uid && attByUser[uid]) tags += `<span class="vis-tag p">حلّ ${visCount(attByUser[uid], 'سؤالاً واحداً', 'سؤالين', 'أسئلة', 'سؤالاً')}</span>`;
            if (uid && paidIds.has(uid)) tags += '<span class="vis-tag o">اشترك</span>';
            if (!uid && steps.length === 1) tags += '<span class="vis-tag" style="background:var(--s2);color:var(--i4)">صفحة واحدة ثم خرج</span>';
            const who = uid ? `<b>${esc(names[uid] || 'عضو')}</b> <span>· عضو</span>` : '<b>زائر</b>';
            return `<div class="vis-j${uid ? ' member' : ''}"><div class="vis-j-ic">${d === 'desktop' ? icDesk : icPhone}</div><div class="vis-j-b"><div class="vis-j-t">${who} <span>· من ${esc(v.src.label)} · ${devLbl}</span>${tags}</div><div class="vis-j-p">${shown.map(esc).join('<i>←</i>')}</div></div><div class="vis-j-time">${visAgo(v.last.created_at)}</div></div>`;
        }).join('');

        const kpi = (cls, label, val, sub) => `<div class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-val">${val}</div><div class="kpi-sub" style="font-size:11px">${sub}</div></div>`;
        const maxHour = Math.max(1, ...hours);

        const lr = document.getElementById('visLastRefresh');
        if (lr) lr.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        document.getElementById('visArea').innerHTML = `
        <div class="vis-sum">${summary}</div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px" class="vis-2">
            ${kpi('blue', 'زوار ' + rangeLabel, fmt(nVis), cmp(nVis, P.vis.size))}
            ${kpi('orange', 'تسجيلات جديدة', fmt(C.signups.length), cmp(C.signups.length, P.signups.length))}
            ${kpi('gold', 'أعضاء حلّوا أسئلة', fmt(C.trainees.size), visCount(C.attempts.length, 'إجابة واحدة', 'إجابتان', 'إجابات', 'إجابة') + ' · ' + cmp(C.trainees.size, P.trainees.size))}
            ${kpi('green', 'اشتراكات مدفوعة', fmt(C.pays.length), fmt(Math.round(C.rev)) + ' ر.س · ' + cmp(C.pays.length, P.pays.length))}
        </div>

        <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px" class="vis-2">
            <div class="card">
                <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">ماذا فعل الزوار · ${rangeLabel}</div><div class="card-sub">من الزيارة إلى الاشتراك — أين يتوقف الناس</div></div></div></div>
                <div class="card-body">${funnel}</div>
            </div>
            <div class="card">
                <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">من أين جاء الزوار</div><div class="card-sub">كل زائر يُحسب مرة واحدة · «مباشر» = كتب الرابط أو فتحه من محفوظاته</div></div></div></div>
                <div class="card-body">${srcHtml}</div>
            </div>
        </div>

        <div class="card" style="margin-top:14px">
            <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">الزوار يومياً · آخر 14 يوماً</div><div class="card-sub">العمود = زوار حقيقيون في اليوم · الرقم الأخضر = تسجيلات جديدة · العمود الأخضر اليوم</div></div></div></div>
            <div class="card-body"><div class="vis-days">${days.map(d =>
                `<div class="vis-dcol${d.today ? ' today' : ''}" title="${d.wd} ${d.lbl}: ${d.n} زائر، ${d.su} تسجيل"><div class="s">${d.su ? '+' + d.su : ''}</div><div class="v">${d.n}</div><div class="b" style="height:${Math.round(d.n / maxDay * 100)}%"></div><div class="d">${d.lbl}</div></div>`).join('')}</div></div>
        </div>

        <div class="card" style="margin-top:14px">
            <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">آخر الزوار · ${rangeLabel}</div><div class="card-sub">كل سطر شخص واحد: من أين جاء وما الصفحات التي فتحها بالترتيب</div></div></div></div>
            <div class="card-body" style="max-height:560px;overflow-y:auto">${journeys || '<div class="empty-d" style="padding:18px">لا زوار في هذه الفترة</div>'}</div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px" class="vis-2">
            <div class="card">
                <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">أكثر الصفحات فتحاً</div><div class="card-sub">${fmt(C.views)} مشاهدة</div></div></div></div>
                <div class="card-body">${topPages.length ? topPages.map(p => `<div class="vis-mini"><div>${esc(p[0])}</div><div class="n">${fmt(p[1])}</div></div>`).join('') : '<div class="empty-d" style="padding:14px">—</div>'}</div>
            </div>
            <div class="card">
                <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">الأجهزة</div><div class="card-sub">حسب عدد الزوار</div></div></div></div>
                <div class="card-body">
                    <div class="vis-mini"><div>جوال (متصفح)</div><div class="n">${fmt(dev.mobile)}</div></div>
                    <div class="vis-mini"><div>كمبيوتر</div><div class="n">${fmt(dev.desktop)}</div></div>
                    <div class="vis-mini"><div>التطبيق</div><div class="n">${fmt(dev.app)}</div></div>
                </div>
            </div>
            <div class="card">
                <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">أوقات الزيارة</div><div class="card-sub">${C.views ? 'الذروة قرابة الساعة ' + peakHour + ':00' : 'لا بيانات'} · من 0 إلى 23</div></div></div></div>
                <div class="card-body"><div class="vis-hours">${hours.map((h, i) => `<i title="الساعة ${i}:00 — ${h} مشاهدة" style="height:${Math.round(h / maxHour * 100)}%"></i>`).join('')}</div></div>
            </div>
        </div>

        <div class="vis-note">الأرقام للزوار الحقيقيين فقط. استُبعد من ${rangeLabel}: مشاهدات فريق العمل وصفحات الإدارة (${fmt(teamViews)})، والزيارات الآلية مثل فاحص متجر قوقل بلاي (${fmt(botViews)}).</div>`;
    } catch(e) {
        console.error('loadVisitors', e);
        const el = document.getElementById('visArea');
        if (el) el.innerHTML = '<div class="empty-d" style="padding:24px">تعذّر تحميل بيانات الزوار: ' + esc(e.message || '') + '</div>';
    }
};

// ═══════════════════════════════════════════════════════
// 17. SETTINGS
// ═══════════════════════════════════════════════════════
window.loadSettings = async function() {
    const { sb } = window.A;
    $c().innerHTML = `
    <div class="settings-section">
        <div class="settings-title">عام</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
                <div class="sr-body"><div class="sr-title">اسم التطبيق</div><div class="sr-sub">مدارك النخبة</div></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></div>
                <div class="sr-body"><div class="sr-title">واتساب الدعم</div><div class="sr-sub" id="waSup">+966500000000</div></div>
                <button class="btn btn-ghost" onclick='editSetting("whatsapp")'>تعديل</button></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div>
                <div class="sr-body"><div class="sr-title">رقم النشاط التجاري</div><div class="sr-sub">620113</div></div></div>
        </div>
    </div>
    <div class="settings-section">
        <div class="settings-title">الإشعارات</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار عضو جديد</div><div class="sr-sub">تنبيه عند تسجيل عضو جديد</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار اشتراك جديد</div><div class="sr-sub">تنبيه عند عملية دفع</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
            <div class="setting-row"><div class="sr-ic"><svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg></div>
                <div class="sr-body"><div class="sr-title">إشعار بلاغ جديد</div><div class="sr-sub">تنبيه عند ورود بلاغ</div></div>
                <div class="toggle2 on" onclick="this.classList.toggle('on')"></div></div>
        </div>
    </div>
    <div class="settings-section">
        <div class="settings-title">معلومات النظام</div>
        <div class="settings-group">
            <div class="setting-row"><div class="sr-body"><div class="sr-title">الإصدار</div><div class="sr-sub">v2.0.0</div></div></div>
            <div class="setting-row"><div class="sr-body"><div class="sr-title">قاعدة البيانات</div><div class="sr-sub">Supabase — متصل</div></div><span class="status-pill active"><span class="status-dot"></span>نشط</span></div>
        </div>
    </div>`;
};

window.editSetting = function(key) {
    showToast('قريباً — تعديل الإعداد','');
};

// ═══════════════════════════════════════════════════════
// 18. PAYOUTS — طلبات الصرف (STC Pay)
// ═══════════════════════════════════════════════════════
window._payoutsFilter = 'pending'; // all | pending | processing | completed | rejected

window.loadPayouts = async function() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    $c().innerHTML = `
    <div id="payoutsArea">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px" id="payoutsKpis">
            <div class="loader">...</div>
        </div>

        <div class="card">
            <div class="card-hdr">
                <div class="card-hdr-l">
                    <div class="card-ic pur"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M7 15h4"/></svg></div>
                    <div><div class="card-title">طلبات الصرف</div><div class="card-sub">إدارة تحويلات STC Pay للمُحيلين</div></div>
                </div>
            </div>
            <div class="q-filter-row" style="padding:0 16px 12px" id="payoutsFilters">
                <button class="q-filter-btn on" data-status="pending"    onclick="payoutsFilter('pending')">قيد الانتظار</button>
                <button class="q-filter-btn"    data-status="processing" onclick="payoutsFilter('processing')">قيد المعالجة</button>
                <button class="q-filter-btn"    data-status="completed"  onclick="payoutsFilter('completed')">مكتملة</button>
                <button class="q-filter-btn"    data-status="rejected"   onclick="payoutsFilter('rejected')">مرفوضة</button>
                <button class="q-filter-btn"    data-status="all"        onclick="payoutsFilter('all')">الكل</button>
            </div>
            <div class="tbl-wrap" id="payoutsTable"><div class="loader">جاري التحميل...</div></div>
        </div>
    </div>`;

    try {
        // ── KPIs ──
        if (isPreview) {
            renderPayoutsKpis({ pending_count: 2, pending_amount: 310, processing_count: 1, processing_amount: 150, completed_count: 8, completed_amount: 1240, rejected_count: 1 });
        } else {
            const [pendR, procR, compR, rejR] = await Promise.all([
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','pending'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','processing'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','completed'),
                sb.from('referral_payouts').select('amount', { count:'exact' }).eq('status','rejected')
            ]);
            const sum = arr => (arr||[]).reduce((s,r)=>s+Number(r.amount||0),0);
            renderPayoutsKpis({
                pending_count: pendR.count || 0,
                pending_amount: sum(pendR.data),
                processing_count: procR.count || 0,
                processing_amount: sum(procR.data),
                completed_count: compR.count || 0,
                completed_amount: sum(compR.data),
                rejected_count: rejR.count || 0
            });
        }

        // ── Table ──
        await loadPayoutsTable();
    } catch(e) {
        console.error(e);
        showToast('خطأ في التحميل: ' + (e.message || ''), 'err');
    }
};

function renderPayoutsKpis(d) {
    document.getElementById('payoutsKpis').innerHTML = `
    <div class="kpi orange">
        <div class="kpi-label">قيد الانتظار</div>
        <div class="kpi-val">${fmt(d.pending_count)}</div>
        <div class="kpi-sub">${fmt(d.pending_amount)} ر.س — يحتاج معالجة</div>
    </div>
    <div class="kpi blue">
        <div class="kpi-label">قيد المعالجة</div>
        <div class="kpi-val">${fmt(d.processing_count)}</div>
        <div class="kpi-sub">${fmt(d.processing_amount)} ر.س</div>
    </div>
    <div class="kpi green">
        <div class="kpi-label">مكتملة</div>
        <div class="kpi-val">${fmt(d.completed_count)}</div>
        <div class="kpi-sub">${fmt(d.completed_amount)} ر.س مُحوّلة</div>
    </div>
    <div class="kpi red">
        <div class="kpi-label">مرفوضة</div>
        <div class="kpi-val">${fmt(d.rejected_count)}</div>
        <div class="kpi-sub">تم إرجاع الرصيد</div>
    </div>`;
}

window.payoutsFilter = function(status) {
    window._payoutsFilter = status;
    document.querySelectorAll('#payoutsFilters .q-filter-btn').forEach(c => {
        c.classList.toggle('on', c.dataset.status === status);
    });
    loadPayoutsTable();
};

async function loadPayoutsTable() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    const status = window._payoutsFilter;
    const el = document.getElementById('payoutsTable');
    if (!el) return;
    el.innerHTML = '<div class="loader">جاري التحميل...</div>';

    try {
        let rows = [];
        if (isPreview) {
            rows = buildPreviewPayouts(status);
        } else {
            let q = sb.from('v_payouts_admin').select('*').order('requested_at', { ascending: false }).limit(200);
            if (status !== 'all') q = q.eq('status', status);
            const { data, error } = await q;
            if (error) throw error;
            rows = data || [];
        }

        if (!rows.length) {
            el.innerHTML = `<div class="empty" style="padding:40px 20px">
                <div class="empty-ic">💸</div>
                <div class="empty-t">لا طلبات ${statusLabel(status)} حالياً</div>
                <div class="empty-d">ستظهر الطلبات هنا عند وصولها</div>
            </div>`;
            return;
        }

        el.innerHTML = '<table><thead><tr>' +
            '<th>المُحيل</th>' +
            '<th>المبلغ</th>' +
            '<th>STC Pay</th>' +
            '<th>الإحالات</th>' +
            '<th>تاريخ الطلب</th>' +
            '<th>الحالة</th>' +
            '<th>الإجراءات</th>' +
            '</tr></thead><tbody>' +
            rows.map(r => `<tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div class="tbl-avatar">${esc((r.user_name||'?').charAt(0))}</div>
                        <div>
                            <div class="td-name">${esc(r.user_name || '—')}</div>
                            <div style="font-size:10px;color:var(--i3)">${esc(r.user_email||'')} ${r.user_referral_code ? '· <span style="color:var(--pri);font-family:monospace">'+esc(r.user_referral_code)+'</span>' : ''}</div>
                        </div>
                    </div>
                </td>
                <td><b style="color:var(--suc);font-size:14px">${fmt(Number(r.amount||0))}</b> <span style="font-size:11px;color:var(--i3)">ر.س</span></td>
                <td>
                    <div style="font-family:monospace;font-size:13px;font-weight:700">${esc(r.stc_pay_number||'—')}</div>
                    <button class="q-act-btn" title="نسخ الرقم" onclick="copyPayoutStc('${esc(r.stc_pay_number||'')}')" style="margin-top:4px">
                        <svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                </td>
                <td style="text-align:center"><b>${r.referrals_count || 0}</b></td>
                <td style="font-size:11px;color:var(--i3)">${fmtDate(r.requested_at)}</td>
                <td>${payoutStatusPill(r.status)}</td>
                <td>${payoutActions(r)}</td>
            </tr>`).join('') +
            '</tbody></table>';
    } catch(e) {
        console.error(e);
        el.innerHTML = '<div class="empty-d" style="padding:20px">خطأ في التحميل: ' + esc(e.message||'') + '</div>';
    }
}

function statusLabel(s) {
    return ({ pending:'قيد الانتظار', processing:'قيد المعالجة', completed:'مكتملة', rejected:'مرفوضة' })[s] || '';
}

function payoutStatusPill(s) {
    const map = {
        pending:    '<span class="status-pill pending">⏳ قيد الانتظار</span>',
        processing: '<span class="status-pill" style="background:rgba(139,127,255,.12);color:var(--pri)">🔄 قيد المعالجة</span>',
        completed:  '<span class="status-pill active">✓ مكتملة</span>',
        rejected:   '<span class="status-pill expired">✗ مرفوضة</span>'
    };
    return map[s] || s;
}

function payoutActions(r) {
    if (r.status === 'pending') {
        return `<div style="display:flex;gap:4px">
            <button class="btn btn-pri" style="padding:5px 10px;font-size:11px" onclick="openPayoutClaim('${r.id}')" title="استلام المعالجة">🔄 استلم</button>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:var(--dng)" onclick="openPayoutReject('${r.id}','${fmt(Number(r.amount||0))}')" title="رفض">✗ ارفض</button>
        </div>`;
    }
    if (r.status === 'processing') {
        return `<div style="display:flex;gap:4px">
            <button class="btn btn-pri" style="padding:5px 10px;font-size:11px;background:var(--suc);border-color:var(--suc)" onclick="openPayoutComplete('${r.id}','${fmt(Number(r.amount||0))}','${esc(r.stc_pay_number||'')}')" title="تأكيد الإتمام">✓ أتمم</button>
            <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px;color:var(--dng)" onclick="openPayoutReject('${r.id}','${fmt(Number(r.amount||0))}')" title="رفض">✗ ارفض</button>
        </div>`;
    }
    if (r.status === 'completed' || r.status === 'rejected') {
        const note = r.admin_note ? `<div style="font-size:10px;color:var(--i3);margin-top:2px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.admin_note)}">${esc(r.admin_note)}</div>` : '';
        const processor = r.processor_name ? `<div style="font-size:10px;color:var(--i3)">بواسطة ${esc(r.processor_name)}</div>` : '';
        return `<div>${note}${processor}</div>`;
    }
    return '—';
}

// ── Preview mock rows ──
function buildPreviewPayouts(filter) {
    const all = [
        { id:'pv-1', user_id:'u1', user_name:'عبدالله الزهراني', user_email:'abodi2040@gmail.com', user_referral_code:'MADAR-ZAHR1', amount:150, stc_pay_number:'+966553339885', status:'pending', requested_at:new Date(Date.now()-3*3600e3).toISOString(), referrals_count:15, admin_note:null, processor_name:null },
        { id:'pv-2', user_id:'u2', user_name:'سارة العتيبي', user_email:'sara@example.com', user_referral_code:'MADAR-SARAH', amount:160, stc_pay_number:'+966501234567', status:'pending', requested_at:new Date(Date.now()-18*3600e3).toISOString(), referrals_count:16, admin_note:null, processor_name:null },
        { id:'pv-3', user_id:'u3', user_name:'محمد الحربي', user_email:'moh@example.com', user_referral_code:'MADAR-MOHD7', amount:150, stc_pay_number:'+966555555555', status:'processing', requested_at:new Date(Date.now()-24*3600e3).toISOString(), referrals_count:15, admin_note:null, processor_name:'المدير العام' },
        { id:'pv-4', user_id:'u4', user_name:'نورة القحطاني', user_email:'nora@example.com', user_referral_code:'MADAR-NURA9', amount:200, stc_pay_number:'+966533334444', status:'completed', requested_at:new Date(Date.now()-5*86400e3).toISOString(), processed_at:new Date(Date.now()-4*86400e3).toISOString(), referrals_count:20, admin_note:'STC-REF-99213', processor_name:'المدير العام' },
        { id:'pv-5', user_id:'u5', user_name:'خالد السالم', user_email:'khalid@example.com', user_referral_code:'MADAR-KHLD3', amount:100, stc_pay_number:'+966500000000', status:'rejected', requested_at:new Date(Date.now()-7*86400e3).toISOString(), processed_at:new Date(Date.now()-6*86400e3).toISOString(), referrals_count:10, admin_note:'حسابات مكررة — نفس الـIP', processor_name:'المدير العام' }
    ];
    if (filter === 'all') return all;
    return all.filter(r => r.status === filter);
}

// ════════════════════════════════════════
// Actions: Claim / Complete / Reject
// ════════════════════════════════════════
window.copyPayoutStc = function(n) {
    if (!n) return;
    navigator.clipboard.writeText(n).then(
        () => showToast('نُسخ الرقم: ' + n, 'suc'),
        () => showToast('فشل النسخ', 'err')
    );
};

window.openPayoutClaim = async function(id) {
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    if (!confirm('استلم هذا الطلب لمعالجته؟ (سيتغيّر إلى "قيد المعالجة")')) return;
    try {
        if (isPreview) { showToast('(معاينة) تم الاستلام', 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_claim_payout', { p_payout_id: id });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        showToast('تم الاستلام — جاهز للمعالجة', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

window.openPayoutComplete = function(id, amount, stcNumber) {
    const body = `
    <div style="padding:4px 0">
        <div style="background:var(--suc-s);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;margin-bottom:16px">
            <div style="font-size:12px;color:var(--i2);margin-bottom:4px">سترسل مبلغ</div>
            <div style="font-size:24px;font-weight:800;color:var(--suc)">${amount} ر.س</div>
            <div style="font-size:12px;color:var(--i2);margin-top:6px">إلى STC Pay: <b style="font-family:monospace">${esc(stcNumber)}</b></div>
        </div>
        <div class="form-field">
            <label class="form-label">مرجع التحويل من STC Pay <span style="color:var(--dng)">*</span></label>
            <input class="form-input" id="payoutCompleteRef" placeholder="مثال: STC-REF-99213 أو TXN-12345" autocomplete="off" style="font-family:monospace">
            <div style="font-size:11px;color:var(--i3);margin-top:4px">رقم المرجع من تطبيق STC Pay — لازم للمراجعة المالية</div>
        </div>
        <div style="background:var(--warn-s,#FEFCE8);border:1px solid #FDE68A;border-radius:8px;padding:10px;margin-top:12px;font-size:12px;color:#92400E">
            ⚠️ تأكّد من إتمام التحويل في STC Pay <u>قبل</u> الضغط على تأكيد — بعد الحفظ لا يمكن التراجع بسهولة
        </div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" style="background:var(--suc);border-color:var(--suc)" onclick="confirmPayoutComplete('${id}')">تأكيد الإتمام</button>`;
    openModal('إتمام صرف ' + amount + ' ر.س', body, foot);
    setTimeout(()=>document.getElementById('payoutCompleteRef')?.focus(), 100);
};

window.confirmPayoutComplete = async function(id) {
    const ref = (document.getElementById('payoutCompleteRef').value || '').trim();
    if (ref.length < 3) return showToast('مرجع التحويل مطلوب (3 أحرف على الأقل)', 'err');
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { closeModal(); showToast('(معاينة) تم الإتمام: ' + ref, 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_complete_payout', { p_payout_id: id, p_transfer_ref: ref });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        closeModal();
        showToast('✓ تم الإتمام — ' + data.amount + ' ر.س (' + ref + ')', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

window.openPayoutReject = function(id, amount) {
    const body = `
    <div style="padding:4px 0">
        <div style="background:var(--dng-s);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-bottom:16px">
            <div style="font-size:13px;color:var(--dng);font-weight:700">سيتم رفض طلب بمبلغ ${amount} ر.س</div>
            <div style="font-size:12px;color:var(--i2);margin-top:4px">الرصيد سيُرجَع تلقائياً لحساب المُحيل ويقدر يطلب صرف جديد</div>
        </div>
        <div class="form-field">
            <label class="form-label">سبب الرفض <span style="color:var(--dng)">*</span></label>
            <textarea class="form-textarea" id="payoutRejectReason" rows="3" placeholder="مثال: حسابات مكرّرة، IP واحد، معلومات مزيفة..."></textarea>
            <div style="font-size:11px;color:var(--i3);margin-top:4px">سيظهر السبب في سجلّ النظام (لكن <b>لن</b> يُرسل للمستخدم تلقائياً — تواصل معه بالواتساب لو احتاج توضيح)</div>
        </div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" style="background:var(--dng);border-color:var(--dng)" onclick="confirmPayoutReject('${id}')">تأكيد الرفض</button>`;
    openModal('رفض طلب صرف', body, foot);
    setTimeout(()=>document.getElementById('payoutRejectReason')?.focus(), 100);
};

window.confirmPayoutReject = async function(id) {
    const reason = (document.getElementById('payoutRejectReason').value || '').trim();
    if (reason.length < 3) return showToast('سبب الرفض مطلوب (3 أحرف على الأقل)', 'err');
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { closeModal(); showToast('(معاينة) تم الرفض', 'suc'); loadPayouts(); return; }
        const { sb } = window.A;
        const { data, error } = await sb.rpc('admin_reject_payout', { p_payout_id: id, p_reason: reason });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        closeModal();
        showToast('تم الرفض — أُرجع ' + (data.restored_referrals||0) + ' إحالة لرصيد المستخدم', 'suc');
        loadPayouts();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

// ════════════════════════════════════════════════════════════
//  الاختبارات المحاكية (Phase 2)
// ════════════════════════════════════════════════════════════

const EXAM_TYPE_MAP = {
    tahsili:          { name: 'محاكي التحصيلي',          q: 160, dur: 125, color: '#7C3AED' },
    qudurat_computer: { name: 'محاكي القدرات (محوسب)',   q: 96,  dur: 100, color: '#0EA5E9' },
    qudurat_paper:    { name: 'محاكي القدرات (ورقي)',    q: 120, dur: 125, color: '#F59E0B' },
    custom:           { name: 'اختبار مخصّص',            q: 50,  dur: 60,  color: '#22C55E' }
};

// ═══════════════════════════════════════════════
// LEAKS PDF — إدارة ملفات تسريبات PDF + عدّاد التحميلات
// ═══════════════════════════════════════════════
window.loadLeaksPdf = async function() {
    const { sb } = window.A;
    const c = $c();
    c.innerHTML = '<div class="loader">جاري تحميل ملفات التسريبات...</div>';

    try {
        const { data, error } = await sb.from('leak_groups')
            .select('id, title, leak_date, section, question_count, pdf_url, pdf_downloads, pdf_uploaded_at, accent_color, is_active')
            .order('leak_date', { ascending: false });
        if (error) throw error;

        const groups = data || [];
        const totalDownloads = groups.reduce((s,g) => s + (g.pdf_downloads || 0), 0);
        const withPdf = groups.filter(g => g.pdf_url).length;
        const topGroup = groups.slice().sort((a,b) => (b.pdf_downloads||0) - (a.pdf_downloads||0))[0];

        const SECTION_LABELS = { 'tahsili':'تحصيلي', 'quant':'قدرات كمي', 'verbal':'قدرات لفظي', 'mixed':'مختلط' };

        c.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px">
            <div class="kpi green">
                <div class="kpi-label">إجمالي التحميلات</div>
                <div class="kpi-val" style="color:var(--suc)">${totalDownloads.toLocaleString('ar-SA')}</div>
                <div class="kpi-sub">عبر كل التسريبات</div>
            </div>
            <div class="kpi blue">
                <div class="kpi-label">ملفات PDF منشورة</div>
                <div class="kpi-val" style="color:var(--pri)">${withPdf} / ${groups.length}</div>
                <div class="kpi-sub">مجموعة فيها ملف</div>
            </div>
            <div class="kpi gold">
                <div class="kpi-label">الأكثر تحميلاً</div>
                <div class="kpi-val" style="color:var(--gold);font-size:15px;line-height:1.4">${topGroup && topGroup.pdf_downloads ? esc(topGroup.title.slice(0,30)) : '—'}</div>
                <div class="kpi-sub">${topGroup ? (topGroup.pdf_downloads||0).toLocaleString('ar-SA') + ' تحميل' : ''}</div>
            </div>
        </div>

        <!-- روابط المشاركة العامة -->
        <div class="card" style="padding:16px 18px;margin-bottom:14px;background:linear-gradient(135deg,rgba(109,93,246,.06),rgba(245,158,11,.05))">
            <div style="font-size:15px;font-weight:800;color:var(--ink);margin-bottom:10px">🔗 روابط مشاركة عامة</div>
            <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:13px">
                <div style="font-weight:700;color:var(--pri)">الصفحة الموحّدة:</div>
                <code style="background:var(--s2);padding:6px 10px;border-radius:6px;font-size:12px;color:var(--ink)">madarekelite.com/tahsili</code>
                <button onclick="window.copyLeakDlLink('https://madarekelite.com/tahsili')" style="background:var(--pri);color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">نسخ</button>
                <div style="font-weight:700;color:var(--pri)">الأربعاء:</div>
                <code style="background:var(--s2);padding:6px 10px;border-radius:6px;font-size:12px;color:var(--ink)">madarekelite.com/dl/wed</code>
                <button onclick="window.copyLeakDlLink('https://madarekelite.com/dl/wed')" style="background:var(--ps);color:var(--pri);border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">نسخ</button>
                <div style="font-weight:700;color:var(--pri)">الخميس:</div>
                <code style="background:var(--s2);padding:6px 10px;border-radius:6px;font-size:12px;color:var(--ink)">madarekelite.com/dl/thu</code>
                <button onclick="window.copyLeakDlLink('https://madarekelite.com/dl/thu')" style="background:var(--ps);color:var(--pri);border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">نسخ</button>
            </div>
        </div>

        <div class="card" style="padding:0;overflow:hidden">
            <div style="padding:16px 18px;border-bottom:1px solid var(--ln)">
                <div style="font-size:15px;font-weight:800;color:var(--ink)">جدول التحميلات</div>
                <div style="font-size:12px;color:var(--i3);margin-top:4px;line-height:1.7">رابط لكل مجموعة فردياً: <code style="background:var(--s2);padding:2px 6px;border-radius:4px;font-size:11px">madarekelite.com/dl.html?id=&lt;leak_group_id&gt;</code></div>
            </div>
            <div class="tbl-wrap" style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead style="background:var(--s2)">
                <tr style="text-align:right">
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">المجموعة</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">القسم</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">التاريخ</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">الأسئلة</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">PDF</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">التحميلات</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">رُفِع في</th>
                  <th style="padding:10px 12px;font-weight:700;color:var(--i2);border-bottom:1px solid var(--ln)">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${groups.map(g => {
                    const sectionLabel = SECTION_LABELS[g.section] || g.section || '—';
                    const dateStr = g.leak_date ? new Date(g.leak_date).toLocaleDateString('ar-SA', {day:'numeric', month:'short', year:'numeric'}) : '—';
                    const uploadedStr = g.pdf_uploaded_at ? new Date(g.pdf_uploaded_at).toLocaleDateString('ar-SA', {day:'numeric', month:'short'}) : '—';
                    const hasPdf = !!g.pdf_url;
                    const downloads = g.pdf_downloads || 0;
                    const dlUrl = 'https://madarekelite.com/dl.html?id=' + g.id;
                    return `
                    <tr style="border-bottom:1px solid var(--ln)">
                      <td style="padding:11px 12px;font-weight:700;color:var(--ink)">
                        ${g.accent_color ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+g.accent_color+';margin-left:6px;vertical-align:middle"></span>' : ''}
                        ${esc(g.title)}
                      </td>
                      <td style="padding:11px 12px"><span style="background:var(--ps);color:var(--pri);padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700">${esc(sectionLabel)}</span></td>
                      <td style="padding:11px 12px;color:var(--i3);font-size:12px">${dateStr}</td>
                      <td style="padding:11px 12px;color:var(--i2)">${g.question_count || 0}</td>
                      <td style="padding:11px 12px">${hasPdf ? '<span style="color:var(--suc);font-weight:700;font-size:12px">✓ مرفوع</span>' : '<span style="color:var(--i4);font-size:12px">— لم يُرفع</span>'}</td>
                      <td style="padding:11px 12px;font-weight:800;color:${downloads>0?'var(--suc)':'var(--i4)'};font-size:15px">${downloads.toLocaleString('ar-SA')}</td>
                      <td style="padding:11px 12px;color:var(--i3);font-size:12px">${uploadedStr}</td>
                      <td style="padding:11px 12px">
                        ${hasPdf ? `
                          <button onclick="window.copyLeakDlLink('${esc(dlUrl)}')" style="background:var(--ps);color:var(--pri);border:none;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px">📋 نسخ الرابط</button>
                          <a href="${esc(g.pdf_url)}" target="_blank" rel="noopener" style="display:inline-block;background:var(--s3);color:var(--i2);padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none">👁️ معاينة</a>
                        ` : '<span style="color:var(--i4);font-size:11px">ارفع يدوياً من Storage</span>'}
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
            </div>
        </div>

        <div class="card" style="margin-top:14px;padding:16px 18px">
            <div style="font-size:14px;font-weight:800;color:var(--ink);margin-bottom:10px">كيف يعمل عدّاد التحميلات؟</div>
            <ul style="line-height:1.9;font-size:13px;color:var(--i2);padding-inline-start:18px;margin:0">
                <li>الزائر يفتح <code style="background:var(--s2);padding:2px 5px;border-radius:4px">madarekelite.com/dl.html?id=&lt;leak_group_id&gt;</code></li>
                <li>يضغط زر "حمّل PDF" → JS يستدعي RPC <code style="background:var(--s2);padding:2px 5px;border-radius:4px">increment_pdf_download(id)</code></li>
                <li>الـRPC يزيد <code>pdf_downloads</code> ويرجع رابط <code>pdf_url</code></li>
                <li>المتصفّح يبدأ تحميل الملف الحقيقي من Supabase Storage</li>
                <li>أي شخص بالرابط يقدر يحمّل (بدون اشتراك) — العدّاد يتحدّث فوراً</li>
            </ul>
        </div>
        `;
    } catch(e) {
        console.error(e);
        c.innerHTML = '<div class="empty"><div class="empty-ic">⚠️</div><div class="empty-t">حدث خطأ</div><div class="empty-d">'+(e.message||'')+'</div></div>';
    }
};

window.copyLeakDlLink = function(url) {
    navigator.clipboard.writeText(url).then(() => {
        if (typeof showSaveToast === 'function') showSaveToast('تم نسخ الرابط', 'success');
        else alert('تم نسخ الرابط: ' + url);
    }).catch(() => {
        prompt('انسخ الرابط:', url);
    });
};

window.loadMockExams = async function() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    $c().innerHTML = `
    <div id="mockExamsArea">
      <div class="card">
        <div class="card-hdr">
          <div class="card-hdr-l">
            <div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M9 11l3 3 8-8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>
            <div><div class="card-title">الاختبارات المحاكية</div><div class="card-sub">كل اختبار له toggle مستقل — أوقفه لإخفاء بنره من الصفحة الرئيسية فوراً</div></div>
          </div>
          <button class="btn btn-pri" onclick="openMockExamForm()">
            <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            اختبار جديد
          </button>
        </div>
        <div class="tbl-wrap" id="mockExamsTable"><div class="loader">جاري التحميل...</div></div>
      </div>

      <div id="mockExamDetail" style="display:none;margin-top:18px"></div>
    </div>`;

    try {
        if (isPreview) {
            renderMockExamsTable([
                { id: '1', exam_type: 'tahsili', title: 'محاكي التحصيلي — جلسة 1', starts_at: new Date(Date.now() + 86400000).toISOString(), duration_min: 125, questions_count: 160, total_registered: 28, total_completed: 0, avg_correct: null, is_active: true },
                { id: '2', exam_type: 'qudurat_computer', title: 'محاكي قدرات محوسب', starts_at: new Date(Date.now() - 86400000*2).toISOString(), duration_min: 100, questions_count: 96, quant_count: 48, verbal_count: 48, total_registered: 45, total_completed: 38, avg_correct: 71.3, is_active: true }
            ]);
        } else {
            const { data, error } = await sb.rpc('admin_list_all_mock_exams');
            if (error) throw error;
            renderMockExamsTable(data || []);
        }
    } catch(e) {
        document.getElementById('mockExamsTable').innerHTML = '<div class="empty"><div class="empty-t">تعذّر تحميل القائمة</div><div class="empty-s">'+esc(e.message||'')+'</div></div>';
    }
};

function renderMockExamsTable(rows) {
    if (!rows.length) {
        document.getElementById('mockExamsTable').innerHTML = '<div class="empty"><div class="empty-ic">📋</div><div class="empty-t">لا توجد اختبارات</div><div class="empty-s">اضغط "اختبار جديد" لإنشاء أوّل اختبار محاكي</div></div>';
        return;
    }
    const now = new Date();
    const html = `
    <table class="tbl">
      <thead><tr>
        <th>العنوان</th><th>النوع</th><th>الموعد</th><th>المدة</th><th>الأسئلة</th><th>المسجّلون</th><th>المؤدّون</th><th>المعدل</th><th>الحالة</th><th>البنر</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.map(e => {
            const t = EXAM_TYPE_MAP[e.exam_type] || { name: e.exam_type, color: '#6B7094' };
            const starts = new Date(e.starts_at);
            const ends = new Date(starts.getTime() + (e.duration_min||0)*60000);
            let phase = 'upcoming', phaseTxt = 'قادم', phaseColor = '#6D5DF6';
            if (now >= starts && now < ends) { phase = 'live'; phaseTxt = 'مباشر الآن'; phaseColor = '#EF4444'; }
            else if (now >= ends) { phase = 'past'; phaseTxt = 'انتهى'; phaseColor = '#9EA2B8'; }
            const dist = (e.exam_type === 'qudurat_computer' || e.exam_type === 'qudurat_paper')
                ? `<div style="font-size:10px;color:#6B7094;margin-top:2px">${e.quant_count||0} كمي + ${e.verbal_count||0} لفظي</div>` : '';
            const isOn = e.is_active !== false;
            return `<tr>
              <td><div style="font-weight:700">${esc(e.title)}</div>${dist}</td>
              <td><span style="background:${t.color}22;color:${t.color};padding:3px 9px;border-radius:8px;font-size:11px;font-weight:700">${esc(t.name)}</span></td>
              <td style="font-size:12px">${fmtDate(starts, true)}</td>
              <td>${e.duration_min} د</td>
              <td>${e.questions_count}</td>
              <td>${fmt(e.total_registered)}</td>
              <td>${fmt(e.total_completed)}</td>
              <td>${e.avg_correct != null ? e.avg_correct + '%' : '—'}</td>
              <td><span style="background:${phaseColor}22;color:${phaseColor};padding:3px 9px;border-radius:8px;font-size:11px;font-weight:700">${phaseTxt}</span></td>
              <td><div class="toggle-big-wrap ${isOn?'is-on':''}" onclick="toggleMockExamActive('${e.id}', this)" title="${isOn?'البنر ظاهر للطلاب — اضغط لإخفائه':'البنر مخفي — اضغط لإظهاره'}" style="display:inline-flex"><div class="toggle-big ${isOn?'on':''}"></div></div></td>
              <td>
                <button class="btn-icon" onclick="openMockExamDetail('${e.id}')" title="تفاصيل" style="margin-left:4px"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                <button class="btn-icon" onclick="editMockExam('${e.id}')" title="تعديل"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="btn-icon" onclick="deleteMockExam('${e.id}','${esc(e.title).replace(/'/g,"\\'")}')" title="حذف" style="color:#EF4444"><svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
    document.getElementById('mockExamsTable').innerHTML = html;
    window._mockExams = rows;
}

window.openMockExamForm = function(exam) {
    const isEdit = !!exam;
    const title = exam?.title || '';
    const type = exam?.exam_type || 'tahsili';
    const starts = exam?.starts_at ? new Date(exam.starts_at) : new Date(Date.now() + 86400000);
    const dt = starts.toISOString().slice(0,16);
    const dur = exam?.duration_min || EXAM_TYPE_MAP[type].dur;
    const qc = exam?.questions_count || EXAM_TYPE_MAP[type].q;
    const quant = exam?.quant_count != null ? exam.quant_count : Math.floor(qc/2);
    const verbal = exam?.verbal_count != null ? exam.verbal_count : (qc - Math.floor(qc/2));

    const html = `
    <div class="modal-overlay" id="mxFormOverlay" onclick="if(event.target.id==='mxFormOverlay')closeMockExamForm()" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto">
      <div style="background:#fff;border-radius:18px;max-width:520px;width:100%;padding:24px;max-height:92vh;overflow:auto">
        <h3 style="font-size:17px;font-weight:800;margin-bottom:6px">${isEdit ? 'تعديل اختبار محاكي' : 'إنشاء اختبار محاكي'}</h3>
        <p style="font-size:12.5px;color:#6B7094;margin-bottom:16px">سيتم اختيار الأسئلة عشوائياً من المخزون عند بداية الاختبار، موزّعة حسب القسم.</p>

        <div class="form-field full" style="margin-bottom:12px">
          <label class="form-label">نوع الاختبار</label>
          <select class="form-input" id="mxType" onchange="mxTypeChanged()" ${isEdit ? 'disabled' : ''}>
            <option value="tahsili" ${type==='tahsili'?'selected':''}>محاكي التحصيلي</option>
            <option value="qudurat_computer" ${type==='qudurat_computer'?'selected':''}>محاكي القدرات (محوسب)</option>
            <option value="qudurat_paper" ${type==='qudurat_paper'?'selected':''}>محاكي القدرات (ورقي)</option>
            <option value="custom" ${type==='custom'?'selected':''}>مخصّص</option>
          </select>
        </div>

        <div class="form-field full" style="margin-bottom:12px">
          <label class="form-label">العنوان</label>
          <input class="form-input" id="mxTitle" value="${esc(title)}" placeholder="مثال: محاكي التحصيلي — جلسة الإثنين">
        </div>

        <div class="form-field full" style="margin-bottom:12px">
          <label class="form-label">تاريخ البداية (ميلادي)</label>
          <div id="mxDtWidget"></div>
          <input type="hidden" id="mxStart" value="${dt}">
        </div>

        <div class="form-field full" style="margin-bottom:12px">
          <label class="form-label">المدة (دقيقة)</label>
          <input class="form-input" type="number" id="mxDur" value="${dur}" min="5" max="300">
        </div>

        <div class="form-field full" style="margin-bottom:12px">
          <label class="form-label">عدد الأسئلة الإجمالي</label>
          <input class="form-input" type="number" id="mxQ" value="${qc}" min="5" max="300" oninput="mxAutoSplit()">
        </div>

        <div id="mxQuduratSplit" style="display:${(type==='qudurat_computer'||type==='qudurat_paper')?'block':'none'}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="form-field">
              <label class="form-label">أسئلة كمي</label>
              <input class="form-input" type="number" id="mxQuant" value="${quant}" min="0" oninput="mxSyncVerbal()">
            </div>
            <div class="form-field">
              <label class="form-label">أسئلة لفظي</label>
              <input class="form-input" type="number" id="mxVerbal" value="${verbal}" min="0" oninput="mxSyncQuant()">
            </div>
          </div>
        </div>

        <div id="mxAvail" style="font-size:11.5px;color:#6B7094;margin-bottom:14px;padding:10px;background:#F0EDE7;border-radius:10px;line-height:1.7"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn" onclick="closeMockExamForm()">إلغاء</button>
          <button class="btn btn-pri" id="mxSave" onclick="saveMockExam(${isEdit ? "'"+exam.id+"'" : 'null'})">${isEdit ? 'حفظ التعديلات' : 'إنشاء'}</button>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    mxInitDtWidget(starts);
    mxRefreshAvail();
};

window.closeMockExamForm = function() {
    document.getElementById('mxFormOverlay')?.remove();
};

// ════ تقويم ميلادي مخصّص (modern, RTL-friendly) ════
const MX_MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MX_DOW_AR = ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
let _mxPickerDate = null;     // Date object الحالي للعرض
let _mxPickerView = null;     // الشهر المعروض حالياً (Date)

function mxInitDtWidget(initial) {
    const host = document.getElementById('mxDtWidget');
    if (!host) return;
    _mxPickerDate = initial instanceof Date ? new Date(initial.getTime()) : new Date(initial);
    _mxPickerView = new Date(_mxPickerDate.getFullYear(), _mxPickerDate.getMonth(), 1);

    host.innerHTML = `
      <button type="button" class="mxdt-trigger" id="mxDtTrigger" onclick="mxToggleDtPopup()" style="width:100%;padding:12px 14px;border:1.5px solid var(--ln2,#ccc);border-radius:10px;background:var(--sf,#fff);text-align:right;font-family:inherit;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s">
        <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:var(--pri,#6D5DF6);fill:none;stroke-width:2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span id="mxDtLabel" style="flex:1"></span>
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#9EA2B8;fill:none;stroke-width:2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div id="mxDtPopup" style="display:none;position:relative;margin-top:8px;background:var(--sf,#fff);border:1px solid var(--ln,rgba(0,0,0,.08));border-radius:14px;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,.12);z-index:10"></div>
    `;
    mxUpdateDtLabel();
}

function mxUpdateDtLabel() {
    const lbl = document.getElementById('mxDtLabel');
    if (!lbl || !_mxPickerDate) return;
    const d = _mxPickerDate;
    const day = d.getDate();
    const mon = MX_MONTHS_AR[d.getMonth()];
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2,'0');
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12;
    lbl.textContent = `${day} ${mon} ${year} — ${h}:${m} ${ampm}`;
    // ضع القيمة في الحقل المخفي بصيغة ISO local (لـsave)
    const hidden = document.getElementById('mxStart');
    if (hidden) {
        const tz = d.getTimezoneOffset();
        const local = new Date(d.getTime() - tz*60000).toISOString().slice(0,16);
        hidden.value = local;
    }
}

window.mxToggleDtPopup = function() {
    const p = document.getElementById('mxDtPopup');
    if (!p) return;
    if (p.style.display === 'none') {
        p.style.display = 'block';
        mxRenderCalendar();
    } else {
        p.style.display = 'none';
    }
};

function mxRenderCalendar() {
    const p = document.getElementById('mxDtPopup');
    if (!p) return;
    const view = _mxPickerView;
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const sel = _mxPickerDate;

    // بناء صفوف الأيام (ابدأ من الأحد، 7 أعمدة، 6 صفوف)
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push({ empty: true });
    for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month, d);
        const isToday = dt.toDateString() === today.toDateString();
        const isSel = sel && dt.toDateString() === sel.toDateString();
        const isPast = dt < new Date(today.getFullYear(), today.getMonth(), today.getDate());
        cells.push({ d, isToday, isSel, isPast });
    }
    while (cells.length % 7 !== 0) cells.push({ empty: true });

    const h = sel ? sel.getHours() : 9;
    const m = sel ? sel.getMinutes() : 0;
    const h12 = h % 12 || 12;
    const ampm = h >= 12 ? 'pm' : 'am';

    p.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button type="button" onclick="mxNavMonth(-1)" style="width:32px;height:32px;border-radius:8px;background:var(--ps,#f0edf9);color:var(--pri,#6D5DF6);border:none;cursor:pointer;display:grid;place-items:center" aria-label="الشهر السابق">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <div style="font-weight:800;font-size:14.5px">${MX_MONTHS_AR[month]} ${year}</div>
        <button type="button" onclick="mxNavMonth(1)" style="width:32px;height:32px;border-radius:8px;background:var(--ps,#f0edf9);color:var(--pri,#6D5DF6);border:none;cursor:pointer;display:grid;place-items:center" aria-label="الشهر التالي">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2.4"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:6px">
        ${MX_DOW_AR.map(d => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:#6B7094;padding:4px 0">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${cells.map(c => {
            if (c.empty) return '<div></div>';
            const bg = c.isSel ? 'background:#6D5DF6;color:#fff;border-color:#6D5DF6' :
                       c.isToday ? 'background:rgba(245,158,11,.15);color:#92400E;border-color:rgba(245,158,11,.4)' :
                       c.isPast ? 'color:#9EA2B8' : '';
            return `<button type="button" onclick="mxPickDay(${c.d})" style="aspect-ratio:1;border-radius:8px;background:transparent;border:1px solid var(--ln,rgba(0,0,0,.08));font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;${bg}">${c.d}</button>`;
        }).join('')}
      </div>

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--ln,rgba(0,0,0,.08))">
        <div style="font-size:11.5px;font-weight:700;color:#3D4058;margin-bottom:8px">⏰ الوقت</div>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="mxHour" onchange="mxUpdateTime()" style="flex:1;padding:8px 10px;border:1.5px solid var(--ln2,#ccc);border-radius:8px;font-family:inherit;font-size:13px;font-weight:700">
            ${[1,2,3,4,5,6,7,8,9,10,11,12].map(hh => `<option value="${hh}" ${hh===h12?'selected':''}>${hh}</option>`).join('')}
          </select>
          <span style="font-weight:800">:</span>
          <select id="mxMin" onchange="mxUpdateTime()" style="flex:1;padding:8px 10px;border:1.5px solid var(--ln2,#ccc);border-radius:8px;font-family:inherit;font-size:13px;font-weight:700">
            ${['00','05','10','15','20','25','30','35','40','45','50','55'].map(mm => `<option value="${mm}" ${parseInt(mm)===m?'selected':''}>${mm}</option>`).join('')}
          </select>
          <select id="mxAmPm" onchange="mxUpdateTime()" style="flex:1;padding:8px 10px;border:1.5px solid var(--ln2,#ccc);border-radius:8px;font-family:inherit;font-size:13px;font-weight:700">
            <option value="am" ${ampm==='am'?'selected':''}>صباحاً</option>
            <option value="pm" ${ampm==='pm'?'selected':''}>مساءً</option>
          </select>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" onclick="mxToggleDtPopup()" style="flex:1;padding:10px;border-radius:8px;background:var(--s2,#f5f3ef);color:var(--ink,#1A1D2E);border:none;font-family:inherit;font-weight:700;cursor:pointer">تأكيد</button>
      </div>
    `;
}

window.mxNavMonth = function(delta) {
    _mxPickerView = new Date(_mxPickerView.getFullYear(), _mxPickerView.getMonth() + delta, 1);
    mxRenderCalendar();
};

window.mxPickDay = function(d) {
    const v = _mxPickerView;
    _mxPickerDate.setFullYear(v.getFullYear(), v.getMonth(), d);
    mxUpdateDtLabel();
    mxRenderCalendar();
};

window.mxUpdateTime = function() {
    const h12 = parseInt(document.getElementById('mxHour').value) || 12;
    const mm = parseInt(document.getElementById('mxMin').value) || 0;
    const ampm = document.getElementById('mxAmPm').value;
    let h24 = h12 % 12;
    if (ampm === 'pm') h24 += 12;
    _mxPickerDate.setHours(h24, mm, 0, 0);
    mxUpdateDtLabel();
};

window.mxTypeChanged = function() {
    const t = document.getElementById('mxType').value;
    const meta = EXAM_TYPE_MAP[t] || EXAM_TYPE_MAP.custom;
    document.getElementById('mxQ').value = meta.q;
    document.getElementById('mxDur').value = meta.dur;
    document.getElementById('mxQuduratSplit').style.display = (t==='qudurat_computer'||t==='qudurat_paper') ? 'block' : 'none';
    mxAutoSplit();
    mxRefreshAvail();
};

window.mxAutoSplit = function() {
    const t = document.getElementById('mxType').value;
    if (t!=='qudurat_computer' && t!=='qudurat_paper') { mxRefreshAvail(); return; }
    const total = parseInt(document.getElementById('mxQ').value) || 0;
    const half = Math.floor(total/2);
    document.getElementById('mxQuant').value = half;
    document.getElementById('mxVerbal').value = total - half;
    mxRefreshAvail();
};

window.mxSyncVerbal = function() {
    const total = parseInt(document.getElementById('mxQ').value) || 0;
    const q = parseInt(document.getElementById('mxQuant').value) || 0;
    document.getElementById('mxVerbal').value = Math.max(0, total - q);
    mxRefreshAvail();
};
window.mxSyncQuant = function() {
    const total = parseInt(document.getElementById('mxQ').value) || 0;
    const v = parseInt(document.getElementById('mxVerbal').value) || 0;
    document.getElementById('mxQuant').value = Math.max(0, total - v);
    mxRefreshAvail();
};

// يحسب التوزيع المتساوي على n مواد
function _splitEvenly(total, n) {
    if (n <= 0) return [];
    const base = Math.floor(total / n);
    const remainder = total - base * n;
    const arr = new Array(n).fill(base);
    for (let i = 0; i < remainder; i++) arr[i] += 1;
    return arr;
}

function _renderDistribution(label, breakdown, totalNeeded) {
    // فلترة "غير محدد" / sub_section فارغ — لا تعرض في الواجهة (مربك للأدمن)
    breakdown = (breakdown || []).filter(r => r.sub_section && String(r.sub_section).trim() && r.sub_section !== 'غير محدد');
    if (!breakdown.length) return `<div style="color:#EF4444">لا توجد أسئلة في ${esc(label)}</div>`;
    const parts = _splitEvenly(totalNeeded, breakdown.length);
    let warn = false;
    const rows = breakdown.map((row, i) => {
        const need = parts[i];
        const have = row.available || 0;
        const ok = have >= need;
        if (!ok) warn = true;
        return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px">
          <span>${esc(row.sub_section)}</span>
          <span>${need} من ${have} ${ok ? '<span style="color:#22C55E">✓</span>' : '<span style="color:#EF4444">ناقص</span>'}</span>
        </div>`;
    }).join('');
    return `<div style="margin-bottom:8px"><b>${esc(label)}:</b> ${totalNeeded} سؤال على ${breakdown.length} ${breakdown.length===1?'مادة':'مواد'}</div>${rows}${warn?'<div style="color:#EF4444;font-size:11px;margin-top:6px">⚠️ بعض المواد فيها أسئلة أقل من المطلوب — رفع المزيد قبل الموعد</div>':''}`;
}

async function mxRefreshAvail() {
    const { sb } = window.A;
    const t = document.getElementById('mxType').value;
    const totalNeeded = parseInt(document.getElementById('mxQ').value) || 0;
    const div = document.getElementById('mxAvail');
    if (!div) return;
    div.innerHTML = 'جاري فحص التوزيع...';

    try {
        const isPreview = new URLSearchParams(window.location.search).has('preview');

        async function getBreakdown(section) {
            if (isPreview) {
                if (section === 'tahsili') return [{sub_section:'فيزياء',available:120},{sub_section:'كيمياء',available:115},{sub_section:'أحياء',available:98},{sub_section:'رياضيات',available:140},{sub_section:'لغة إنجليزية',available:60}];
                if (section === 'quant')   return [{sub_section:'حساب',available:80},{sub_section:'جبر',available:65},{sub_section:'هندسة',available:50},{sub_section:'مقارنات',available:45}];
                if (section === 'verbal')  return [{sub_section:'تناظر',available:70},{sub_section:'تكملة',available:60},{sub_section:'استيعاب',available:55},{sub_section:'خطأ سياقي',available:40},{sub_section:'إكمال جمل',available:38}];
                return [];
            }
            const { data, error } = await sb.rpc('admin_get_section_breakdown', { p_section: section });
            if (error) throw error;
            return data || [];
        }

        if (t === 'qudurat_computer' || t === 'qudurat_paper') {
            const qNeed = parseInt(document.getElementById('mxQuant').value) || 0;
            const vNeed = parseInt(document.getElementById('mxVerbal').value) || 0;
            const [qB, vB] = await Promise.all([getBreakdown('quant'), getBreakdown('verbal')]);
            div.innerHTML = `<div style="font-weight:700;margin-bottom:8px">📊 توزيع تلقائي على المواد:</div>${_renderDistribution('قدرات كمي', qB, qNeed)}<div style="margin-top:10px">${_renderDistribution('قدرات لفظي', vB, vNeed)}</div>`;
        } else if (t === 'tahsili') {
            const b = await getBreakdown('tahsili');
            div.innerHTML = `<div style="font-weight:700;margin-bottom:8px">📊 توزيع متساوٍ على المواد:</div>${_renderDistribution('تحصيلي', b, totalNeeded)}`;
        } else {
            const r = isPreview ? { count: 3500 } : await sb.from('questions').select('*',{count:'exact',head:true}).eq('disabled',false);
            div.innerHTML = `📊 المخزون الإجمالي: ${r.count||0} (نحتاج ${totalNeeded})`;
        }
    } catch(e) {
        div.innerHTML = 'تعذّر فحص التوزيع: ' + esc(e.message||'');
    }
}

window.saveMockExam = async function(examId) {
    const { sb } = window.A;
    const btn = document.getElementById('mxSave');
    const type = document.getElementById('mxType').value;
    const title = document.getElementById('mxTitle').value.trim();
    const startsLocal = document.getElementById('mxStart').value;
    const dur = parseInt(document.getElementById('mxDur').value) || 0;
    const qc = parseInt(document.getElementById('mxQ').value) || 0;
    const isQudurat = (type==='qudurat_computer'||type==='qudurat_paper');
    const quant = isQudurat ? (parseInt(document.getElementById('mxQuant').value) || 0) : null;
    const verbal = isQudurat ? (parseInt(document.getElementById('mxVerbal').value) || 0) : null;

    if (!title) { showToast('أدخل عنوان الاختبار', 'err'); return; }
    if (!startsLocal) { showToast('حدّد تاريخ البداية', 'err'); return; }
    if (dur < 5 || qc < 5) { showToast('المدة أو عدد الأسئلة قليل جداً', 'err'); return; }
    if (isQudurat && (quant + verbal) !== qc) { showToast('مجموع كمي + لفظي يجب يساوي العدد الإجمالي', 'err'); return; }

    btn.disabled = true; btn.textContent = 'جارٍ الحفظ...';
    try {
        const startsAt = new Date(startsLocal).toISOString();
        if (examId) {
            const { error } = await sb.rpc('admin_update_mock_exam', {
                p_exam_id: examId, p_title: title, p_starts_at: startsAt,
                p_duration_min: dur, p_questions_count: qc,
                p_quant_count: quant, p_verbal_count: verbal,
                p_is_active: null
            });
            if (error) throw error;
            showToast('تم حفظ التعديلات', 'suc');
        } else {
            const { error } = await sb.rpc('admin_create_mock_exam', {
                p_exam_type: type, p_title: title, p_starts_at: startsAt,
                p_duration_min: dur, p_questions_count: qc,
                p_quant_count: quant, p_verbal_count: verbal
            });
            if (error) throw error;
            showToast('تم إنشاء الاختبار', 'suc');
        }
        closeMockExamForm();
        loadMockExams();
    } catch(e) {
        showToast('خطأ: ' + (e.message||''), 'err');
        btn.disabled = false; btn.textContent = examId ? 'حفظ التعديلات' : 'إنشاء';
    }
};

window.editMockExam = function(id) {
    const exam = (window._mockExams || []).find(e => e.id === id);
    if (!exam) return;
    openMockExamForm(exam);
};

window.deleteMockExam = async function(id, title) {
    const { sb } = window.A;
    if (!confirm('حذف "' + title + '"? لا يمكن التراجع. كل التسجيلات والإجابات ستُحذف.')) return;
    try {
        const { error } = await sb.rpc('admin_delete_mock_exam', { p_exam_id: id });
        if (error) throw error;
        showToast('تم الحذف', 'suc');
        loadMockExams();
    } catch(e) { showToast('خطأ: ' + (e.message||''), 'err'); }
};

window.toggleMockExamActive = async function(id, wrap) {
    const { sb } = window.A;
    wrap.classList.toggle('is-on');
    const inner = wrap.querySelector('.toggle-big');
    if (inner) inner.classList.toggle('on');
    const newState = wrap.classList.contains('is-on');
    wrap.title = newState ? 'البنر ظاهر للطلاب — اضغط لإخفائه' : 'البنر مخفي — اضغط لإظهاره';
    try {
        const { error } = await sb.rpc('admin_set_mock_exam_active', { p_exam_id: id, p_is_active: newState });
        if (error) throw error;
        showSaveToast(newState ? 'تم إظهار البنر للطلاب' : 'تم إخفاء البنر — لن يظهر في الصفحة الرئيسية', 'suc');
    } catch(e) {
        // Revert on error
        wrap.classList.toggle('is-on');
        if (inner) inner.classList.toggle('on');
        showSaveToast('خطأ: ' + (e.message||''), 'err');
    }
};

window.openMockExamDetail = async function(id) {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    const div = document.getElementById('mockExamDetail');
    div.style.display = 'block';
    div.innerHTML = '<div class="loader">جاري التحميل...</div>';

    let detail;
    try {
        if (isPreview) {
            detail = { exam: (window._mockExams||[]).find(e=>e.id===id), stats: { total_registered:28, total_completed:18, avg_correct_pct:72.4, avg_duration_min:88.5, top_score:142, lowest_score:54 } };
        } else {
            const { data, error } = await sb.rpc('admin_get_mock_exam_detail', { p_exam_id: id });
            if (error) throw error;
            detail = data;
        }
        if (!detail) { div.innerHTML = '<div class="empty"><div class="empty-t">الاختبار غير موجود</div></div>'; return; }
        renderMockExamDetail(detail);
        window._mockExamCurrent = id;
        loadMockExamTab('registered');
    } catch(e) {
        div.innerHTML = '<div class="empty"><div class="empty-t">تعذّر التحميل</div><div class="empty-s">'+esc(e.message||'')+'</div></div>';
    }
};

function renderMockExamDetail(d) {
    const e = d.exam;
    const s = d.stats || {};
    const t = EXAM_TYPE_MAP[e.exam_type] || { name: e.exam_type, color: '#6B7094' };
    document.getElementById('mockExamDetail').innerHTML = `
    <div class="card">
      <div class="card-hdr">
        <div class="card-hdr-l">
          <div class="card-ic" style="background:${t.color}22;color:${t.color}"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2"><path d="M9 11l3 3 8-8"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
          <div><div class="card-title">${esc(e.title)}</div><div class="card-sub">${esc(t.name)} · ${e.questions_count} سؤال · ${e.duration_min} د</div></div>
        </div>
        <button class="btn" onclick="document.getElementById('mockExamDetail').style.display='none'">إغلاق</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:0 16px 14px">
        <div class="kpi pur"><div class="kpi-label">المسجّلون</div><div class="kpi-val">${fmt(s.total_registered)}</div><div class="kpi-sub">${fmt(s.total_completed)} أدّوا</div></div>
        <div class="kpi green"><div class="kpi-label">معدّل الصح</div><div class="kpi-val">${s.avg_correct_pct != null ? s.avg_correct_pct + '%' : '—'}</div><div class="kpi-sub">من المؤدّين</div></div>
        <div class="kpi blue"><div class="kpi-label">متوسط الوقت</div><div class="kpi-val">${s.avg_duration_min != null ? s.avg_duration_min + ' د' : '—'}</div><div class="kpi-sub">للاختبار الكامل</div></div>
        <div class="kpi orange"><div class="kpi-label">أعلى نتيجة</div><div class="kpi-val">${fmt(s.top_score)}</div><div class="kpi-sub">من ${e.questions_count}</div></div>
      </div>

      <div class="q-filter-row" style="padding:0 16px 12px">
        <button class="q-filter-btn on" data-tab="registered" onclick="loadMockExamTab('registered')">المسجّلون</button>
        <button class="q-filter-btn"    data-tab="completed"  onclick="loadMockExamTab('completed')">المؤدّون</button>
        <button class="q-filter-btn"    data-tab="leaders"    onclick="loadMockExamTab('leaders')">المتصدّرون</button>
        <button class="q-filter-btn"    data-tab="stats"      onclick="loadMockExamTab('stats')">الإحصائيات</button>
      </div>

      <div class="tbl-wrap" id="mockExamTabBody"><div class="loader">جاري التحميل...</div></div>
    </div>`;
    window._mockExamDetail = d;
}

window.loadMockExamTab = async function(tab) {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    document.querySelectorAll('#mockExamDetail .q-filter-btn').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const body = document.getElementById('mockExamTabBody');
    if (!body) return;
    body.innerHTML = '<div class="loader">جاري التحميل...</div>';
    const examId = window._mockExamCurrent;

    try {
        if (tab === 'registered') {
            let rows = [];
            if (isPreview) {
                rows = [
                    { user_id:'u1', full_name:'محمد العتيبي', email:'m@x.com', registered_at:new Date().toISOString(), score_correct:null, score_total:null, rank_position:null },
                    { user_id:'u2', full_name:'سعد الزهراني', email:'s@x.com', registered_at:new Date(Date.now()-3600000).toISOString(), score_correct:null, score_total:null, rank_position:null }
                ];
            } else {
                const { data, error } = await sb.rpc('admin_list_mock_exam_registrations', { p_exam_id: examId });
                if (error) throw error;
                rows = data || [];
            }
            if (!rows.length) { body.innerHTML = '<div class="empty"><div class="empty-t">لا يوجد مسجّلون بعد</div></div>'; return; }
            body.innerHTML = `<table class="tbl"><thead><tr><th>الاسم</th><th>الإيميل</th><th>تاريخ التسجيل</th><th>الحالة</th></tr></thead><tbody>
              ${rows.map(r => `<tr>
                <td style="font-weight:600">${esc(r.full_name||'مستخدم')}</td>
                <td style="font-size:11.5px;color:#6B7094">${esc(r.email||'')}</td>
                <td>${fmtDate(r.registered_at, true)}</td>
                <td>${r.submitted_at ? '<span style="color:#22C55E">أدّى</span>' : '<span style="color:#F59E0B">لم يبدأ</span>'}</td>
              </tr>`).join('')}
            </tbody></table>`;

        } else if (tab === 'completed') {
            let rows = [];
            if (isPreview) {
                rows = [
                    { user_id:'u1', full_name:'محمد العتيبي', email:'m@x.com', started_at:new Date().toISOString(), submitted_at:new Date().toISOString(), duration_min:88, score_correct:142, score_total:160, score_pct:88.8, rank_position:1 }
                ];
            } else {
                const { data, error } = await sb.rpc('admin_list_mock_exam_completed', { p_exam_id: examId });
                if (error) throw error;
                rows = data || [];
            }
            if (!rows.length) { body.innerHTML = '<div class="empty"><div class="empty-t">لا يوجد مؤدّون بعد</div></div>'; return; }
            body.innerHTML = `<table class="tbl"><thead><tr><th>المرتبة</th><th>الاسم</th><th>النتيجة</th><th>النسبة</th><th>المدة</th><th>تاريخ التسليم</th></tr></thead><tbody>
              ${rows.map(r => `<tr>
                <td style="font-weight:800;color:#6D5DF6">#${r.rank_position||'—'}</td>
                <td style="font-weight:600">${esc(r.full_name||'مستخدم')}</td>
                <td>${r.score_correct}/${r.score_total}</td>
                <td><span style="background:#22C55E22;color:#22C55E;padding:3px 9px;border-radius:8px;font-weight:700">${r.score_pct}%</span></td>
                <td>${r.duration_min} د</td>
                <td style="font-size:11.5px;color:#6B7094">${fmtDate(r.submitted_at, true)}</td>
              </tr>`).join('')}
            </tbody></table>`;

        } else if (tab === 'leaders') {
            let rows = [];
            if (isPreview) {
                rows = [{rank:1,full_name:'محمد العتيبي',score_correct:142,score_total:160,score_pct:88.8,duration_min:88}];
            } else {
                const { data, error } = await sb.rpc('mock_exam_leaderboard', { p_exam_id: examId, p_limit: 50 });
                if (error) throw error;
                rows = data || [];
            }
            if (!rows.length) { body.innerHTML = '<div class="empty"><div class="empty-t">لا متصدّرون بعد</div></div>'; return; }
            body.innerHTML = `<table class="tbl"><thead><tr><th>المرتبة</th><th>الاسم</th><th>النتيجة</th><th>النسبة</th><th>المدة</th></tr></thead><tbody>
              ${rows.map(r => {
                const medal = r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':'';
                return `<tr>
                  <td style="font-weight:800;color:#6D5DF6">${medal} #${r.rank}</td>
                  <td style="font-weight:600">${esc(r.full_name||'مستخدم')}</td>
                  <td>${r.score_correct}/${r.score_total}</td>
                  <td><span style="background:#22C55E22;color:#22C55E;padding:3px 9px;border-radius:8px;font-weight:700">${r.score_pct}%</span></td>
                  <td>${r.duration_min} د</td>
                </tr>`;
              }).join('')}
            </tbody></table>`;

        } else if (tab === 'stats') {
            const s = window._mockExamDetail?.stats || {};
            const e = window._mockExamDetail?.exam || {};
            body.innerHTML = `<div style="padding:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
              <div class="kpi pur"><div class="kpi-label">إجمالي المسجّلين</div><div class="kpi-val">${fmt(s.total_registered)}</div></div>
              <div class="kpi green"><div class="kpi-label">عدد المؤدّين</div><div class="kpi-val">${fmt(s.total_completed)}</div><div class="kpi-sub">نسبة الإكمال ${s.total_registered ? Math.round((s.total_completed/s.total_registered)*100) : 0}%</div></div>
              <div class="kpi blue"><div class="kpi-label">متوسط الإجابات الصحيحة</div><div class="kpi-val">${s.avg_correct_pct != null ? s.avg_correct_pct + '%' : '—'}</div></div>
              <div class="kpi orange"><div class="kpi-label">متوسط الوقت</div><div class="kpi-val">${s.avg_duration_min != null ? s.avg_duration_min + ' د' : '—'}</div><div class="kpi-sub">من أصل ${e.duration_min} د</div></div>
              <div class="kpi green"><div class="kpi-label">أعلى نتيجة</div><div class="kpi-val">${fmt(s.top_score)}</div><div class="kpi-sub">من ${e.questions_count}</div></div>
              <div class="kpi red"><div class="kpi-label">أدنى نتيجة</div><div class="kpi-val">${fmt(s.lowest_score)}</div><div class="kpi-sub">من ${e.questions_count}</div></div>
            </div>`;
        }
    } catch(err) {
        body.innerHTML = '<div class="empty"><div class="empty-t">خطأ في التحميل</div><div class="empty-s">'+esc(err.message||'')+'</div></div>';
    }
};


// ═══════════════════════════════════════════════════════
// PARTNERS — الشركاء (مذيعو لايف تيك توك والمدربون)
// يعتمد على RPCs: admin_list_partners / admin_upsert_partner /
//                  admin_partner_payout / admin_set_partner_active  (migration 20261108020000)
// ═══════════════════════════════════════════════════════
const PT_SITE = 'https://www.madarekelite.com';
const PT_PLAN = { monthly:'شهري', quarterly:'3 شهور', yearly:'سنوي' };
window._partners = window._partners || [];

const PT_MOCK = [
  { id:'11111111-1111-4111-8111-111111111111', slug:'abaad', name:'د. علي الرويس', code:'ABAAD', commission_pct:35, discount_value:15,
    coupon_expires_at:'2026-12-31T20:59:59Z', access_key:'15ef3e29d8dea3a04bc72b7121c2abf8', iban:null, notes:'شريك الإطلاق',
    paid_total:0, last_payout_at:null, is_active:true, created_at:'2026-09-10T07:55:00Z', visits:4, code_users:0, paid_count:0,
    revenue:0, by_plan:{}, commission_total:0, pending:0, coupon_expired:false, payouts:[] },
  { id:'22222222-2222-4222-8222-222222222222', slug:'qudrat-live', name:'حساب تجريبي', code:'LIVE20', commission_pct:30, discount_value:20,
    coupon_expires_at:'2027-02-01T20:59:59Z', access_key:'0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f', iban:'SA7305000068207214490000', notes:null,
    paid_total:200, last_payout_at:'2026-11-01T10:00:00Z', is_active:true, created_at:'2026-10-01T07:55:00Z', visits:312, code_users:19, paid_count:12,
    revenue:1140, by_plan:{monthly:9, quarterly:2, yearly:1}, commission_total:342, pending:142, coupon_expired:false,
    payouts:[{amount:200, note:'تحويل الإنماء', date:'2026-11-01'}] }
];

window.loadPartners = async function() {
    const { sb } = window.A;
    const isPreview = new URLSearchParams(window.location.search).has('preview');

    $c().innerHTML = `
    <div id="ptArea">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px" id="ptKpis"><div class="loader">...</div></div>

        <div class="card">
            <div class="card-hdr">
                <div class="card-hdr-l">
                    <div class="card-ic pur"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
                    <div><div class="card-title">الشركاء</div><div class="card-sub">مذيعو لايف تيك توك والمدربون — كود خصم لكل شريك وعمولة من اشتراكات طلابه</div></div>
                </div>
                <button class="btn btn-pri" onclick="openPartnerForm()" style="margin:0">+ إضافة شريك</button>
            </div>
            <div class="tbl-wrap" id="ptTable"><div class="loader">جاري التحميل...</div></div>
        </div>

        <div class="card" style="margin-top:14px">
            <div class="card-hdr"><div class="card-hdr-l"><div><div class="card-title">كيف يشتغل النظام</div></div></div></div>
            <div style="padding:0 18px 16px;font-size:12.5px;color:var(--i2);line-height:2">
                <div>• رابط الشريك <b style="font-family:monospace;color:var(--pri)">${PT_SITE.replace('https://','')}/p/الكود</b> يحفظ كوده عند الزائر ويطبّقه تلقائياً في صفحة الأسعار.</div>
                <div>• الزيارات تُحسب من هذا الرابط فقط. «أدخلوا الكود» = طلاب وصلوا لمرحلة الدفع بكوده. الإيراد = المدفوع فعلياً بعد الخصم.</div>
                <div>• العمولة = نسبة الشريك من الإيراد المدفوع. المتبقي = العمولة ناقص ما سجّلته له من صرف.</div>
                <div>• لوحة الشريك رابط سري بلا تسجيل دخول — انسخه من زر «لوحته» وأرسله له على الخاص، ولا يُنشر.</div>
                <div>• «إيقاف» ينهي صلاحية كوده فوراً ويقفل لوحته. «تشغيل» يرجّعه ويمدّد الكود سنة.</div>
            </div>
        </div>
    </div>`;

    try {
        let rows;
        if (isPreview) {
            rows = PT_MOCK;
        } else {
            const { data, error } = await sb.rpc('admin_list_partners');
            if (error) throw error;
            rows = Array.isArray(data) ? data : [];
        }
        window._partners = rows;
        renderPartnersKpis(rows);
        renderPartnersTable(rows);
        // أسعار الباقات الحية لحسبة نموذج الإضافة (تفشل بصمت → أسعار افتراضية)
        if (!isPreview && !window._plansCache) {
            try {
                const { data: pl } = await sb.from('plans').select('slug,price').eq('is_active', true).order('price');
                if (Array.isArray(pl) && pl.length) window._plansCache = pl.map(x => ({ slug: x.slug, price: Number(x.price) }));
            } catch(_) {}
        }
    } catch(e) {
        console.error(e);
        document.getElementById('ptKpis').innerHTML = '';
        document.getElementById('ptTable').innerHTML = '<div class="empty-d" style="padding:20px">خطأ في التحميل: ' + esc(e.message||'') + '</div>';
    }
};

function ptNum(v) { return fmt(Math.round(Number(v || 0))); }

function renderPartnersKpis(rows) {
    const active = rows.filter(r => r.is_active);
    const sum = k => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
    document.getElementById('ptKpis').innerHTML = `
    <div class="kpi blue">
        <div class="kpi-label">شركاء نشطون</div>
        <div class="kpi-val">${fmt(active.length)}</div>
        <div class="kpi-sub">${rows.length - active.length ? fmt(rows.length - active.length) + ' موقوف' : 'كل الشركاء شغّالون'}</div>
    </div>
    <div class="kpi green">
        <div class="kpi-label">اشتراكات بأكوادهم</div>
        <div class="kpi-val">${ptNum(sum('paid_count'))}</div>
        <div class="kpi-sub">${ptNum(sum('code_users'))} طالباً أدخلوا كوداً</div>
    </div>
    <div class="kpi gold">
        <div class="kpi-label">إيراد عبر الشركاء</div>
        <div class="kpi-val">${ptNum(sum('revenue'))}</div>
        <div class="kpi-sub">ر.س مدفوعة فعلياً</div>
    </div>
    <div class="kpi orange">
        <div class="kpi-label">عمولات متبقية</div>
        <div class="kpi-val">${ptNum(sum('pending'))}</div>
        <div class="kpi-sub">ر.س — صُرف ${ptNum(sum('paid_total'))} من ${ptNum(sum('commission_total'))}</div>
    </div>`;
}

function ptStatusPill(r) {
    if (!r.is_active) return '<span class="status-pill expired">موقوف</span>';
    if (r.coupon_expired) return '<span class="status-pill pending">الكود منتهٍ</span>';
    return '<span class="status-pill active">نشط</span>';
}

function renderPartnersTable(rows) {
    const el = document.getElementById('ptTable');
    if (!rows.length) {
        el.innerHTML = `<div class="empty" style="padding:36px 20px">
            <div class="empty-t">لا يوجد شركاء بعد</div>
            <div class="empty-d" style="margin-top:6px">أضف أول مذيع: اسمه وكوده ونسبة الخصم والعمولة — ويطلع لك رابط لوحته فوراً</div>
            <button class="btn btn-pri" style="margin-top:14px" onclick="openPartnerForm()">+ إضافة شريك</button>
        </div>`;
        return;
    }
    el.innerHTML = '<table><thead><tr>' +
        '<th>الشريك</th>' +
        '<th>الخصم · العمولة</th>' +
        '<th style="text-align:center">زيارات</th>' +
        '<th style="text-align:center">أدخلوا الكود</th>' +
        '<th>الاشتراكات</th>' +
        '<th>الإيراد</th>' +
        '<th>العمولة</th>' +
        '<th>الحالة</th>' +
        '<th>الإجراءات</th>' +
        '</tr></thead><tbody>' +
        rows.map(r => {
            const plans = Object.entries(r.by_plan || {}).map(([k,v]) => `${PT_PLAN[k] || k} ${fmt(v)}`).join(' · ');
            const exp = r.coupon_expires_at ? fmtDate(r.coupon_expires_at) : '—';
            return `<tr style="${r.is_active ? '' : 'opacity:.6'}">
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div class="tbl-avatar">${esc((r.name||'?').charAt(0))}</div>
                        <div>
                            <div class="td-name">${esc(r.name)}</div>
                            <div style="font-size:10.5px;color:var(--i3);margin-top:2px">
                                <span style="font-family:monospace;color:var(--pri);font-weight:700">${esc(r.code)}</span>
                                · /p/${esc(r.slug)}
                                · منذ ${fmtDate(r.created_at)}
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div><b>${ptNum(r.discount_value)}%</b> <span style="font-size:11px;color:var(--i3)">للطالب</span></div>
                    <div><b>${ptNum(r.commission_pct)}%</b> <span style="font-size:11px;color:var(--i3)">عمولة</span></div>
                    <div style="font-size:10px;color:var(--i3);margin-top:2px">الكود حتى ${exp}</div>
                </td>
                <td style="text-align:center"><b>${ptNum(r.visits)}</b></td>
                <td style="text-align:center"><b>${ptNum(r.code_users)}</b></td>
                <td>
                    <b style="font-size:14px">${ptNum(r.paid_count)}</b>
                    <div style="font-size:10.5px;color:var(--i3)">${esc(plans) || '—'}</div>
                    ${r.last_sale_at ? `<div style="font-size:10px;color:var(--i3)">آخر اشتراك ${fmtDate(r.last_sale_at)}</div>` : ''}
                </td>
                <td><b style="color:var(--suc);font-size:14px">${ptNum(r.revenue)}</b> <span style="font-size:11px;color:var(--i3)">ر.س</span></td>
                <td style="font-size:12px;line-height:1.7">
                    <div>مستحق <b>${ptNum(r.commission_total)}</b></div>
                    <div style="color:var(--i3)">صُرف ${ptNum(r.paid_total)}</div>
                    <div>متبقٍ <b style="color:${Number(r.pending) > 0 ? 'var(--acc)' : 'var(--i3)'}">${ptNum(r.pending)}</b></div>
                </td>
                <td>${ptStatusPill(r)}</td>
                <td>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;max-width:230px">
                        <button class="btn btn-pri" style="padding:5px 9px;font-size:11px" onclick="ptCopy('${PT_SITE}/partner.html?k=${esc(r.access_key)}','رابط لوحة ${esc(r.name)}')" title="نسخ رابط لوحة الشريك (سري)">لوحته</button>
                        <button class="btn btn-ghost" style="padding:5px 9px;font-size:11px" onclick="ptCopy('${PT_SITE}/p/${esc(r.code)}','رابط ${esc(r.name)} للطلاب')" title="نسخ رابط الطلاب">الرابط</button>
                        <button class="btn btn-ghost" style="padding:5px 9px;font-size:11px" onclick="openPartnerForm('${r.id}')">تعديل</button>
                        <button class="btn btn-ghost" style="padding:5px 9px;font-size:11px;color:var(--suc)" onclick="openPartnerPayout('${r.id}')">صرف</button>
                        ${r.is_active
                            ? `<button class="btn btn-ghost" style="padding:5px 9px;font-size:11px;color:var(--dng)" onclick="togglePartner('${r.id}', false)">إيقاف</button>`
                            : `<button class="btn btn-ghost" style="padding:5px 9px;font-size:11px;color:var(--suc)" onclick="togglePartner('${r.id}', true)">تشغيل</button>`}
                    </div>
                </td>
            </tr>`;
        }).join('') +
        '</tbody></table>';
}

window.ptCopy = function(text, label) {
    const done = () => showToast('تم نسخ ' + (label || 'الرابط'), 'suc');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => window.prompt('انسخ الرابط:', text));
    } else {
        window.prompt('انسخ الرابط:', text);
    }
};

// تاريخ انتهاء الكود: نخزّنه 23:59:59 بتوقيت السعودية (= 20:59:59Z)
function ptDateToInput(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const ksa = new Date(d.getTime() + 3 * 3600 * 1000);
    return ksa.toISOString().slice(0, 10);
}
function ptInputToIso(v) {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return v + 'T20:59:59Z';
}
function ptDefaultExpiry() {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
}

window.openPartnerForm = function(id) {
    const r = id ? (window._partners || []).find(p => p.id === id) : null;
    const isEdit = !!r;
    const body = `
    <div style="padding:4px 0">
        <div class="form-field">
            <label class="form-label">اسم الشريك <span style="color:var(--dng)">*</span></label>
            <input class="form-input" id="ptName" value="${esc(r?.name || '')}" placeholder="مثال: أ. محمد العتيبي" autocomplete="off">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-field">
                <label class="form-label">الكود <span style="color:var(--dng)">*</span></label>
                <input class="form-input" id="ptCode" value="${esc(r?.code || '')}" placeholder="مثال: MOHAMMED" autocomplete="off" style="font-family:monospace;text-transform:uppercase" ${isEdit ? 'disabled' : ''}>
                <div style="font-size:10.5px;color:var(--i3);margin-top:4px">${isEdit ? 'الكود لا يتغيّر بعد الإنشاء' : 'حروف إنجليزية كبيرة وأرقام، يدخله الطالب في صفحة الأسعار'}</div>
            </div>
            <div class="form-field">
                <label class="form-label">الرابط المختصر <span style="color:var(--dng)">*</span></label>
                <input class="form-input" id="ptSlug" value="${esc(r?.slug || '')}" placeholder="مثال: mohammed" autocomplete="off" style="font-family:monospace;text-transform:lowercase;direction:ltr" ${isEdit ? 'disabled' : ''}>
                <div style="font-size:10.5px;color:var(--i3);margin-top:4px">${isEdit ? 'الرابط لا يتغيّر بعد الإنشاء' : 'يُستخدم لتتبّع الزيارات — عادةً نفس الكود بحروف صغيرة'}</div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div class="form-field">
                <label class="form-label">خصم الطالب %</label>
                <input class="form-input" id="ptDiscount" type="number" min="1" max="100" value="${r ? Number(r.discount_value || 20) : 20}">
            </div>
            <div class="form-field">
                <label class="form-label">عمولة الشريك %</label>
                <input class="form-input" id="ptCommission" type="number" min="0" max="100" value="${r ? Number(r.commission_pct || 30) : 30}">
            </div>
            <div class="form-field">
                <label class="form-label">الكود صالح حتى</label>
                <input class="form-input" id="ptExpires" type="date" value="${r ? ptDateToInput(r.coupon_expires_at) : ptDefaultExpiry()}" style="direction:ltr">
            </div>
        </div>
        <div class="form-field">
            <label class="form-label">آيبان الشريك (اختياري)</label>
            <input class="form-input" id="ptIban" value="${esc(r?.iban || '')}" placeholder="SA.." autocomplete="off" style="font-family:monospace;direction:ltr;text-transform:uppercase">
        </div>
        <div class="form-field">
            <label class="form-label">ملاحظات (اختياري)</label>
            <textarea class="form-textarea" id="ptNotes" rows="2" placeholder="حساب تيك توك، طريقة التواصل، شروط خاصة">${esc(r?.notes || '')}</textarea>
        </div>
        <div id="ptPreview" style="background:var(--s2,#F3F1FA);border-radius:10px;padding:10px 12px;font-size:12px;color:var(--i2);line-height:1.9"></div>
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" onclick="savePartner(${isEdit ? `'${r.id}'` : 'null'})">${isEdit ? 'حفظ التعديلات' : 'إنشاء الشريك'}</button>`;
    openModal(isEdit ? 'تعديل ' + r.name : 'إضافة شريك جديد', body, foot);

    const upd = () => {
        const d = Number(document.getElementById('ptDiscount').value || 0);
        const c = Number(document.getElementById('ptCommission').value || 0);
        const plans = (window._plansCache || [{ slug:'monthly', price:99 }, { slug:'quarterly', price:249 }, { slug:'yearly', price:799 }]);
        const line = plans.map(p => {
            const price = Number(p.price || 0);
            const after = price - Math.round(price * d / 100);
            return `${PT_PLAN[p.slug] || p.slug}: الطالب يدفع <b>${after}</b> والشريك يأخذ <b>${Math.round(after * c / 100)}</b>`;
        }).join('<br>');
        document.getElementById('ptPreview').innerHTML = `<div style="font-weight:700;color:var(--i1);margin-bottom:2px">الحسبة على الأسعار الحالية</div>${line}`;
    };
    ['ptDiscount','ptCommission'].forEach(i => document.getElementById(i).addEventListener('input', upd));
    const codeEl = document.getElementById('ptCode'), slugEl = document.getElementById('ptSlug');
    if (!isEdit) codeEl.addEventListener('input', () => { if (!slugEl.dataset.touched) slugEl.value = codeEl.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); });
    if (!isEdit) slugEl.addEventListener('input', () => { slugEl.dataset.touched = '1'; });
    upd();
    setTimeout(() => document.getElementById('ptName')?.focus(), 100);
};

window.savePartner = async function(id) {
    const g = i => (document.getElementById(i)?.value || '').trim();
    const payload = {
        p_id: id || null,
        p_slug: g('ptSlug').toLowerCase(),
        p_name: g('ptName'),
        p_coupon_code: g('ptCode').toUpperCase(),
        p_discount_pct: Number(g('ptDiscount')),
        p_commission_pct: Number(g('ptCommission')),
        p_iban: g('ptIban') || null,
        p_notes: g('ptNotes') || null,
        p_coupon_expires_at: ptInputToIso(g('ptExpires'))
    };
    if (payload.p_name.length < 2) return showToast('اسم الشريك مطلوب', 'err');
    if (!id && !/^[A-Z0-9]{3,20}$/.test(payload.p_coupon_code)) return showToast('الكود: حروف إنجليزية كبيرة وأرقام فقط (3-20)', 'err');
    if (!id && !/^[a-z0-9][a-z0-9-]{1,29}$/.test(payload.p_slug)) return showToast('الرابط المختصر: حروف إنجليزية صغيرة وأرقام وشرطة (2-30)', 'err');
    if (!(payload.p_discount_pct >= 1 && payload.p_discount_pct <= 100)) return showToast('نسبة الخصم بين 1 و100', 'err');
    if (!(payload.p_commission_pct >= 0 && payload.p_commission_pct <= 100)) return showToast('نسبة العمولة بين 0 و100', 'err');

    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        let res;
        if (isPreview) {
            res = { success:true, id: id || 'preview', name: payload.p_name, code: payload.p_coupon_code, slug: payload.p_slug, access_key: 'preview0000000000000000000000000' };
        } else {
            const { data, error } = await window.A.sb.rpc('admin_upsert_partner', payload);
            if (error) throw error;
            res = data;
        }
        if (!res?.success) throw new Error(res?.error || 'فشل الحفظ');
        closeModal();
        if (id) {
            showToast('تم حفظ تعديلات ' + res.name, 'suc');
            loadPartners();
        } else {
            loadPartners();
            showPartnerCreated(res);
        }
    } catch(e) { showToast('خطأ: ' + (e.message || ''), 'err'); }
};

function showPartnerCreated(res) {
    const dash = `${PT_SITE}/partner.html?k=${res.access_key}`;
    const link = `${PT_SITE}/p/${res.code}`;
    const row = (label, url, hint) => `
        <div style="margin-bottom:12px">
            <div style="font-size:12px;font-weight:700;color:var(--i1);margin-bottom:4px">${label}</div>
            <div style="display:flex;gap:6px;align-items:center">
                <input class="form-input" value="${esc(url)}" readonly style="font-family:monospace;font-size:11.5px;direction:ltr;flex:1" onclick="this.select()">
                <button class="btn btn-pri" style="padding:8px 12px;font-size:11px;white-space:nowrap" onclick="ptCopy('${esc(url)}','${label}')">نسخ</button>
            </div>
            <div style="font-size:10.5px;color:var(--i3);margin-top:3px">${hint}</div>
        </div>`;
    const body = `
    <div style="padding:4px 0">
        <div style="background:var(--suc-s);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:12px;margin-bottom:16px">
            <div style="font-weight:800;color:var(--suc)">تم إنشاء الشريك ${esc(res.name)}</div>
            <div style="font-size:12px;color:var(--i2);margin-top:4px">الكود <b style="font-family:monospace">${esc(res.code)}</b> شغّال من الآن في صفحة الأسعار، والرابطان أدناه يعملان فوراً بلا نشر.</div>
        </div>
        ${row('رابط لوحة الشريك (سري — له فقط)', dash, 'يفتح لوحته بلا تسجيل دخول. أرسله له على الخاص ولا يُنشر في أي مكان عام.')}
        ${row('رابط الطلاب (ينشره في البايو واللايف)', link, 'يحفظ كوده عند الزائر ويطبّق الخصم تلقائياً في صفحة الأسعار.')}
    </div>`;
    openModal('الشريك جاهز', body, `<button class="btn btn-pri" onclick="closeModal()">تم</button>`);
}

window.openPartnerPayout = function(id) {
    const r = (window._partners || []).find(p => p.id === id);
    if (!r) return;
    const hist = (r.payouts || []).length
        ? '<table style="font-size:12px"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظة</th></tr></thead><tbody>' +
          r.payouts.map(p => `<tr><td style="font-size:11px;color:var(--i3)">${esc(p.date)}</td><td><b>${ptNum(p.amount)}</b> ر.س</td><td style="font-size:11px;color:var(--i3)">${esc(p.note || '—')}</td></tr>`).join('') +
          '</tbody></table>'
        : '<div style="font-size:12px;color:var(--i3);padding:8px 0">لم يُصرف له شيء بعد</div>';
    const body = `
    <div style="padding:4px 0">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;text-align:center">
            <div style="background:var(--s2,#F3F1FA);border-radius:10px;padding:10px"><div style="font-size:11px;color:var(--i3)">مستحق</div><div style="font-size:18px;font-weight:800">${ptNum(r.commission_total)}</div></div>
            <div style="background:var(--s2,#F3F1FA);border-radius:10px;padding:10px"><div style="font-size:11px;color:var(--i3)">صُرف</div><div style="font-size:18px;font-weight:800;color:var(--i2)">${ptNum(r.paid_total)}</div></div>
            <div style="background:var(--suc-s);border-radius:10px;padding:10px"><div style="font-size:11px;color:var(--i3)">متبقٍ</div><div style="font-size:18px;font-weight:800;color:var(--suc)">${ptNum(r.pending)}</div></div>
        </div>
        <div style="font-size:12px;color:var(--i2);margin-bottom:12px">الآيبان: <b style="font-family:monospace;direction:ltr;display:inline-block">${esc(r.iban || 'غير مسجّل — أضفه من «تعديل»')}</b></div>
        <div style="display:grid;grid-template-columns:1fr 2fr;gap:12px">
            <div class="form-field">
                <label class="form-label">المبلغ المحوّل (ر.س) <span style="color:var(--dng)">*</span></label>
                <input class="form-input" id="ptPayAmount" type="number" min="1" step="1" value="${Math.round(Number(r.pending || 0)) || ''}">
            </div>
            <div class="form-field">
                <label class="form-label">مرجع التحويل أو ملاحظة</label>
                <input class="form-input" id="ptPayNote" placeholder="مثال: حوالة الإنماء 08-11" autocomplete="off">
            </div>
        </div>
        <div style="background:var(--warn-s,#FEFCE8);border:1px solid #FDE68A;border-radius:8px;padding:10px;margin:4px 0 14px;font-size:12px;color:#92400E">
            سجّل الصرف بعد إتمام التحويل فعلياً من البنك — السجل لا يُحذف من اللوحة.
        </div>
        <div style="font-size:12px;font-weight:700;color:var(--i1);margin-bottom:6px">آخر الصرفيات</div>
        ${hist}
    </div>`;
    const foot = `<button class="btn btn-ghost" onclick="closeModal()">إلغاء</button>
                  <button class="btn btn-pri" style="background:var(--suc);border-color:var(--suc)" onclick="confirmPartnerPayout('${r.id}')">تسجيل الصرف</button>`;
    openModal('صرف عمولة — ' + r.name, body, foot);
    setTimeout(() => document.getElementById('ptPayAmount')?.focus(), 100);
};

window.confirmPartnerPayout = async function(id) {
    const amount = Number((document.getElementById('ptPayAmount')?.value || '').trim());
    const note = (document.getElementById('ptPayNote')?.value || '').trim();
    if (!(amount > 0)) return showToast('المبلغ يجب أن يكون أكبر من صفر', 'err');
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { closeModal(); showToast('(معاينة) سُجّل صرف ' + fmt(amount) + ' ر.س', 'suc'); return; }
        const { data, error } = await window.A.sb.rpc('admin_partner_payout', { p_partner_id: id, p_amount: amount, p_note: note || null });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        closeModal();
        showToast('سُجّل صرف ' + fmt(amount) + ' ر.س — الإجمالي المصروف ' + ptNum(data.paid_total), 'suc');
        loadPartners();
    } catch(e) { showToast('خطأ: ' + (e.message || ''), 'err'); }
};

window.togglePartner = async function(id, active) {
    const r = (window._partners || []).find(p => p.id === id);
    if (!r) return;
    const msg = active
        ? `تشغيل ${r.name}: يرجع كوده ${r.code} شغّالاً سنة من اليوم وتفتح لوحته. متأكد؟`
        : `إيقاف ${r.name}: ينتهي كوده ${r.code} فوراً وتقفل لوحته. الأرقام والسجل يبقون. متأكد؟`;
    if (!window.confirm(msg)) return;
    const isPreview = new URLSearchParams(window.location.search).has('preview');
    try {
        if (isPreview) { showToast('(معاينة) ' + (active ? 'تم التشغيل' : 'تم الإيقاف'), 'suc'); return; }
        const { data, error } = await window.A.sb.rpc('admin_set_partner_active', { p_partner_id: id, p_active: active, p_coupon_expires_at: null });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'فشلت العملية');
        showToast(active ? 'تم تشغيل ' + r.name : 'تم إيقاف ' + r.name + ' وإنهاء كوده', 'suc');
        loadPartners();
    } catch(e) { showToast('خطأ: ' + (e.message || ''), 'err'); }
};

})();
