# مدارك النخبة v7 — Database Migrations

## ترتيب التنفيذ
شغّل الملفات بالترتيب في Supabase SQL Editor:

1. `01-alter-existing-tables.sql` — إضافة أعمدة جديدة للجداول الموجودة
2. `02-new-tables.sql` — إنشاء 18 جدول جديد
3. `03-rls-policies.sql` — سياسات الأمان RLS
4. `04-seed-data.sql` — بيانات افتراضية (إنجازات، بنرات، نصائح)
5. `05-rpc-functions.sql` — دوال RPC جديدة

## ملاحظات أمان
- لا يُحذف أو يُعدَّل أي جدول أو عمود موجود
- كل الأوامر تستخدم `IF NOT EXISTS` / `IF NOT EXISTS`
- آمن للتشغيل على قاعدة بيانات الإنتاج
