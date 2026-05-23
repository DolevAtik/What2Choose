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
  CONSTRAINT conversations_distinct_users CHECK (user1_id <> user2_id),
  CONSTRAINT conversations_canonical_order CHECK (user1_id < user2_id),
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

-- Keep one canonical conversation per unordered pair even on databases that
-- were initialized with the older ordered-pair uniqueness constraint.
WITH ranked_conversations AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS keep_id
  FROM conversations
  WHERE user1_id <> user2_id
)
UPDATE messages m
SET conversation_id = r.keep_id
FROM ranked_conversations r
WHERE m.conversation_id = r.id
  AND r.id <> r.keep_id;

WITH ranked_conversations AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id)
      ORDER BY created_at, id
    ) AS keep_id
  FROM conversations
  WHERE user1_id <> user2_id
)
DELETE FROM conversations c
USING ranked_conversations r
WHERE c.id = r.id
  AND r.id <> r.keep_id;

UPDATE conversations
SET
  user1_id = LEAST(user1_id, user2_id),
  user2_id = GREATEST(user1_id, user2_id)
WHERE user1_id > user2_id;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_distinct_users;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_distinct_users CHECK (user1_id <> user2_id) NOT VALID;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_canonical_order;
ALTER TABLE conversations
  ADD CONSTRAINT conversations_canonical_order CHECK (user1_id < user2_id) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unordered_pair_idx
  ON conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_post_id_fkey;
ALTER TABLE messages
  ADD CONSTRAINT messages_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- 3. Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: only members can see/create. Conversation rows are immutable
-- after creation so a member cannot swap another participant into old messages.
CREATE POLICY "Members can view their conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() IN (user1_id, user2_id)
    AND user1_id < user2_id
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
