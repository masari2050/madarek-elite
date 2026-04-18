# تعليمات مهمة لمشروع مدارك إيليت

## 🎯 الهدف النهائي — تطبيق React Native / Expo أصلي
- المنتج النهائي المخطط له: **تطبيق React Native / Expo كامل** (iOS + Android native)
- النسخة الحالية (v2 على madarekelite.com) **مرحلة مؤقتة** للاختبار والتحقق من المنطق والتصميم قبل نقله للتطبيق الأصلي
- أي قرار معماري في v2 ينبغي أن يكون قابلاً للنقل إلى Expo (تجنّب قدر الإمكان الاعتماد على أشياء خاصة بالمتصفح لا تُدعم في RN)
- الـ Supabase backend نفسه سيستمر مع التطبيق الأصلي — الواجهة فقط هي التي تُعاد بناؤها

---

## ⚠️ القاعدة الذهبية — نسختان تعملان بالتوازي

### النسخة القديمة (production الحالي)
- كل الملفات في **الجذر**: `dashboard.html`, `admin.html`, `practice.html`, `profile.html`, إلخ
- **فيها مشتركون حاليون يستخدمونها الآن**
- 🚫 **لا تلمسها أبداً** — أي تعديل = يؤثر على المشتركين الحقيقيين

### النسخة الجديدة (تحت التطوير)
- كل الملفات في مجلد **`/v2/`**
- 🛠️ **هذي اللي نشتغل عليها**

### قواعد صارمة
1. **أي تعديل = في `/v2/` فقط** — حتى لو يبدو التعديل سهل في الجذر
2. **لا تعدل أي ملف خارج `/v2/`** مهما كان السبب
3. **الانتقال للـ production بقرار المستخدم فقط** — ينتظر حتى يقول صراحة: "انقل للـ production"
4. قاعدة البيانات Supabase مشتركة بين النسختين — استخدم `ADD COLUMN IF NOT EXISTS` وجداول جديدة فقط، **لا حذف ولا تعديل للأعمدة الموجودة**
5. ملفات SQL كلها في `/v2/sql/` مرقّمة (01 → 12+) وتُنفَّذ يدوياً في Supabase SQL Editor

---

## 📁 ملفات النسخة الجديدة `/v2/`

### صفحات التطبيق (Mobile)
| الملف | الغرض | الحالة |
|---|---|---|
| `welcome-v2.html` | ترحيب + 5 أسئلة تجربة مجانية + الاشتراك | ✅ |
| `dashboard-v2.html` | الرئيسية (streak, خطة اليوم, AI, تسريبات, بنرات) | ✅ |
| `training-v2.html` | اختيار قسم التدريب + modal | ✅ |
| `practice-v2.html` | شاشة الأسئلة + النتائج + المراجعة | ✅ |
| `leaks-v2.html` | مجموعات التسريبات + التقدم | ✅ |
| `reports-v2.html` | 5 تبويبات إحصائية + Mini chart 7 أيام | ✅ |
| `profile-v2.html` | الملف الشخصي + الإنجازات + الإحالة | ✅ |

### لوحة الإدارة (Desktop)
| الملف | الغرض | الحالة |
|---|---|---|
| `admin-v2.html` | الهيكل + sidebar + نظرة عامة | ✅ |
| `admin-v2-sections.js` | 17 قسم إداري | ✅ |

### مساعدات مشتركة
| الملف | الغرض | الحالة |
|---|---|---|
| `supabase-helpers-v2.js` | مكتبة JS مشتركة (Auth + Gamification + Stats) | ✅ |
| `preview-mock.js` | Mock Supabase كامل (+ force_subscriber mode) | ✅ |
| `whatsapp-float.js` | أيقونة واتساب العائمة (تقرأ الرقم من site_settings) | ✅ |

### أوضاع التشغيل
- **عادي:** `file.html` → Supabase حقيقي + يتطلب تسجيل دخول
- **معاينة كاملة:** `file.html?preview` → Mock DB محلي (localStorage)
- **معاينة هجينة:** `file.html?preview&force_subscriber=true` → Supabase حقيقي + يتصرف كمشترك بدون تسجيل دخول

### الـ 17 قسم في لوحة الإدارة
`overview, questions, review (أسئلة + بلاغات), users, plans, coupons, finance, invoices, expenses, banners, pages, referrals, tips, seo, users-analytics, staff, visitors, settings`

