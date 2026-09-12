-- ============================================================
-- What2Choose Chat Feature – Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Conversations table (one row per unique pair of users)
CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id    uuid REFERENCES auth.users NOT NULL,
  user2_id    uuid REFERENCES auth.users NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_members
  ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       uuid REFERENCES auth.users NOT NULL,
  content         text,                          -- null when sharing a post
  post_id         uuid REFERENCES public.posts(id) ON DELETE CASCADE, -- null for text messages
  read            boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  CHECK (content IS NOT NULL OR post_id IS NOT NULL)
);

-- 3. Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: only members can see/create
CREATE POLICY "Members can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

-- Messages: only conversation members
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "Members can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 4. Realtime (enable for both tables)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user1      ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2      ON public.conversations(user2_id);
