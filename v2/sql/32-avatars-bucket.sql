-- ═══════════════════════════════════════════════════════════════
-- 32-avatars-bucket.sql
-- إنشاء bucket "avatars" + RLS policies لرفع صور المستخدمين
-- ═══════════════════════════════════════════════════════════════
-- يُشغَّل مرة واحدة في Supabase SQL Editor

-- ── إنشاء الـ bucket كـ public ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5 * 1024 * 1024, -- 5 MB كحد أقصى للصورة الواحدة
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── السياسات الأمنية ──────────────────────────────────────────
-- 1) قراءة عامة (لتعرض الـ avatar في كل مكان حتى بدون auth)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 2) المستخدم يقدر يرفع/يحدّث/يحذف صورته فقط (المسار يبدأ بـ user_id)
CREATE POLICY "avatars_own_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_own_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "avatars_own_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
