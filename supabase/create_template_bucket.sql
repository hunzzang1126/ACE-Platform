-- ─────────────────────────────────────────────────
-- Create 'ace-templates' PUBLIC storage bucket
-- ─────────────────────────────────────────────────
-- Template images are stored here so ALL users can access them
-- without signed URLs. Only admins can upload.

-- Step 1: Create the bucket (run in Supabase Dashboard → Storage → New Bucket)
-- Name: ace-templates
-- Public: YES

-- Step 2: Add RLS policies (run in SQL Editor)

-- Allow anyone to READ template images (public)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'ace-templates');

-- Allow authenticated users to UPLOAD template images (admin check if needed)
CREATE POLICY "Admin upload access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'ace-templates'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to UPDATE (upsert) template images
CREATE POLICY "Admin update access"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'ace-templates'
    AND auth.role() = 'authenticated'
);
