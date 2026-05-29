-- ============================================================
-- What2Choose Chat Feature – Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Conversations table (one row per unique pair of users)
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id    uuid REFERENCES auth.users NOT NULL,
  user2_id    uuid REFERENCES auth.users NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_user1_id_user2_id_key;

-- 2. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       uuid REFERENCES auth.users NOT NULL,
  content         text,                          -- null when sharing a post
  post_id         uuid REFERENCES posts(id) ON DELETE CASCADE, -- null for text messages
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  CHECK (content IS NOT NULL OR post_id IS NOT NULL)
);

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_post_id_fkey;

ALTER TABLE messages
  ADD CONSTRAINT messages_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- Collapse duplicate rows for the same unordered user pair before enforcing uniqueness.
WITH ranked_conversations AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS row_num
  FROM conversations
)
UPDATE messages m
SET conversation_id = r.keep_id
FROM ranked_conversations r
WHERE m.conversation_id = r.id
  AND r.row_num > 1;

WITH ranked_conversations AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS row_num
  FROM conversations
)
DELETE FROM conversations c
USING ranked_conversations r
WHERE c.id = r.id
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unique_user_pair
  ON conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- 3. Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: only members can see/create
DROP POLICY IF EXISTS "Members can view their conversations" ON conversations;
CREATE POLICY "Members can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Members can update (updated_at)" ON conversations;
REVOKE UPDATE ON conversations FROM anon, authenticated;

-- Messages: only conversation members
DROP POLICY IF EXISTS "Members can view messages" ON messages;
CREATE POLICY "Members can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert messages" ON messages;
CREATE POLICY "Members can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.touch_conversation_updated_at()
RETURNS trigger AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_message_created_touch_conversation ON public.messages;
CREATE TRIGGER on_message_created_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_updated_at();

-- 4. Realtime (enable for both tables)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1      ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2      ON conversations(user2_id);
