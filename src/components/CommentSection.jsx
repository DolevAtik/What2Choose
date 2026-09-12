import { useState, useEffect } from 'react'
import { Send, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

export default function CommentSection({ postId, onCountChange }) {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // likes: { [commentId]: { count, hasLiked } }
  const [likes, setLikes] = useState({})
  const [likingId, setLikingId] = useState(null)

  useEffect(() => { fetchComments() }, [postId])

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    const list = data || []
    setComments(list)
    onCountChange?.(list.length)

    if (list.length > 0) {
      await loadLikes(list.map(c => c.id))
    }
    setLoading(false)
  }

  async function loadLikes(commentIds) {
    try {
      const { data: allLikes } = await supabase
        .from('likes')
        .select('id, user_id, comment_id')
        .in('comment_id', commentIds)

      const map = {}
      commentIds.forEach(id => { map[id] = { count: 0, hasLiked: false } })
      ;(allLikes || []).forEach(l => {
        if (map[l.comment_id]) {
          map[l.comment_id].count++
          if (user && l.user_id === user.id) map[l.comment_id].hasLiked = true
        }
      })
      setLikes(map)
    } catch (e) { /* likes table not created yet */ }
  }


  async function submitComment(e) {
    e.preventDefault()
    if (!text.trim() || !user || submitting) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content: text.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()

    if (!error && data) {
      setComments(prev => [...prev, data])
      onCountChange?.(prev => prev + 1)
      setLikes(prev => ({ ...prev, [data.id]: { count: 0, hasLiked: false } }))
      setText('')
    }
    setSubmitting(false)
  }

  async function toggleCommentLike(commentId) {
    if (!user || likingId === commentId) return
    setLikingId(commentId)
    const current = likes[commentId] || { count: 0, hasLiked: false }

    try {
      if (current.hasLiked) {
        await supabase.from('likes').delete().eq('comment_id', commentId).eq('user_id', user.id)
        setLikes(prev => ({ ...prev, [commentId]: { count: Math.max(0, prev[commentId].count - 1), hasLiked: false } }))
      } else {
        await supabase.from('likes').insert({ comment_id: commentId, user_id: user.id })
        setLikes(prev => ({ ...prev, [commentId]: { count: (prev[commentId]?.count || 0) + 1, hasLiked: true } }))
      }
    } finally {
      setLikingId(null)
    }
  }

  return (
    <div className="p-4 space-y-3">
      {loading ? (
        <div className="flex justify-center py-4">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-3">{t('noComments')}</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => {
            const name = c.profiles?.username || 'User'
            const avatar = c.profiles?.avatar_url
            const commentLikes = likes[c.id] || { count: 0, hasLiked: false }

            return (
              <div key={c.id} className="flex gap-2.5 animate-fade-in group/comment">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-600 text-xs font-bold">{name[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3 py-2 border border-white/5">
                    <span className="text-xs font-semibold text-primary-400 block mb-0.5">{name}</span>
                    <p className="text-sm text-gray-100 leading-snug">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <p className="text-xs text-gray-500">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {/* Like on comment */}
                    <motion.button
                      onClick={() => toggleCommentLike(c.id)}
                      whileTap={{ scale: 0.8 }}
                      className={`flex items-center gap-1 text-xs font-semibold transition-colors
                        ${commentLikes.hasLiked ? 'text-red-400' : 'text-gray-600 hover:text-red-400 opacity-0 group-hover/comment:opacity-100'}`}
                    >
                      <Heart className={`w-3 h-3 transition-all ${commentLikes.hasLiked ? 'fill-red-400' : ''}`} />
                      {commentLikes.count > 0 && <span>{commentLikes.count}</span>}
                    </motion.button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Input */}
      {user ? (
        <form onSubmit={submitComment} className="flex gap-2 items-center">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-600 text-xs font-bold">
                {(profile?.username || user.email)?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center bg-white/5 rounded-full border border-white/10 pr-1 focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500/50 transition-all">
            <input
              type="text"
              placeholder={t('addComment')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white px-4 py-2.5 outline-none placeholder-gray-500"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="w-8 h-8 flex items-center justify-center bg-primary-500 hover:bg-primary-600 disabled:opacity-40 text-white rounded-full transition-colors shrink-0"
            >
              {submitting ? (
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-center text-sm text-gray-400">{t('signInToComment')}</p>
      )}
    </div>
  )
}
