-- ═══════════════════════════════════════════════════════
-- ACE Platform — Supabase Storage Setup SQL
-- ═══════════════════════════════════════════════════════
-- Run this in Supabase Dashboard > SQL Editor
-- Creates the 'ace-assets' PRIVATE bucket + RLS policies
-- Only the owning user can access their files.
-- ═══════════════════════════════════════════════════════

-- 1. Create PRIVATE storage bucket (NOT public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ace-assets',
    'ace-assets',
    false,  -- ★ PRIVATE — no public URL access
    52428800,  -- 50MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif']
) ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Users can READ only their own files
CREATE POLICY "Users read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS: Users can UPLOAD to their own folder only
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS: Users can UPDATE their own files only
CREATE POLICY "Users update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. RLS: Users can DELETE their own files only
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
