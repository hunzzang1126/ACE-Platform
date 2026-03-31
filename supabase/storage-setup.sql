-- ═══════════════════════════════════════════════════════
-- ACE Platform — Supabase Storage Setup SQL
-- ═══════════════════════════════════════════════════════
-- Run this in Supabase Dashboard > SQL Editor
-- Creates the 'ace-assets' storage bucket + RLS policies
-- ═══════════════════════════════════════════════════════

-- 1. Create the storage bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ace-assets',
    'ace-assets',
    true,  -- public read (images are accessed via public URLs)
    52428800,  -- 50MB max file size
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif']
) ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Allow authenticated users to upload to their own folder
CREATE POLICY "Users upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS: Allow authenticated users to update their own files
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

-- 4. RLS: Allow authenticated users to delete their own files
CREATE POLICY "Users delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'ace-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. RLS: Allow anyone to read (public bucket)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ace-assets');
