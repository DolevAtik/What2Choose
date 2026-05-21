-- ============================================================
-- What2Choose – Schema V2 (Run in Supabase Dashboard → SQL Editor)
-- Adds: follows table, notifications table, triggers, RLS
-- ============================================================

-- ============================================================
-- TABLE: follows
-- ============================================================
create table if not exists public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public" on public.follows
  for select using (true);

drop policy if exists "Auth users can follow" on public.follows;
create policy "Auth users can follow" on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow" on public.follows;
create policy "Users can unfollow" on public.follows
  for delete using (auth.uid() = follower_id);

-- ============================================================
-- TABLE: notifications
-- ============================================================
create table if not exists public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  type         text not null check (type in ('vote', 'comment', 'follow', 'like')),
  post_id      uuid references public.posts(id) on delete cascade,
  read         boolean default false,
  created_at   timestamptz default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = recipient_id);

drop policy if exists "System can insert notifications" on public.notifications;
-- Notifications are created by SECURITY DEFINER triggers below; clients must not forge them.
revoke insert on public.notifications from anon, authenticated;

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = recipient_id);

-- ============================================================
-- TRIGGER: Create notification on vote (notify post author)
-- ============================================================
create or replace function public.handle_new_vote()
returns trigger as $$
declare
  post_author uuid;
begin
  -- Get post author
  select author_id into post_author from public.posts where id = new.post_id;

  -- Don't notify if voting on own post
  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (post_author, new.user_id, 'vote', new.post_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_vote_created on public.votes;
create trigger on_vote_created
  after insert on public.votes
  for each row execute function public.handle_new_vote();

-- ============================================================
-- TRIGGER: Create notification on comment (notify post author)
-- ============================================================
create or replace function public.handle_new_comment()
returns trigger as $$
declare
  post_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;

  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (post_author, new.user_id, 'comment', new.post_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute function public.handle_new_comment();

-- ============================================================
-- TRIGGER: Create notification on follow
-- ============================================================
create or replace function public.handle_new_follow()
returns trigger as $$
begin
  if new.following_id <> new.follower_id then
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (new.following_id, new.follower_id, 'follow', null);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_follow_created on public.follows;
create trigger on_follow_created
  after insert on public.follows
  for each row execute function public.handle_new_follow();
