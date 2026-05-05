
-- 1. notifications insert
DROP POLICY IF EXISTS notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. organization_members self-join bug
DROP POLICY IF EXISTS "Members can view organization membership" ON public.organization_members;
CREATE POLICY "Members can view organization membership" ON public.organization_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
    )
  );

-- 3. organizations self-join bug
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
CREATE POLICY "Members can view their organizations" ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
    )
  );

-- 4. ai_error_logs / ai_status: restrict to admins
DROP POLICY IF EXISTS "Allow all access to ai_error_logs" ON public.ai_error_logs;
CREATE POLICY "Admins can view ai_error_logs" ON public.ai_error_logs
  FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage ai_error_logs" ON public.ai_error_logs
  FOR ALL TO authenticated
  USING (has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow all access to ai_status" ON public.ai_status;
CREATE POLICY "Admins can view ai_status" ON public.ai_status
  FOR SELECT TO authenticated
  USING (has_role_or_higher(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage ai_status" ON public.ai_status
  FOR ALL TO authenticated
  USING (has_role_or_higher(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'admin'::app_role));

-- 5. admin_error_events: drop the overly permissive duplicates
DROP POLICY IF EXISTS "Admins can view error logs" ON public.admin_error_events;
DROP POLICY IF EXISTS "Admins can update error logs" ON public.admin_error_events;

-- 6. storage.objects temporary_editais: remove public read, restrict uploads to user folder
DROP POLICY IF EXISTS "Allow Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Public can read editais" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload editais" ON storage.objects;
CREATE POLICY "Users can upload to own editais folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'temporary_editais'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'temporary_editais';
