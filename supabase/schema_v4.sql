-- ============================================================
-- What2Choose – Schema V4
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Adds: text-only options support for posts
-- ============================================================

-- 1) Allow posts to be created without image URLs (text-only posts)
ALTER TABLE public.posts
  ALTER COLUMN option_a_url DROP NOT NULL,
  ALTER COLUMN option_b_url DROP NOT NULL;

-- 2) Add text option columns (nullable)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS option_a_text text,
  ADD COLUMN IF NOT EXISTS option_b_text text,
  ADD COLUMN IF NOT EXISTS option_c_text text,
  ADD COLUMN IF NOT EXISTS option_d_text text;

-- 3) Basic sanity constraint:
-- Each option must have either url or text (for A/B required, C/D optional)
-- Note: this is kept permissive to avoid breaking existing rows; tighten later if needed.
ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_options_nonempty_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_options_nonempty_check CHECK (
    (
      (option_a_url IS NOT NULL AND option_a_url <> '') OR
      (option_a_text IS NOT NULL AND option_a_text <> '')
    )
    AND
    (
      (option_b_url IS NOT NULL AND option_b_url <> '') OR
      (option_b_text IS NOT NULL AND option_b_text <> '')
    )
  );

