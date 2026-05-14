# برومبت ChatGPT/DALL·E — بوست سناب لتسريبات التحصيلي

استخدم هذا البرومبت لتوليد صورة بوست سناب (Stories vertical 1080×1920) بنفس هوية البنر الأخضر الذي ركّبناه في الموقع.

---

## 🎨 البرومبت الأساسي (انسخه كما هو)

```
Vertical Snapchat / Instagram story poster, 1080 × 1920 (9:16 ratio).
Premium Arabic educational marketing design for a Saudi exam-prep platform.

THEME: "Live exam leaks streaming — Day 1"
LANGUAGE: Modern Saudi Arabic, RTL layout, leave clean space for Arabic text
overlay (do NOT render Arabic letters in the artwork itself — text added in
Snapchat editor afterward).

COLOR PALETTE (strictly follow):
- Primary: rich emerald green #10B981
- Deep emerald: #047857
- Light emerald: #34D399
- Gold accent: #FFD700 (used sparingly for "Day 1" badge and key numbers)
- Background base: deep navy #0F2A26
- White: #FFFFFF (clean text contrast)
- NO purple, NO orange, NO red.

COMPOSITION (top to bottom):
1. TOP THIRD — Hero zone:
   - A bold, glowing emerald-green ribbon banner that says "LIVE" in white
     uppercase, with a small pulsing white dot beside it.
   - Right next to it, a small gold pill-shaped badge representing
     "Day 1" — keep it as a graphic shape only, no Arabic letters.
   - Subtle radial glow behind, soft volumetric light.

2. MIDDLE — Visual storytelling:
   - An isometric stack of glowing answer sheets / exam papers floating
     diagonally, edges lit emerald green, with tiny check marks (✓) drawn
     in gold over the papers.
   - A subtle "198" big number etched into the design as a watermark,
     emerald-on-emerald, slightly visible — represents the question count.
   - Soft particles / sparkles around the papers (gold and white, small).

3. BOTTOM THIRD — CTA zone:
   - A clean, rounded-rectangle white button shape (empty — text overlay
     will be added later) with emerald-green inner glow.
   - Above it, leave generous clean space for headline overlay.

DETAILS:
- Background: deep navy #0F2A26 with a subtle emerald geometric mesh
  (light hexagons or diagonal stripes), very faint, 5-8% opacity.
- Lighting: cinematic, soft volumetric glow from the paper stack outward.
- Mood: trustworthy, urgent, premium, scientific, ready-to-act.
- Texture: smooth flat illustration / 3D-isometric hybrid, web-ready,
  ultra-sharp edges, no photographic realism.

FORBIDDEN:
- NO faces, NO hands, NO people.
- NO Arabic / English letters in the artwork (overlay will add them).
- NO logos, NO TikTok / Telegram / Snapchat watermarks.
- NO purple, NO orange, NO red, NO blue tones.
- NO photographic or AI-portrait elements.
- NO clutter — keep the composition breathable.

OUTPUT: 1080 × 1920 PNG, high-resolution, designed for Snapchat / Instagram
Story background. Leave at least 250 px of negative space at top and 350 px
at bottom for Arabic headline + CTA button overlays.
```

---

## 📝 النصوص العربية (تُضاف فوق الصورة في محرّر سناب)

### النسخة ١ — الإطلاق
```
🔴 تسريبات التحصيلي
أوّل بأوّل · اليوم الأول

١٩٨ سؤال محلول من اختبار الأربعاء
رياضيات · فيزياء · كيمياء · أحياء

[الزر] جرّب ٥ أسئلة مجاناً
madarekelite.com
```

### النسخة ٢ — تذوّق
```
قبل ما تشترك
جرّب ٥ أسئلة من تسريبات الأربعاء
مع الشرح المبسّط

[الزر] ابدأ التذوّق الآن
madarekelite.com/leaks-preview
```

### النسخة ٣ — إلحاح
```
الفترة الأولى صارت
الفترات القادمة على الأبواب

ادخل وشوف ١٩٨ سؤال محلول
قبل ما تجلس للاختبار

[الزر] افتح الآن
madarekelite.com
```

---

## 🎯 برومبت بديل أبسط (لو الأول معقّد)

```
A vertical 1080x1920 Snapchat story poster.
Deep navy background (#0F2A26).
Top-left: a glowing emerald-green "LIVE" badge with a tiny pulsing white dot.
Top-right: a small gold pill badge.
Center: isometric stack of glowing emerald-green papers with gold checkmarks.
Subtle gold sparkles around. Subtle hexagonal mesh in background, 5% opacity.
Bottom: large empty rounded white button shape with emerald inner glow.
No text. No faces. No logos. Premium, urgent, educational mood.
Colors: only emerald #10B981, deep emerald #047857, gold #FFD700, navy
#0F2A26, white. Flat illustration with subtle 3D depth.
```

---

## 🛠️ نصائح للاستخدام في سناب

1. **استخدم DALL·E 3 أو Midjourney v6** — DALL·E يفهم الـtechnical instructions أحسن، Midjourney يعطي fellbeing/cinematic لو ضفت `--ar 9:16 --style raw --v 6.1`
2. **حمّل الصورة → افتح سناب → Story → اختر الصورة → Add Text** (اختر الخط الرفيع/Bold بحسب)
3. **النص العربي**: استخدم خط `IBM Plex Sans Arabic` لو محرّر سناب يدعمه، أو خط Bold العادي مع spacing مريح
4. **للزر**: استخدم sticker سناب الجاهز "Tap" + ضع النص العربي فوقه
5. **رابط Swipe Up**: `madarekelite.com/leaks-preview.html` (يفتح صفحة التذوّق)

---

## 📊 KPI متابعة الحملة

- **conversion event**: زائر يصل لصفحة التذوّق → يكمل ٥ أسئلة → يضغط CTA "سجّل الآن"
- ضمّن UTM في الرابط: `?utm_source=snap&utm_medium=story&utm_campaign=leaks-day1`
- تابع في Supabase: `page_view` events بـ`utm_source=snap` (analytics.js يلتقطها)