---

## 🗄️ ملفات SQL في `/v2/sql/`

| # | الملف | المحتوى | شُغّل؟ |
|---|---|---|---|
| 01 | `alter-existing-tables.sql` | إضافة أعمدة للجداول الموجودة (XP, level, referral_code, leak_group_id...) | ✅ |
| 02 | `new-tables.sql` | 18 جدول جديد | ✅ |
| 03 | `rls-policies.sql` | سياسات RLS | ✅ |
| 04 | `seed-data.sql` | بيانات افتراضية (6 شارات، 3 بنرات، نصائح، خطط) | ✅ |
| 05 | `rpc-functions.sql` | 9 دوال RPC | ✅ |
| 06 | `plans-discount.sql` | `original_price` و `discount_percentage` | ✅ |
| 07 | `storage-bucket.sql` | bucket لصور الأسئلة | ✅ |
| 08 | `expenses.sql` | جدول المصروفات + RLS | ✅ |
| 09 | `more-tips.sql` | 30 نصيحة يومية | ✅ |
| 10 | `leaks-seed.sql` | 3 مجموعات تسريبات تجريبية + بنر | ✅ |
| 11 | `whatsapp-settings.sql` | `whatsapp_number` في site_settings + seed للبنرات | ✅ (2026-04-18) |
| 12 | `activate-banners.sql` | تفعيل ticker + main banner للاختبار | ✅ (2026-04-18) |
| 14 | `finance-accounts.sql` | جدولا البنك/الخزينة + التحويلات + رسوم وسائل الدفع | ⏳ يحتاج تشغيل |

### قواعد SQL
- يجب تشغيلها في Supabase SQL Editor **يدوياً بالترتيب**
- **إضافات فقط** — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` و `CREATE TABLE IF NOT EXISTS`
- **لا حذف ولا تعديل** لأي عمود موجود

---

## 🎨 نظام الألوان الموحّد (Design System)

### الألوان الأساسية
```css
--pri: #6D5DF6       /* بنفسجي البراند */
--acc: #FF8A3D       /* برتقالي تنبيه */
--suc: #22C55E       /* أخضر نجاح */
--dng: #EF4444       /* أحمر خطأ */
--gold: #F59E0B      /* ذهبي */
```

### ألوان الإجابات (معتمد — لا يتغيّر إلا بطلب صريح)

| الحالة | الخلفية | الحد |
|---|---|---|
| **إجابة صحيحة** | `rgba(34,197,94,.12)` | `var(--suc)` 2px |
| **إجابة خاطئة** | `rgba(239,68,68,.12)` | `var(--dng)` 2px |
| **صندوق الشرح** | `#FEFCE8` (كريم فاتح) | `#FDE68A` 1px |
| **نص "شرح"** | `#92400E` (بني دافئ) | — |

**مبدأ التصميم:** الأخضر/الأحمر هما البطل البصري، الأصفر الكريمي خلفية هادئة للشرح بدون تنافس.

### Bottom Nav (Mobile)
- `border-top-left-radius: 24px` + `border-top-right-radius: 24px`
- `box-shadow: 0 -4px 20px rgba(0,0,0,.08)`

