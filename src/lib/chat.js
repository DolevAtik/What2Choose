import { supabase } from './supabase'
import { withTimeout } from './withTimeout'

function orderedPair(userA, userB) {
  return userA < userB ? [userA, userB] : [userB, userA]
}

export async function getOrCreateConversation(currentUserId, targetUserId) {
  const { data: existing, error: existingError } = await withTimeout(
    supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
      .maybeSingle(),
    12000,
    'Opening conversation timed out'
  )

  if (existingError) throw existingError
  if (existing) return existing

  const [user1_id, user2_id] = orderedPair(currentUserId, targetUserId)
  const { data: created, error: createError } = await withTimeout(
    supabase
      .from('conversations')
      .insert({ user1_id, user2_id })
      .select('*')
      .single(),
    12000,
    'Creating conversation timed out'
  )

  if (!createError) return created
  if (createError.code !== '23505') throw createError

  const { data: raced, error: racedError } = await withTimeout(
    supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
      .single(),
    12000,
    'Loading conversation timed out'
  )

  if (racedError) throw racedError
  return raced
}
