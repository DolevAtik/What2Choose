export function getConversationPair(userId, otherUserId) {
  if (!userId || !otherUserId) throw new Error('Both chat participants are required')
  const [user1_id, user2_id] = [userId, otherUserId].sort()
  return { user1_id, user2_id }
}

export async function findConversation(supabase, userId, otherUserId, select = '*') {
  const { user1_id, user2_id } = getConversationPair(userId, otherUserId)
  return supabase
    .from('conversations')
    .select(select)
    .or(`and(user1_id.eq.${user1_id},user2_id.eq.${user2_id}),and(user1_id.eq.${user2_id},user2_id.eq.${user1_id})`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
}

export async function getOrCreateConversation(supabase, userId, otherUserId, select = '*') {
  const existing = await findConversation(supabase, userId, otherUserId, select)
  if (existing.error) return existing
  if (existing.data) return existing

  const created = await supabase
    .from('conversations')
    .insert({ user1_id: userId, user2_id: otherUserId })
    .select(select)
    .single()

  if (!created.error) return created

  // Another client may have inserted the same pair after our initial lookup.
  if (created.error.code === '23505' || /duplicate key/i.test(created.error.message || '')) {
    return findConversation(supabase, userId, otherUserId, select)
  }

  return created
}
