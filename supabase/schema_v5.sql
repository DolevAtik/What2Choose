-- ============================================================
-- What2Choose – Schema V5
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- Fixes: public profile/vote leaks, notification forgery,
-- storage ownership, and chat/post integrity regressions.
-- ============================================================

-- Public profiles should not expose email addresses through joins.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO anon, authenticated;
GRANT INSERT (id, email, username, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (username, avatar_url) ON public.profiles TO authenticated;

-- Keep vote choices/counts public through narrow RPCs, not raw user_id rows.
DROP POLICY IF EXISTS "Votes are public" ON public.votes;
REVOKE SELECT ON public.votes FROM anon, authenticated;
GRANT INSERT (post_id, user_id, choice) ON public.votes TO authenticated;

CREATE OR REPLACE FUNCTION public.get_post_vote_counts(target_post_ids uuid[])
RETURNS TABLE(post_id uuid, choice text, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.post_id, v.choice, count(*)::bigint
  FROM public.votes v
  WHERE v.post_id = ANY(target_post_ids)
  GROUP BY v.post_id, v.choice;
$$;

REVOKE ALL ON FUNCTION public.get_post_vote_counts(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_vote_counts(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_votes(target_post_ids uuid[])
RETURNS TABLE(post_id uuid, choice text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.post_id, v.choice
  FROM public.votes v
  WHERE auth.uid() IS NOT NULL
    AND v.user_id = auth.uid()
    AND v.post_id = ANY(target_post_ids);
$$;

REVOKE ALL ON FUNCTION public.get_my_votes(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_votes(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_post_voters(target_post_id uuid)
RETURNS TABLE(choice text, user_id uuid, username text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.choice, v.user_id, p.username, p.avatar_url
  FROM public.votes v
  JOIN public.profiles p ON p.id = v.user_id
  WHERE v.post_id = target_post_id
    AND EXISTS (
      SELECT 1
      FROM public.posts owned_post
      WHERE owned_post.id = target_post_id
        AND owned_post.author_id = auth.uid()
    )
  ORDER BY v.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_post_voters(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_voters(uuid) TO authenticated;

-- Notifications are written by SECURITY DEFINER triggers only.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Enforce storage ownership by requiring object paths to start with auth.uid().
DROP POLICY IF EXISTS "Auth users can upload post-images" ON storage.objects;
CREATE POLICY "Auth users can upload post-images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar." ON storage.objects;
CREATE POLICY "Users can upload their own avatar."
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Anyone can update an avatar." ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar." ON storage.objects;
CREATE POLICY "Users can update their own avatar."
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar." ON storage.objects;
CREATE POLICY "Users can delete their own avatar."
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Chat repair is conditional so this migration can run before chat_migration.sql.
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'messages'
        AND constraint_name = 'messages_post_id_fkey'
    ) THEN
      ALTER TABLE public.messages DROP CONSTRAINT messages_post_id_fkey;
    END IF;

    ALTER TABLE public.messages
      ADD CONSTRAINT messages_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL
     AND to_regclass('public.messages') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        id,
        first_value(id) OVER (
          PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
          ORDER BY created_at, id
        ) AS keep_id,
        row_number() OVER (
          PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
          ORDER BY created_at, id
        ) AS rn
      FROM public.conversations
      WHERE user1_id <> user2_id
    )
    UPDATE public.messages m
    SET conversation_id = ranked.keep_id
    FROM ranked
    WHERE ranked.rn > 1
      AND m.conversation_id = ranked.id;

    WITH ranked AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
          ORDER BY created_at, id
        ) AS rn
      FROM public.conversations
      WHERE user1_id <> user2_id
    )
    DELETE FROM public.conversations c
    USING ranked
    WHERE ranked.rn > 1
      AND c.id = ranked.id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.conversations') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'conversations'
        AND constraint_name = 'conversations_distinct_users_check'
    ) THEN
      ALTER TABLE public.conversations
        ADD CONSTRAINT conversations_distinct_users_check
        CHECK (user1_id <> user2_id) NOT VALID;
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS conversations_unordered_pair_idx
      ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
      WHERE user1_id <> user2_id;

    DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
    CREATE POLICY "Authenticated users can create conversations"
      ON public.conversations FOR INSERT
      WITH CHECK (
        auth.uid() IN (user1_id, user2_id)
        AND user1_id <> user2_id
      );

    DROP POLICY IF EXISTS "Members can update (updated_at)" ON public.conversations;
    REVOKE UPDATE ON public.conversations FROM anon, authenticated;
    GRANT UPDATE (updated_at) ON public.conversations TO authenticated;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS on_message_touch_conversation ON public.messages;
    CREATE TRIGGER on_message_touch_conversation
      AFTER INSERT ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();
  END IF;
END $$;
