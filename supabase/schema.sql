-- ============================================================
-- What2Choose – Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  username    text,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- Category enum (safe: won't fail if already exists)
do $$ begin
  create type post_category as enum ('Fashion', 'Food', 'Shopping', 'Travel');
exception when duplicate_object then null;
end $$;

-- Posts
create table if not exists public.posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  question      text not null,
  option_a_url  text not null,
  option_b_url  text not null,
  category      post_category,
  created_at    timestamptz default now()
);

-- Votes (one vote per user per post enforced by unique constraint)
create table if not exists public.votes (
  id        uuid primary key default uuid_generate_v4(),
  post_id   uuid not null references public.posts(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  choice    text not null check (choice in ('A', 'B')),
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id         uuid primary key default uuid_generate_v4(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.posts     enable row level security;
alter table public.votes     enable row level security;
alter table public.comments  enable row level security;

-- Profiles: public read, owner write
drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable" on public.profiles
  for select using (true);

-- Keep profile email private even though public profile rows are readable.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_url, created_at) on public.profiles to anon, authenticated;
grant insert (id, email, username, avatar_url) on public.profiles to authenticated;
grant update (email, username, avatar_url) on public.profiles to authenticated;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Posts: public read, auth insert, owner delete
drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public" on public.posts
  for select using (true);

drop policy if exists "Auth users can insert posts" on public.posts;
create policy "Auth users can insert posts" on public.posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "Authors can delete own posts" on public.posts;
create policy "Authors can delete own posts" on public.posts
  for delete using (auth.uid() = author_id);

-- Votes: public aggregate counts via RPC, row-level identities only for voters/authors.
drop policy if exists "Votes are public" on public.votes;

drop policy if exists "Users can read own votes" on public.votes;
create policy "Users can read own votes" on public.votes
  for select using (auth.uid() = user_id);

drop policy if exists "Post authors can read votes on own posts" on public.votes;
create policy "Post authors can read votes on own posts" on public.votes
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = votes.post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists "Auth users can vote" on public.votes;
create policy "Auth users can vote" on public.votes
  for insert with check (auth.uid() = user_id);

create or replace function public.get_vote_counts(post_uuid uuid)
returns table(choice text, vote_count bigint)
language sql
security definer
set search_path = public
as $$
  select v.choice, count(*)::bigint as vote_count
  from public.votes v
  where v.post_id = post_uuid
  group by v.choice
$$;

grant execute on function public.get_vote_counts(uuid) to anon, authenticated;

create or replace function public.get_post_voters(post_uuid uuid)
returns table(choice text, user_id uuid, username text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select v.choice, v.user_id, p.username, p.avatar_url
  from public.votes v
  join public.posts po on po.id = v.post_id
  join public.profiles p on p.id = v.user_id
  where v.post_id = post_uuid
    and po.author_id = auth.uid()
  order by v.created_at desc
$$;

grant execute on function public.get_post_voters(uuid) to authenticated;

-- Comments: public read, auth insert, owner delete
drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public" on public.comments
  for select using (true);

drop policy if exists "Auth users can comment" on public.comments;
create policy "Auth users can comment" on public.comments
  for insert with check (auth.uid() = user_id);

drop policy if exists "Authors can delete own comments" on public.comments;
create policy "Authors can delete own comments" on public.comments
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET: post-images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Public read post-images" on storage.objects;
create policy "Public read post-images" on storage.objects
  for select using (bucket_id = 'post-images');

drop policy if exists "Auth users can upload post-images" on storage.objects;
create policy "Auth users can upload post-images" on storage.objects
  for insert with check (
    bucket_id = 'post-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own post-images" on storage.objects;
create policy "Users can delete own post-images" on storage.objects
  for delete using (
    bucket_id = 'post-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
