import { supabase } from './supabase'

function conversationFilter(userId, otherUserId) {
  return `and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`
}

function orderedPair(userId, otherUserId) {
  return [userId, otherUserId].sort()
}

async function findConversation(userId, otherUserId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(conversationFilter(userId, otherUserId))
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

export async function getOrCreateConversation(userId, otherUserId) {
  const existing = await findConversation(userId, otherUserId)
  if (existing) return existing

  const [user1_id, user2_id] = orderedPair(userId, otherUserId)
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user1_id, user2_id })
    .select()
    .single()

  if (!error && created) return created

  // Another client may have inserted the pair after our lookup.
  if (error?.code === '23505') {
    const raced = await findConversation(userId, otherUserId)
    if (raced) return raced
  }

  throw error
}
