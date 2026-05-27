import { supabase } from './supabase'
import { withTimeout } from './withTimeout'

function conversationPairFilter(userId, otherUserId) {
  return `and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`
}

function isUniqueViolation(error) {
  return error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate key')
}

export async function findConversation(userId, otherUserId, select = '*') {
  const { data, error } = await withTimeout(
    supabase
      .from('conversations')
      .select(select)
      .or(conversationPairFilter(userId, otherUserId))
      .order('created_at', { ascending: true })
      .limit(1),
    12000,
    'Opening conversation timed out'
  )

  if (error) throw error
  return data?.[0] || null
}

export async function getOrCreateConversation(userId, otherUserId, select = '*') {
  if (!userId || !otherUserId || userId === otherUserId) {
    throw new Error('Invalid conversation participants')
  }

  const existing = await findConversation(userId, otherUserId, select)
  if (existing) return existing

  const { data, error } = await withTimeout(
    supabase
      .from('conversations')
      .insert({ user1_id: userId, user2_id: otherUserId })
      .select(select)
      .single(),
    12000,
    'Creating conversation timed out'
  )

  if (!error) return data

  if (isUniqueViolation(error)) {
    const raced = await findConversation(userId, otherUserId, select)
    if (raced) return raced
  }

  throw error
}
