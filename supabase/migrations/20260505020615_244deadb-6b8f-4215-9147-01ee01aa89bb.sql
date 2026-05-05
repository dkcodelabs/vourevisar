
-- Coupons: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Authenticated can view active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING ((active = true) AND ((valid_until IS NULL) OR (valid_until > now())));

-- Storage: ensure only owner-folder upload policy remains; add UPDATE policy
DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
CREATE POLICY "Users can update their own editais" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'temporary_editais' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'temporary_editais' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime messages: enable RLS and scope by topic containing user id
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated users can subscribe to own topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE '%' || auth.uid()::text || '%'
    )
  );
