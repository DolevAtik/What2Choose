-- ============================================================
-- What2Choose - Schema V5
-- Critical security and integrity fixes for existing databases.
-- Run after schema.sql, schema_v2.sql, schema_v3.sql, schema_v4.sql,
-- chat_migration.sql, and storage_avatars.sql as applicable.
-- ============================================================

-- Keep profile email private while public profile rows remain readable.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, avatar_url, created_at) on public.profiles to anon, authenticated;
grant insert (id, email, username, avatar_url) on public.profiles to authenticated;
grant update (email, username, avatar_url) on public.profiles to authenticated;

-- Vote identities are private to the voter and post author. Public counts go
-- through SECURITY DEFINER RPCs that only return aggregates.
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

-- Notifications are created only by SECURITY DEFINER triggers.
do $$
begin
  if to_regclass('public.notifications') is not null then
    alter table public.notifications
      drop constraint if exists notifications_type_check;
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('vote', 'comment', 'follow', 'like'));

    drop policy if exists "System can insert notifications" on public.notifications;
    revoke insert on public.notifications from anon, authenticated;
    revoke update on public.notifications from anon, authenticated;
    grant update (read) on public.notifications to authenticated;
  end if;
end $$;

-- Storage writes must stay inside the authenticated user's folder.
drop policy if exists "Auth users can upload post-images" on storage.objects;
create policy "Auth users can upload post-images" on storage.objects
  for insert with check (
    bucket_id = 'post-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Anyone can upload an avatar." on storage.objects;
drop policy if exists "Users can upload own avatars." on storage.objects;
create policy "Users can upload own avatars."
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Anyone can update an avatar." on storage.objects;
drop policy if exists "Users can update own avatars." on storage.objects;
create policy "Users can update own avatars."
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own avatars." on storage.objects;
create policy "Users can delete own avatars."
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat hardening is guarded so this migration can run before chat is enabled.
do $$
begin
  if to_regclass('public.messages') is not null then
    alter table public.messages drop constraint if exists messages_post_id_fkey;
    alter table public.messages
      add constraint messages_post_id_fkey
      foreign key (post_id) references public.posts(id) on delete cascade;
  end if;

  if to_regclass('public.conversations') is not null then
    drop table if exists conversation_dedupe;
    create temp table conversation_dedupe on commit drop as
    select
      id,
      first_value(id) over (
        partition by least(user1_id, user2_id), greatest(user1_id, user2_id)
        order by created_at, id
      ) as keep_id
    from public.conversations;

    if to_regclass('public.messages') is not null then
      update public.messages m
      set conversation_id = d.keep_id
      from conversation_dedupe d
      where m.conversation_id = d.id
        and d.id <> d.keep_id;
    end if;

    delete from public.conversations c
    using conversation_dedupe d
    where c.id = d.id
      and d.id <> d.keep_id;

    drop table conversation_dedupe;

    drop policy if exists "Members can update (updated_at)" on public.conversations;
    revoke update on public.conversations from anon, authenticated;

    create unique index if not exists idx_conversations_unique_members
      on public.conversations (least(user1_id, user2_id), greatest(user1_id, user2_id));
  end if;
end $$;
