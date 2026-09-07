import { supabase } from './supabase'

function pairFilter(userId, otherUserId) {
  return `and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`
}

async function findConversation(userId, otherUserId, columns) {
  const { data, error } = await supabase
    .from('conversations')
    .select(columns)
    .or(pairFilter(userId, otherUserId))
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

export async function getOrCreateConversation(userId, otherUserId, columns = '*') {
  if (!userId || !otherUserId) throw new Error('Missing conversation participant.')
  if (userId === otherUserId) throw new Error('Cannot create a conversation with yourself.')

  const existing = await findConversation(userId, otherUserId, columns)
  if (existing) return existing

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user1_id: userId, user2_id: otherUserId })
    .select(columns)
    .single()

  if (!error) return data

  if (error.code === '23505' || String(error.message || '').toLowerCase().includes('duplicate')) {
    const raced = await findConversation(userId, otherUserId, columns)
    if (raced) return raced
  }

  throw error
}
