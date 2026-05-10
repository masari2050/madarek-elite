-- ============================================================
-- Migration 07 — Storage Bucket لصور الأسئلة
-- ============================================================

-- إنشاء bucket عام للقراءة (صور الأسئلة تعرض لكل المستخدمين)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'question-images',
    'question-images',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Policies: الأدمن/staff يرفع، الكل يقرأ
DO $$
BEGIN
    -- قراءة عامة
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'question_images_public_read') THEN
        CREATE POLICY "question_images_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'question-images');
    END IF;

    -- الرفع للأدمن فقط
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'question_images_admin_insert') THEN
        CREATE POLICY "question_images_admin_insert" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'question-images' AND
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
        );
    END IF;

    -- الحذف للأدمن فقط
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'question_images_admin_delete') THEN
        CREATE POLICY "question_images_admin_delete" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'question-images' AND
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','staff'))
        );
    END IF;
END $$;
