-- Recreate temporary_editais bucket with proper configuration
-- Run this to fix storage issues

-- Check if bucket exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'temporary_editais') THEN
        -- Create bucket if not exists
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'temporary_editais',
            'temporary_editais',
            true,
            52428800,
            ARRAY['application/pdf']
        );
    ELSE
        -- Update existing bucket
        UPDATE storage.buckets 
        SET public = true, 
            file_size_limit = 52428800, 
            allowed_mime_types = ARRAY['application/pdf']
        WHERE id = 'temporary_editais';
    END IF;
END $$;

-- Recreate policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload editais" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own editais" ON storage.objects;
DROP POLICY IF EXISTS "Public can read editais" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own editais" ON storage.objects;

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