-- ============================================================
-- What2Choose - Schema V5
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Fixes: public PII reads, vote identity leaks, forged notifications,
-- storage ownership, and chat conversation/data-integrity regressions.
-- ============================================================

-- ============================================================
-- Profiles: expose only public columns to anon/authenticated clients
-- ============================================================
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO anon, authenticated;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, avatar_url) ON public.profiles TO authenticated;
GRANT INSERT (id, email, username, avatar_url) ON public.profiles TO authenticated;

-- ============================================================
-- Votes: keep aggregate choice counts public, hide voter identity by default
-- ============================================================
REVOKE SELECT ON public.votes FROM anon, authenticated;
GRANT SELECT (post_id, choice) ON public.votes TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_vote(target_post_id uuid)
RETURNS TABLE(choice text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.choice
  FROM public.votes v
  WHERE v.post_id = target_post_id
    AND v.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_post_voters(target_post_id uuid)
RETURNS TABLE(choice text, user_id uuid, username text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.choice, v.user_id, p.username, p.avatar_url
  FROM public.votes v
  JOIN public.posts po ON po.id = v.post_id
  LEFT JOIN public.profiles p ON p.id = v.user_id
  WHERE v.post_id = target_post_id
    AND po.author_id = auth.uid()
  ORDER BY v.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_vote(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_voters(uuid) TO authenticated;

-- ============================================================
-- Notifications: only trigger/security-definer code should insert
-- ============================================================
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- ============================================================
-- Storage: writes must live under the authenticated user's folder
-- ============================================================
DROP POLICY IF EXISTS "Auth users can upload post-images" ON storage.objects;
CREATE POLICY "Auth users can upload post-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can update an avatar." ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Chat: merge duplicate unordered pairs and enforce one conversation per pair
-- ============================================================
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS rn
  FROM public.conversations
),
repointed AS (
  UPDATE public.messages m
  SET conversation_id = r.keep_id
  FROM ranked r
  WHERE m.conversation_id = r.id
    AND r.rn > 1
  RETURNING m.id
)
DELETE FROM public.conversations c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unordered_pair_idx
  ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() IN (user1_id, user2_id)
    AND user1_id <> user2_id
  );

DROP POLICY IF EXISTS "Members can update (updated_at)" ON public.conversations;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_post_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
