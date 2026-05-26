import { supabase } from './supabase'
import { withTimeout } from './withTimeout'

async function findConversation(currentUserId, otherUserId) {
  const { data, error } = await withTimeout(
    supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true })
      .limit(1),
    12000,
    'Opening conversation timed out'
  )

  if (error) throw error
  return data?.[0] || null
}

export async function getOrCreateConversation(currentUserId, otherUserId) {
  const existing = await findConversation(currentUserId, otherUserId)
  if (existing) return existing

  const { data: newConv, error: createError } = await withTimeout(
    supabase
      .from('conversations')
      .insert({ user1_id: currentUserId, user2_id: otherUserId })
      .select()
      .single(),
    12000,
    'Creating conversation timed out'
  )

  if (!createError) return newConv

  // Another client may have created the same unordered pair between our read and insert.
  if (createError.code === '23505') {
    const racedConversation = await findConversation(currentUserId, otherUserId)
    if (racedConversation) return racedConversation
  }

  throw createError
}
