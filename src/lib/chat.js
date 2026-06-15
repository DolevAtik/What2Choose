import { supabase } from './supabase'
import { withTimeout } from './withTimeout'

function conversationPair(userId, otherUserId) {
  return userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId]
}

async function findConversation(userId, otherUserId) {
  const { data, error } = await withTimeout(
    supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(1),
    12000,
    'Opening conversation timed out'
  )

  if (error) throw error
  return data?.[0] || null
}

export async function getOrCreateConversation(userId, otherUserId) {
  if (!userId || !otherUserId || userId === otherUserId) return null

  const existing = await findConversation(userId, otherUserId)
  if (existing) return existing

  const [user1_id, user2_id] = conversationPair(userId, otherUserId)
  const { data, error } = await withTimeout(
    supabase
      .from('conversations')
      .insert({ user1_id, user2_id })
      .select()
      .single(),
    12000,
    'Creating conversation timed out'
  )

  if (!error) return data

  if (error.code === '23505') {
    return findConversation(userId, otherUserId)
  }

  throw error
}

export function mergeMessagesById(currentMessages, nextMessages) {
  const byId = new Map()
  ;[...currentMessages, ...nextMessages].forEach((message) => {
    if (message?.id) byId.set(message.id, message)
  })
  return Array.from(byId.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}