### أيقونة الواتساب العائمة
- خضراء (#25D366) دائرية 52×52 أسفل يسار
- تقرأ الرقم من `site_settings.whatsapp_number`
- تنبض كل 2.4 ثانية لجذب الانتباه
- على الشاشات الكبيرة (admin) تنزل لـ `bottom:20px` (بدل 82 فوق nav)

---

## 📝 الأسئلة والمحتوى التعليمي

- **ممنوع** إنشاء أسئلة تحصيلي أو قدرات بالذكاء الاصطناعي وتقديمها كأسئلة حقيقية أو تسريبات
- جميع الأسئلة يجب أن تكون **حقيقية** من مصادر موثوقة يوفرها صاحب المشروع
- لا تكتب "تسريبات" على محتوى مُولَّد
- دورك هو **بناء أدوات الرفع والعرض** فقط

### دعم HTML في الأسئلة
- دالة `safeHtml()` تسمح بوسوم محددة: `<br>`, `<p>`, `<strong>`, `<em>`, `<u>`, `<b>`, `<i>`, `<sup>`, `<sub>`, `<span>`, `<div>`, `<hr>`
- أي وسوم أخرى (`<script>`, إلخ) تُحوَّل لنص مرئي

### صور الأسئلة
- `question-images` bucket في Supabase Storage
- رفع ملف مباشر أو لصق URL
- lightbox للتكبير
- الحد الأقصى 2MB، الأنواع: JPG/PNG/WebP

### بنر الصورة (admin-v2)
- **رفع ملف** مباشر لـ Supabase Storage (نفس bucket)
- **أو لصق URL**
- **معاينة مباشرة** قبل الحفظ (مع placeholder افتراضي)
- **رابط عند الضغط:** 3 خيارات
  - `none`: بدون رابط
  - `internal`: dropdown للصفحات الداخلية (التسريبات/التدريب/التقارير/الاشتراك/الملف)
  - `external`: URL خارجي
- الحقل المحفوظ في `banners.config`: `{ image_url, link_type, link }`

---

## 🔗 روابط الاختبار الكاملة

### اختبار مع بيانات وهمية محلية (localStorage)
```
http://localhost:8080/v2/welcome-v2.html
http://localhost:8080/v2/admin-v2.html?preview
```

### اختبار مع Supabase الحقيقي + بدون تسجيل دخول
```
http://localhost:8080/v2/dashboard-v2.html?preview&force_subscriber=true
http://localhost:8080/v2/training-v2.html?preview&force_subscriber=true
http://localhost:8080/v2/practice-v2.html?preview&section=quant&count=5&mode=instant&force_subscriber=true
http://localhost:8080/v2/leaks-v2.html?preview&force_subscriber=true
http://localhost:8080/v2/reports-v2.html?preview&force_subscriber=true
http://localhost:8080/v2/profile-v2.html?preview&force_subscriber=true
```

---

## 📌 الملاحظات المعلّقة للجلسة القادمة

### SQL يحتاج تشغيل
- [x] **Migration 11** (`whatsapp-settings.sql`) — تم 2026-04-18 · whatsapp_number=+966553339885 محفوظ
- [x] **Migration 12** (`activate-banners.sql`) — تم 2026-04-18 · كل البنرات (ticker/main/image/leaks) مفعّلة

### ميزات مؤجلة
- [ ] **توليد النصائح بالذكاء الاصطناعي** (طُلبت ثم أُجّلت)
- [ ] **نظام الإشعارات المجدولة** (الأدمن يرسل إشعار للمشتركين بوقت محدد)
- [ ] **ربط أسئلة حقيقية بمجموعات التسريبات** — الحالي 3 مجموعات فيها عدد قليل من الأسئلة للاختبار
- [ ] **شاشة "نصيحة جديدة" + ترتيب بالسحب** في admin tips
- [ ] **CRUD الموظفين + صلاحيات مفصّلة** في admin staff
- [ ] **Export CSV** لتحليل المستخدمين في admin

### حسابات الاختبار
- **abodi2040@gmail.com** — admin, اشتراك شهري فعّال (Supabase)
- **abodi2060@gmail.com** — staff, حساب مجاني قديم

### مشاكل معروفة
- `force_subscriber=true` يستخدم UUID وهمي → بيانات شخصية (attempts/streak) تظهر 0
- هذا مقصود لحماية قاعدة البيانات من كتابة بيانات غير حقيقية

---

## 🚀 الخطوات القادمة

### ما قبل الانتقال للـ production
1. ~~تشغيل SQL 11 و 12 في Supabase~~ ✅ تم 2026-04-18
2. اختبار كل الصفحات مع حساب حقيقي مشترك (`abodi2040`)
3. رفع أسئلة حقيقية للتسريبات من admin
4. اختبار النسخة على موبايل فعلي (iPhone + Android)
5. اختبار الأداء على اتصال بطيء

### الانتقال الفعلي للـ production
- **فقط بأمر صريح من المستخدم:** "انقل للـ production"
- الخطة: نسخ الملفات من `/v2/` إلى الجذر مع backup للـ production الحالي
- إخطار المستخدمين بالتحديث عبر إشعار/بنر

---

## 🔗 المسار الرسمي للمشروع
- المجلد: `~/Library/Mobile Documents/com~apple~CloudDocs/مدارك النخبة الرسمي`
- مجلد التسريبات: `~/Library/Mobile Documents/com~apple~CloudDocs/مدارك النخبة الرسمي/تسريبات`
- Supabase Project: `czzcmbxejxbotjemyuqf`
</content>
