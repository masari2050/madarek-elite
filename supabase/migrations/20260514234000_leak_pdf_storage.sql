-- ============================================================
-- Migration: PDF Downloads — Public bucket + counter + RPC
-- ============================================================

BEGIN;

-- 1. أعمدة جديدة على leak_groups
ALTER TABLE leak_groups
    ADD COLUMN IF NOT EXISTS pdf_url       TEXT,
    ADD COLUMN IF NOT EXISTS pdf_downloads INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pdf_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN leak_groups.pdf_url IS 'رابط PDF التسريبات في Supabase Storage (public)';
COMMENT ON COLUMN leak_groups.pdf_downloads IS 'عداد التحميلات (يُزاد عبر RPC)';

-- 2. bucket عام للـPDFs (لو غير موجود)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'leaks-pdfs',
    'leaks-pdfs',
    true,
    52428800,  -- 50 MB
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 3. سياسات RLS — قراءة عامة، كتابة admin فقط
DROP POLICY IF EXISTS "leaks_pdfs_public_read" ON storage.objects;
CREATE POLICY "leaks_pdfs_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'leaks-pdfs');

DROP POLICY IF EXISTS "leaks_pdfs_admin_write" ON storage.objects;
CREATE POLICY "leaks_pdfs_admin_write"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'leaks-pdfs' AND is_admin());

DROP POLICY IF EXISTS "leaks_pdfs_admin_update" ON storage.objects;
CREATE POLICY "leaks_pdfs_admin_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'leaks-pdfs' AND is_admin());

DROP POLICY IF EXISTS "leaks_pdfs_admin_delete" ON storage.objects;
CREATE POLICY "leaks_pdfs_admin_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'leaks-pdfs' AND is_admin());

-- 4. RPC لزيادة العداد (anon allowed — أي زائر بالرابط)
CREATE OR REPLACE FUNCTION increment_pdf_download(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_url TEXT;
BEGIN
    UPDATE leak_groups
    SET pdf_downloads = pdf_downloads + 1
    WHERE id = p_group_id AND is_active = true
    RETURNING pdf_url INTO v_url;
    -- إن لم يكن موجوداً، نرجع NULL
    RETURN v_url;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_pdf_download(UUID) TO anon, authenticated;

COMMIT;

-- تحقّق
SELECT id, title, pdf_url, pdf_downloads FROM leak_groups
WHERE id = 'cfaf82ac-dc99-43ac-8d00-d44133802245';
