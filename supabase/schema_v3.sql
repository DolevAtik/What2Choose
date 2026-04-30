-- ============================================================
-- What2Choose – Schema V3
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Adds: multi-option poll columns, likes table
-- ============================================================

-- ============================================================
-- Add extra option columns to posts (nullable, backward-compatible)
-- ============================================================
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS option_c_url text,
  ADD COLUMN IF NOT EXISTS option_d_url text;

-- ============================================================
-- Update votes choice constraint to allow C and D
-- ============================================================
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_choice_check;
ALTER TABLE public.votes
  ADD CONSTRAINT votes_choice_check CHECK (choice IN ('A', 'B', 'C', 'D'));

-- ============================================================
-- TABLE: likes (post likes OR comment likes, never both)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id     uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  -- Ensure each user can only like each post/comment once
  UNIQUE (user_id, post_id),
  UNIQUE (user_id, comment_id),
  -- Ensure exactly one of post_id / comment_id is set
  CONSTRAINT likes_one_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes are public" ON public.likes;
CREATE POLICY "Likes are public" ON public.likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can like" ON public.likes;
CREATE POLICY "Auth users can like" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike" ON public.likes;
CREATE POLICY "Users can unlike" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Notification on post like (notify post author)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author uuid;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT author_id INTO post_author FROM public.posts WHERE id = NEW.post_id;
    IF post_author IS NOT NULL AND post_author <> NEW.user_id THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
      VALUES (post_author, NEW.user_id, 'like', NEW.post_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();
