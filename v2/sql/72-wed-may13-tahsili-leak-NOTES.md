# Migration 72 — تسريبات التحصيلي الأربعاء 13 مايو 2026

## الملخّص
رفع 198 سؤالاً من تسريبات اليوم الأول (الأربعاء مسائي 13 مايو 2026) إلى DB.

## التوزيع
| المادة | عدد الأسئلة |
|---|---:|
| الرياضيات | 50 |
| الفيزياء | 46 |
| الكيمياء | 47 |
| الأحياء | 55 |
| **الإجمالي** | **198** |

## ما المُدخَل
1. **عمود جديد** `leak_groups.accent_color` (TEXT nullable) — للون مميّز لكل مجموعة
2. **leak_group جديد**: "تسريبات التحصيلي – الأربعاء ١٣ مايو ٢٠٢٦" بلون أخضر زمرّدي `#10B981`
3. **198 سؤالاً** كلها مرتبطة بـleak_group_id الجديد، image_url=NULL، section=tahsili

## الأسئلة المحذوفة (تتطلّب صوراً)
بعض الأسئلة تعتمد كلياً على رسومات هندسية أو تخطيطات معقّدة تستلزم رفع صور لاحقاً عبر admin:
- **رياضيات**: ~8 أسئلة (مثلثات، أشكال هندسية بإحداثيات)
- **فيزياء**: 7 أسئلة (مخطّطات قوى، رسوم بيانية F-a، انعكاس الضوء)
- **كيمياء**: 5 أسئلة (تراكيب عضوية، رسوم P-V/V-T)
- **أحياء**: 11 سؤالاً (شبكات غذائية، تشريح، أهرام)

**الخطة**: ترفع لاحقاً عبر admin → الأسئلة → إضافة سؤال يدوياً، مع رفع الصور لـquestion-images bucket.

## التغييرات في الواجهة (لا تكسر شيئاً موجوداً)
1. **`leaks.html`**:
   - `renderCard()` يستخدم `accent_color` لو موجود لتلوين حافة الكارد + إضافة شارة "جديد" نابضة
   - الكروت العادية (بدون accent_color) تبقى كما هي تماماً

2. **`dashboard.html`**:
   - بنر جديد `#freshLeakBan` (مخفي افتراضياً، يظهر تلقائياً لو في leak_group بـaccent_color خلال 3 أيام)
   - `loadFreshLeakBanner()` يستعلم DB و يلوّن البنر بنفس accent_color
   - في حال فشل الاستعلام (مثلاً قبل تشغيل SQL 72) → البنر يبقى مخفياً بصمت

3. **`tahsili-top-400.html`**:
   - شريط ثابت أخضر تحت الـurgency-bar: "LIVE · تسريبات التحصيلي ١٤٤٧ — ننزّلها أوّل بأوّل بعد كل فترة"
   - يحوّل لـ/leaks.html عند الضغط

## ترتيب التشغيل
1. شغّل SQL في Supabase SQL Editor: `v2/sql/72-wed-may13-tahsili-leak.sql`
2. `git push origin main` → Vercel يطلق الواجهات الجديدة خلال دقيقتين
3. اختبر:
   - `madarekelite.com/leaks.html` → الكارد الجديد بلون أخضر + شارة "جديد"
   - `madarekelite.com/dashboard.html` → بنر أخضر بين mock-banner و referral-banner
   - `madarekelite.com/tahsili-top-400.html` → شريط LIVE تحت الـcountdown

## التراجع (لو احتجنا)
```sql
-- حذف الـleak_group + الأسئلة المرتبطة (ON DELETE SET NULL سيُلغي ربط الأسئلة فقط)
DELETE FROM questions WHERE leak_group_id = (
    SELECT id FROM leak_groups WHERE leak_date='2026-05-13' AND title LIKE 'تسريبات%الأربعاء%'
);
DELETE FROM leak_groups WHERE leak_date='2026-05-13' AND title LIKE 'تسريبات%الأربعاء%';
-- العمود accent_color يبقى (آمن، لا يكسر شيئاً)
```

## برومبت ChatGPT للصورة (احتياطي)
استخدم هذا الـprompt إذا أردت بناء صورة بنر بدلاً من الستريب النصّي:

```
A modern, premium Arabic-RTL marketing banner for an educational platform.
Theme: "Live exam leaks streaming" for Saudi Tahsili exam 1447 (2026).
Style: bold, professional, no people, no logos, no text from other brands.

Composition:
- Aspect ratio 1200×400 (web hero banner)
- Background: rich dark navy (#0F2A26) with subtle emerald-green geometric mesh
  and soft gold particles flowing diagonally
- Foreground left: large stylized "LIVE" badge in emerald green (#10B981) with
  a pulsing white dot
- Center: Arabic-friendly headline space (leave a clean area for text overlay)
- Right: an abstract isometric stack of papers / question sheets with
  emerald-green glowing edges, suggesting fresh leaked content arriving in real-time
- Subtle gold accents (#F59E0B) on key elements: corner ornaments, micro-stars
- Lighting: cinematic, soft volumetric glow from the emerald paper stack
- Mood: trustworthy, urgent, premium, scientific
- NO logos, NO platform names (no TikTok/Telegram/YouTube),
  NO faces or hands, NO Arabic letters in the artwork itself
  (the Arabic text will be added in HTML over the image)

Color palette: emerald #10B981, deep navy #0F2A26, gold #F59E0B, white accents.
Output: high-detail flat illustration, sharp edges, web-ready.
```

ولو تبيها أخضر/أسود فقط بدون ذهبي (متناغمة مع باقي الصفحة الذهبي):
- استبدل "gold accents" بـ "subtle silver-white accents"
- استبدل "#F59E0B" بـ "#E5E7EB"
