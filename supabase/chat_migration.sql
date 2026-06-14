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
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user1_id, user2_id)
);

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

-- Merge any existing reversed duplicate pairs before enforcing unordered
-- uniqueness; messages are kept by moving them to the oldest conversation.
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
  FROM conversations
),
repointed AS (
  UPDATE messages m
  SET conversation_id = r.keep_id
  FROM ranked r
  WHERE m.conversation_id = r.id
    AND r.rn > 1
  RETURNING m.id
)
DELETE FROM conversations c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unordered_pair_idx
  ON conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- 3. Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: only members can see/create
CREATE POLICY "Members can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IN (user1_id, user2_id)
    AND user1_id <> user2_id
  );

DROP POLICY IF EXISTS "Members can update (updated_at)" ON conversations;

-- Messages: only conversation members
CREATE POLICY "Members can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

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

-- 4. Realtime (enable for both tables)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1      ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2      ON conversations(user2_id);
