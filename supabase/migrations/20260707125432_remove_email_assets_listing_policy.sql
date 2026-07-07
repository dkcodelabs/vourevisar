-- Public buckets do not need a broad SELECT policy on storage.objects for
-- public object URLs to work. Dropping this policy prevents clients from
-- listing every file in email-assets.
drop policy if exists "Email assets are publicly accessible" on storage.objects;
