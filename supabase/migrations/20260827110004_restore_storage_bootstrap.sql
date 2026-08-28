-- The public/private snapshot intentionally excludes Storage. Recreate only
-- current bucket configuration and policies, never production objects.
insert into storage.buckets (id, name, public)
values
  ('email-assets', 'email-assets', true),
  ('temporary_editais', 'temporary_editais', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Email assets are publicly accessible" on storage.objects;
drop policy if exists "Allow Authenticated Uploads" on storage.objects;
drop policy if exists "Allow Public Read" on storage.objects;
drop policy if exists "Public can read editais" on storage.objects;
drop policy if exists "Authenticated users can upload editais" on storage.objects;
drop policy if exists "Users can upload to own editais folder" on storage.objects;
drop policy if exists "Users can update their own editais" on storage.objects;

create policy "Users can upload to own editais folder"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'temporary_editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own editais"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'temporary_editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'temporary_editais'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
