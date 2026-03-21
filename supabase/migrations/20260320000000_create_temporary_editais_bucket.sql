-- Create storage bucket for temporary PDF uploads (editais)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temporary_editais',
  'temporary_editais',
  true,  -- public needed for Gemini to fetch via URL
  52428800,  -- 50MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload editais"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'temporary_editais');

-- Allow authenticated users to read their own uploads
CREATE POLICY "Users can read their own editais"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'temporary_editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access (needed for Gemini edge function)
CREATE POLICY "Public can read editais"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'temporary_editais');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own editais"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'temporary_editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Note: Auto-cleanup of old files should be handled via:
-- 1. Supabase Dashboard > Storage > Lifecycle rules (set to 1 day)
-- 2. Or a scheduled function that deletes files older than 24h
