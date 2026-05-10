# قائمة الإطلاق — مدارك النخبة (Expo App)
**تاريخ الإنشاء**: 2026-04-22
**الهدف**: كل ما يجب إنجازه قبل نشر التطبيق على App Store + Google Play

---

## 🔴 الطبقة 1 — Blockers (بدونها لا يمكن الإطلاق)

| # | المهمة | الحالة | ملاحظات |
|---|---|---|---|
| 1 | **Edge Function `autorenew-charge`** | ⏳ | MyFatoorah Recurring API + cron يومي يستدعيها + دالة RPC تحوّل المستخدم لـ free بعد 3 محاولات فشل |
| 2 | **E2E test حقيقي** | ⏳ | حساب جديد → تسجيل → كوبون `FREE01` (مجاني) أو `TEST01` (1 ر.س) → تفعيل → استخدام |
| 3 | **حذف الحساب داخل التطبيق** | ✅ | SQL 23 (`account_deletion_preflight` + `scrub_user_pii`) + Edge Function `delete-account` + زر في ProfileScreen مع تأكيدين. يحتاج: تشغيل SQL 23 + نشر Edge Function |
| 4 | **Privacy Policy HTML + رابط عام** | ⏳ | فحص إن كان `privacy-v2.html` جاهز — يحتاج تحديث قسم الدفع + الإحالات + التجديد التلقائي ليطابق terms |
| 5 | **Privacy Manifest (PrivacyInfo.xcprivacy)** | ⏳ | iOS 17+ إلزامي — يذكر جميع SDKs التي تجمع بيانات (Supabase, MyFatoorah, TikTok pixel) |
| 6 | **EAS Build config + credentials** | ⏳ | `eas.json` + iOS provisioning profile + Android keystore |
| 7 | **App Store Connect + Google Play Console** | ⏳ | إنشاء listings + رفع الـ builds |
| 8 | **Universal Links / App Links** | ⏳ | `apple-app-site-association` في `.well-known/` + `assetlinks.json` لأندرويد |

---

## 🟡 الطبقة 2 — Assets & Metadata

| # | المهمة | الحالة | ملاحظات |
|---|---|---|---|
| 9 | **App Icon 1024×1024** | ⏳ | PNG بدون شفافية |
| 10 | **Splash Screen** | ⏳ | متعدد الأحجام — Expo config |
| 11 | **Store Screenshots** | ⏳ | iPhone 6.7" + 6.5" (إلزامي) + iPad (اختياري) + Android phone + tablet |
| 12 | **App Description** (AR + EN) | ⏳ | وصف قصير + طويل + keywords |
| 13 | **Support URL + Marketing URL** | ⏳ | `/support` + صفحة تسويقية (`madarekelite.com`) |
| 14 | **Age Rating + Category** | ⏳ | Education — 4+ |
| 15 | **MyFatoorah `payment_method` tag** | ⏳ | تعديل callback لتعبئة العمود في جدول payments |

---

## 🟢 الطبقة 3 — Quality & Ops

| # | المهمة | الحالة | ملاحظات |
|---|---|---|---|
| 16 | **Sentry / Crash reporting** | ⏳ | `@sentry/react-native` |
| 17 | **Audit شاشات** (Dashboard/Leaks/Reports/Practice) | ⏳ | مطابقة v2 — real vs placeholder |
| 18 | **Checkbox "أوافق على التجديد التلقائي"** | ⏳ | في RegisterScreen أو PricingScreen |
| 19 | **Git commit + push** | ⏳ | terms-v2.html + ProfileScreen + SQL — Vercel auto-deploy |
| 20 | **تحديث نص ReferralScreen** | ⏳ | إزالة "STC Pay" تحديداً — ليطابق الشروط |
| 21 | **TestFlight Beta / Google Internal Track** | ⏳ | 3-5 مختبرين |
| 22 | **حذف `TIKTOK_TEST_EVENT_CODE`** | ⏳ | مذكور في CLAUDE.md |
| 23 | **Push Notifications** (✅ مطلوبة) | ⏳ | APNs + FCM — `expo-notifications` + Edge Function للإرسال + جدول `scheduled_notifications` |

---

## 📊 الترتيب الاستراتيجي (اقتراح)

**الفكرة**: نبدأ بما يبني على شغلنا الأخير (ProfileScreen + auto-renewal + terms) ونحافظ على الـ momentum.

1. **#3 حذف الحساب** — يبني على ProfileScreen الذي عدّلنا، Apple blocker
2. **#1 autorenew-charge** — يُغلق حلقة التجديد التلقائي الذي وعدنا به قانونياً
3. **#4 Privacy Policy** — مراجعة + تحديث ليطابق terms الجديد
4. **#5 Privacy Manifest** — iOS mandatory
5. **#23 Push Notifications** — بنية تحتية
6. **#16 Sentry** — قبل أي إطلاق
7. **#18 Checkbox التجديد التلقائي** — حماية قانونية
8. **#2 E2E test** — بعد اكتمال autorenew-charge + delete account
9. **#17 Audit شاشات** — تنظيف نهائي
10. **#20 تحديث ReferralScreen** — تناسق
11. **#15 MyFatoorah payment_method** — تنظيف
12. **#22 حذف TikTok test code** — تنظيف
13. **#19 Git push** — نشر تراكمي
14. **#9-11 Assets** — يحتاج مصمّم أو AI images
15. **#6-7 EAS + Stores** — بعد كل شيء
16. **#8 Universal Links** — بعد رفع الـ build
17. **#12-14 Metadata** — أثناء تعبئة store listing
18. **#21 TestFlight** — الخطوة النهائية قبل الإطلاق العام

---

## 🔄 ملاحظات نعرّفها أثناء العمل
(أي مهمة جديدة نكتشفها أثناء التنفيذ نضيفها هنا)

- (لا يوجد حتى الآن)
