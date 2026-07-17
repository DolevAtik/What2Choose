-- ============================================================
-- What2Choose – One-time fix: convert old "like" notifications
-- Background: older schema_v3.sql inserted notifications with type='vote' for likes.
-- This script attempts to flip those to type='like' when they match a row in public.likes.
-- ============================================================

-- IMPORTANT:
-- Run only after you have applied the updated notification type constraint
-- (schema_v2.sql allowing 'like') and updated like trigger (schema_v3.sql).

-- Heuristic match:
-- A notification is considered a like-notification if:
-- - it is type='vote'
-- - it has post_id + actor_id
-- - and a matching like exists for (post_id, actor_id)
-- - and the timestamps are close (within 10 minutes) to avoid changing real vote notifications.
-- - and the actor has not also voted on the post, since that row is ambiguous.

UPDATE public.notifications n
SET type = 'like'
WHERE n.type = 'vote'
  AND n.post_id IS NOT NULL
  AND n.actor_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.likes l
    WHERE l.post_id = n.post_id
      AND l.user_id = n.actor_id
      AND abs(extract(epoch from (n.created_at - l.created_at))) <= 600
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.votes v
    WHERE v.post_id = n.post_id
      AND v.user_id = n.actor_id
  );

