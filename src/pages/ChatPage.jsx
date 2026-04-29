import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowLeft, MessageCircle, Search, X, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function ChatPage() {
  const { userId: targetUserId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Load conversations on mount
  useEffect(() => {
    if (!user) return
    loadConversations()
  }, [user])

  // Auto-open conversation if userId in URL
  useEffect(() => {
    if (!targetUserId || !user) return
    openOrCreateConversation(targetUserId)
  }, [targetUserId, user])

  // Real-time messages subscription
  useEffect(() => {
    if (!selectedConv) return
    setLoadingMsgs(true)
    loadMessages(selectedConv.id)

    let channel = null
    try {
      channel = supabase
        .channel(`messages:${selectedConv.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConv.id}`,
        }, async (payload) => {
          if (payload.new.post_id) {
            const { data } = await supabase
              .from('messages')
              .select('*, post:posts(id, question, option_a_url, author:profiles!author_id(username))')
              .eq('id', payload.new.id)
              .single()
            setMessages(prev => [...prev, data || payload.new])
          } else {
            setMessages(prev => [...prev, payload.new])
          }
        })
        .subscribe()
    } catch (e) { /* table not created yet */ }

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [selectedConv?.id])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    setLoadingConvs(true)
    try {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select(`*, messages(content, post_id, created_at, sender_id)`)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        throw error
      }

      if (convs) {
        const userIds = new Set()
        convs.forEach(c => {
          if (c.user1_id !== user.id) userIds.add(c.user1_id)
          if (c.user2_id !== user.id) userIds.add(c.user2_id)
        })

        const profilesMap = {}
        if (userIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', Array.from(userIds))
          
          if (profiles) {
            profiles.forEach(p => { profilesMap[p.id] = p })
          }
        }

        const enrichedConvs = convs.map(c => {
          const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id
          return {
            ...c,
            otherUser: profilesMap[otherId] || { id: otherId, username: 'Unknown' },
            lastMessage: c.messages?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0],
          }
        })

        setConversations(enrichedConvs)
        if (targetUserId) {
          const match = enrichedConvs.find(c => c.otherUser?.id === targetUserId)
          if (match) setSelectedConv(match)
        }
      }
    } catch (e) { 
      console.error('loadConversations failed:', e)
    } finally {
      setLoadingConvs(false)
    }
  }

  async function loadMessages(convId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, post:posts(id, question, option_a_url, author:profiles!author_id(username))')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        throw error
      }
      setMessages(data || [])
    } catch (e) {
      console.error('loadMessages exception:', e)
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function openOrCreateConversation(otherUserId) {
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existing) {
        const otherId = existing.user1_id === user.id ? existing.user2_id : existing.user1_id
        const { data: otherProfile } = await supabase.from('profiles').select('*').eq('id', otherId).single()
        setSelectedConv({ ...existing, otherUser: otherProfile })
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ user1_id: user.id, user2_id: otherUserId })
          .select()
          .single()
        const { data: otherProfile } = await supabase.from('profiles').select('*').eq('id', otherUserId).single()
        if (newConv) {
          const conv = { ...newConv, otherUser: otherProfile, messages: [] }
          setConversations(prev => [conv, ...prev])
          setSelectedConv(conv)
        }
      }
      await loadConversations()
    } catch (e) {
      console.warn('Chat not available yet – run the SQL migration first', e)
    }
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!newMsg.trim() || !selectedConv || sending) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: selectedConv.id,
        sender_id: user.id,
        content,
      })

      if (error) throw error

      // Update conversation updated_at
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConv.id)

      // Fetch the updated messages list immediately as a fallback if Realtime is delayed
      loadMessages(selectedConv.id)
    } catch (err) {
      console.error('Send message error:', err)
      alert('Error sending message: ' + err.message)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function searchUsers(query) {
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user.id)
      .limit(8)
    setSearchResults(data || [])
    setSearching(false)
  }

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-0 relative z-10">
      <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)] flex border border-white/5 shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden mt-4 md:mt-6 mx-4">

        {/* ── Sidebar ── */}
        <div className={`w-full md:w-[320px] shrink-0 flex flex-col bg-gray-950/80 border-r border-white/5 ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-primary-400" />
              <h1 className="text-lg font-bold text-gray-100">Messages</h1>
            </div>
            {/* Search users */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); searchUsers(e.target.value) }}
                placeholder="Find a user to message..."
                className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 transition-all"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-xl"
                >
                  {searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { openOrCreateConversation(u.id); setSearchQuery(''); setSearchResults([]) }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-200">@{u.username}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center px-4">
                <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                <p className="text-xs text-gray-600 mt-1">Search for a user above to start chatting</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-b border-white/5 hover:bg-white/5
                    ${selectedConv?.id === conv.id ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                    {conv.otherUser?.avatar_url
                      ? <img src={conv.otherUser.avatar_url} className="w-full h-full object-cover" />
                      : conv.otherUser?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-100 truncate">@{conv.otherUser?.username || 'User'}</p>
                      <span className="text-[10px] text-gray-600 shrink-0 ml-2">{timeAgo(conv.lastMessage?.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.lastMessage?.post_id ? '📎 Shared a post' : conv.lastMessage?.content || 'Start the conversation'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className={`flex-1 flex flex-col bg-gray-950/60 ${!selectedConv ? 'hidden md:flex' : 'flex'}`}>
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-gray-950/80">
                <button onClick={() => setSelectedConv(null)} className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold overflow-hidden">
                  {selectedConv.otherUser?.avatar_url
                    ? <img src={selectedConv.otherUser.avatar_url} className="w-full h-full object-cover" />
                    : selectedConv.otherUser?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-100">@{selectedConv.otherUser?.username}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Direct Message</p>
                </div>
                <button
                  onClick={() => navigate(`/user/${selectedConv.otherUser?.id}`)}
                  className="ml-auto p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                  title="View profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-4xl mb-3">👋</div>
                    <p className="text-sm font-medium text-gray-400">Say hi to @{selectedConv.otherUser?.username}!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user.id
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Shared post card */}
                        {msg.post ? (
                          <div className={`max-w-[70%] rounded-2xl overflow-hidden border border-white/10 shadow-lg ${isMine ? 'bg-primary-600/20' : 'bg-white/5'}`}>
                            {msg.post.option_a_url && (
                              <img src={msg.post.option_a_url} alt="Post" className="w-full h-32 object-cover" />
                            )}
                            <div className="p-3">
                              <p className="text-xs text-gray-400 font-semibold mb-1 uppercase tracking-wider">Shared Post</p>
                              <p className="text-sm font-bold text-gray-100 line-clamp-2">{msg.post.question}</p>
                              <button
                                onClick={() => navigate(`/?post=${msg.post.id}`)}
                                className="mt-2 text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-semibold"
                              >
                                <ExternalLink className="w-3 h-3" /> View post
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-md
                            ${isMine
                              ? 'bg-gradient-to-br from-primary-600 to-accent-600 text-white rounded-br-md'
                              : 'bg-white/8 text-gray-100 rounded-bl-md border border-white/5'
                            }`}
                          >
                            {msg.content}
                          </div>
                        )}
                      </motion.div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-3 border-t border-white/5 bg-gray-950/80 flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50 transition-all"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(e) }}
                />
                <motion.button
                  type="submit"
                  disabled={!newMsg.trim() || sending}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white shadow-neon-primary disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center mb-4 shadow-neon-primary">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-200 mb-2">Your Messages</h2>
              <p className="text-sm text-gray-500 max-w-[240px]">Select a conversation or search for a user to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
