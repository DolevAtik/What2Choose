-- Create a new storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Set up access controls for storage.
-- See https://supabase.com/docs/guides/storage/security/access-control

-- Allow public read access to avatars
create policy "Avatar images are publicly accessible."
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatars
create policy "Anyone can upload an avatar."
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- Allow users to update their own avatars
create policy "Anyone can update an avatar."
  on storage.objects for update
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
