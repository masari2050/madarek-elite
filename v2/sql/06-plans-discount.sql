-- ============================================================
-- Migration 06 — إضافة السعر الأصلي والخصم للخطط
-- ============================================================

-- إضافة أعمدة جديدة فقط — لا حذف ولا تعديل
ALTER TABLE plans ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0;

-- ملاحظة:
-- price = السعر الحالي (بعد الخصم) — العمود الموجود مسبقاً
-- original_price = السعر الأصلي قبل الخصم (يظهر مشطوب)
-- discount_percentage = نسبة الخصم (اختياري، يمكن حسابها)
--
-- قواعد العرض في التطبيق:
-- * إذا original_price موجود وأكبر من price → يظهر السعر الأصلي مشطوب
-- * discount_percentage يحسب تلقائياً إذا كان 0
