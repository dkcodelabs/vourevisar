-- Create a new storage bucket for temporary edital files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('temporary_editais', 'temporary_editais', true)
ON CONFLICT (id) DO NOTHING;

-- Policies to allow authenticated users to upload
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow Authenticated Uploads' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Allow Authenticated Uploads" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'temporary_editais');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'Allow Public Read' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Allow Public Read" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'temporary_editais');
    END IF;
END $$;
;
