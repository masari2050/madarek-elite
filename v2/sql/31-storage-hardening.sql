-- ═══════════════════════════════════════════════════════════════
-- Migration 31 — تصلب Storage policies + bucket constraints
-- ═══════════════════════════════════════════════════════════════
--
-- audit Storage (2026-04-28 ليلي) كشف:
--
-- 🔴 ثغرات حرجة في policies (3):
--
-- 1. "Allow anon uploads to question-figures" (INSERT, public)
--    أي شخص (anon) يرفع ملفّات إلى bucket question-figures.
--    الخطر: DoS عبر ملء التخزين، رفع SVG/HTML بـ XSS، تكاليف تخزين.
--
-- 2. "Allow public uploads" (INSERT to question-images, public)
--    نفس الشي على bucket question-images.
--
-- 3. "Upload question images" (INSERT to question-images, public)
--    Policy ثالثة مكرّرة تسمح بنفس الرفع المفتوح.
--
-- ✅ يوجد policies admin-only تعمل بشكل صحيح:
--    question_images_admin_insert / question_images_admin_delete
--    (تستخدم profiles.role IN ('admin', 'staff'))
--
-- 🟠 تنظيف policies SELECT المكرّرة (4 → 2):
--    "Allow public read" + "Public read question images" + "question_images_public_read"
--    كلها متطابقة (bucket_id = 'question-images'). نُبقي واحدة فقط.
--
-- استراتيجية:
--   • DROP الـ 3 policies المفتوحة لـ INSERT
--   • DROP المكرّرات في SELECT (نُبقي 2 policies نظيفتين)
--   • نُبقي admin policies كما هي (تشتغل عبر التطبيق)
--   • التأثير: المستخدم العادي لا يستطيع رفع صور (مقصود — admin/staff فقط
--     يضيفون أسئلة وصورها)
-- ═══════════════════════════════════════════════════════════════

-- ── 1) حذف policies INSERT المفتوحة ──
DROP POLICY IF EXISTS "Allow anon uploads to question-figures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Upload question images" ON storage.objects;

-- ── 2) تنظيف SELECT المكرّرة على question-images ──
-- الـ 3 policies SELECT متطابقة، نُبقي واحدة بأسم واضح
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Public read question images" ON storage.objects;
-- نُبقي "question_images_public_read" (الأسم الأوضح)

-- ── 3) تنظيف SELECT على question-figures ──
-- "Public read question figures" نُبقيها — هي الوحيدة لـ figures
-- (ما في تكرار)

-- ── 4) إضافة admin INSERT لـ question-figures (لو غير موجودة) ──
-- بعد حذف "Allow anon uploads to question-figures"، نحتاج policy admin
-- مكافئ للـ question_images_admin_insert
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='storage' AND tablename='objects'
          AND policyname='question_figures_admin_insert'
    ) THEN
        EXECUTE $POL$
            CREATE POLICY "question_figures_admin_insert" ON storage.objects
                FOR INSERT
                WITH CHECK (
                    bucket_id = 'question-figures'
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid()
                          AND role = ANY(ARRAY['admin', 'staff'])
                    )
                )
        $POL$;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='storage' AND tablename='objects'
          AND policyname='question_figures_admin_delete'
    ) THEN
        EXECUTE $POL$
            CREATE POLICY "question_figures_admin_delete" ON storage.objects
                FOR DELETE
                USING (
                    bucket_id = 'question-figures'
                    AND EXISTS (
                        SELECT 1 FROM public.profiles
                        WHERE id = auth.uid()
                          AND role = ANY(ARRAY['admin', 'staff'])
                    )
                )
        $POL$;
    END IF;
END $$;

-- ── 5) ضبط bucket constraints — يدوياً من Dashboard ──
-- ⚠️ ملاحظة هامّة:
--   جدول storage.buckets ملك لـ supabase_storage_admin، لا يمكن تعديله
--   من SQL Editor (postgres role). يجب الضبط يدوياً عبر Dashboard UI.
--
-- 🚨 المطلوب يدوياً (Storage → bucket → settings):
--
--   📦 question-figures:
--      • File size limit: 5 MB (5242880 bytes)
--      • Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--      (الحالي: 0 = unlimited + NULL = أي نوع — خطر DoS + XSS)
--
--   📦 question-images:
--      • File size limit: 2 MB (2097152) — موجود ✅
--      • Allowed MIME types: image/* — موجود ✅
--      (الحالي صحيح — لا يحتاج تعديل)

-- ── 6) ملاحظة: public flag على buckets ──
-- لو bucket public=true، أي شخص يقدر يصل لروابط مباشرة بدون auth.
-- هذا مقصود لـ question-images و question-figures (الصور تُعرض عبر URL مباشر).
-- (لا COMMENT هنا — storage.buckets يحتاج owner)

-- ═══════════════════════════════════════════════════════════════
-- التحقّق بعد التشغيل:
--
-- 1) policies على question-images/figures:
--    SELECT policyname, cmd, array_to_string(roles,',') AS roles
--    FROM pg_policies
--    WHERE schemaname='storage' AND tablename='objects'
--    ORDER BY policyname;
--    -- المتوقّع: 6 صفوف:
--    -- question_images_admin_insert / _admin_delete / _public_read
--    -- question_figures_admin_insert / _admin_delete / Public read question figures
--
-- 2) bucket constraints:
--    SELECT id, public, file_size_limit, allowed_mime_types
--    FROM storage.buckets
--    WHERE id IN ('question-images','question-figures');
--    -- المتوقّع: file_size_limit=5242880، allowed_mime_types=image/*
--
-- 3) اختبار رفع كـ anon (يفترض يفشل):
--    من client بدون auth:
--    supabase.storage.from('question-images').upload('test.jpg', file)
--    -- المتوقّع: 403 unauthorized
--
-- 4) اختبار رفع كـ admin (يفترض ينجح):
--    من client بـ JWT لمستخدم role='admin':
--    -- المتوقّع: نجاح
-- ═══════════════════════════════════════════════════════════════
