import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function CommentSection({ postId, onCountChange }) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [postId])

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url, email)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    setComments(data || [])
    onCountChange?.(data?.length || 0)
    setLoading(false)
  }

  async function submitComment(e) {
    e.preventDefault()
    if (!text.trim() || !user || submitting) return
    setSubmitting(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: user.id, content: text.trim() })
      .select('*, profiles(username, avatar_url, email)')
      .single()

    if (!error && data) {
      setComments((prev) => [...prev, data])
      onCountChange?.((prev) => prev + 1)
      setText('')
    }

    setSubmitting(false)
  }

  return (
    <div className="p-4 space-y-3">
      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-3">No comments yet. Be first! 🎉</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {comments.map((c) => {
            const name = c.profiles?.username || c.profiles?.email?.split('@')[0] || 'User'
            const avatar = c.profiles?.avatar_url
            return (
              <div key={c.id} className="flex gap-2.5 animate-fade-in">
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
                  <p className="text-xs text-gray-400 mt-1 ml-1">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
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
              placeholder="Add a comment…"
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
        <p className="text-center text-sm text-gray-400">Sign in to comment</p>
      )}
    </div>
  )
}
