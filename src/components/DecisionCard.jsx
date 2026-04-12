import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share2, Heart, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import CommentSection from './CommentSection'

const CATEGORY_COLORS = {
  Fashion: 'bg-pink-100 text-pink-600',
  Food: 'bg-orange-100 text-orange-600',
  Shopping: 'bg-emerald-100 text-emerald-600',
  Travel: 'bg-sky-100 text-sky-600',
}

export default function DecisionCard({ post }) {
  const { user } = useAuth()
  const [userVote, setUserVote] = useState(null) // 'A' | 'B' | null
  const [votes, setVotes] = useState({ A: 0, B: 0 })
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [voting, setVoting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    loadVotes()
  }, [post.id])

  async function loadVotes() {
    // Fetch vote counts
    const { data: votesData } = await supabase
      .from('votes')
      .select('choice')
      .eq('post_id', post.id)

    if (votesData) {
      const counts = { A: 0, B: 0 }
      votesData.forEach((v) => counts[v.choice]++)
      setVotes(counts)
    }

    // Check if the current user voted
    if (user) {
      const { data: myVote } = await supabase
        .from('votes')
        .select('choice')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (myVote) {
        setUserVote(myVote.choice)
        setShowResult(true)
      }
    }

    // Comment count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id)

    setCommentCount(count || 0)
  }

  async function vote(choice) {
    if (!user || userVote || voting) return
    setVoting(true)

    try {
      const { error } = await supabase.from('votes').insert({
        post_id: post.id,
        user_id: user.id,
        choice,
      })

      if (error) {
        console.error('Vote error:', error)
        return
      }

      setUserVote(choice)
      setVotes((prev) => ({ ...prev, [choice]: prev[choice] + 1 }))
      setTimeout(() => setShowResult(true), 100)
    } finally {
      setVoting(false)
    }
  }

  const total = votes.A + votes.B
  const pctA = total === 0 ? 50 : Math.round((votes.A / total) * 100)
  const pctB = 100 - pctA

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: post.question, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const authorName = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'User'
  const avatarUrl = post.profiles?.avatar_url

  return (
    <article className="glass-card transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.15)] group animate-fade-up">

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden shrink-0 shadow-neon-primary relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-bold z-10 relative">{authorName[0]?.toUpperCase()}</span>
          )}
          {!avatarUrl && <div className="absolute inset-0 bg-black/20" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-100 truncate">{authorName}</p>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        {post.category && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-surfaceHover text-primary-400 border border-primary-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)]">
            {post.category}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="px-5 py-4">
        <h2 className="text-[17px] font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 leading-snug">{post.question}</h2>
      </div>

      {/* Images */}
      <div className="grid grid-cols-2 gap-1.5 mx-4 mb-5 rounded-2xl overflow-hidden relative shadow-lg">
        {['A', 'B'].map((option) => {
          const imgUrl = option === 'A' ? post.option_a_url : post.option_b_url
          const pct = option === 'A' ? pctA : pctB
          const isVoted = userVote === option
          const isOther = userVote && userVote !== option

          return (
            <button
              key={option}
              onClick={() => vote(option)}
              disabled={!!userVote || voting || !user}
              className={`relative aspect-[4/5] overflow-hidden transition-all duration-500
                ${!userVote && user ? 'cursor-pointer hover:opacity-95 hover:scale-[1.02]' : 'cursor-default'}
                ${isOther ? 'opacity-40 grayscale-[50%]' : 'opacity-100'}
                ${option === 'A' ? 'rounded-l-2xl' : 'rounded-r-2xl'}
              `}
              aria-label={`Vote for option ${option}`}
            >
              {/* Image */}
              <img
                src={imgUrl}
                alt={`Option ${option}`}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  !userVote && user ? 'hover:scale-110' : ''
                }`}
              />

              {/* Overlay before voting */}
              {!showResult && (
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300
                  ${!userVote && user ? 'bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 hover:opacity-100' : 'bg-gradient-to-t from-black/60 to-transparent'}
                `}>
                  <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl
                    text-white bg-black/40 backdrop-blur-md border border-white/20 transition-all duration-300
                    ${!userVote && user ? 'hover:scale-110 hover:bg-white/20 hover:border-white/50 hover:shadow-glass' : ''}
                    ${voting ? 'animate-pulse-glow' : ''}
                  `}>
                    {option}
                  </span>
                </div>
              )}

              {/* Result overlay after voting */}
              {showResult && (
                <div className={`absolute inset-0 flex flex-col items-center justify-end pb-6 px-3 gap-2 transition-all duration-500 ${isVoted ? 'bg-primary-900/40 backdrop-blur-[2px]' : 'bg-black/60 backdrop-blur-sm'}`}>
                  {isVoted && (
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-600/50 to-transparent animate-fade-in" />
                  )}
                  {isVoted && (
                     <CheckCircle className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] mb-2 relative z-10 animate-fade-up" />
                  )}
                  {/* Percentage bar */}
                  <div className="w-full bg-black/40 backdrop-blur-xl rounded-full h-2.5 overflow-hidden relative z-10 border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                    <div
                      className={`h-full rounded-full vote-bar relative ${
                        isVoted ? 'bg-gradient-to-r from-primary-500 to-accent-400 shadow-neon-primary' : 'bg-gray-500'
                      }`}
                      style={{ '--target-width': `${pct}%`, width: `${pct}%` }}
                    >
                      {isVoted && <div className="absolute inset-0 bg-white/20 animate-glass-shine" />}
                    </div>
                  </div>
                  <div className="flex items-end justify-between w-full relative z-10">
                    <span className="text-white font-black text-2xl drop-shadow-md leading-none">{pct}%</span>
                    <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">
                      {option === 'A' ? votes.A : votes.B} votes
                    </span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* No auth nudge */}
      {!user && !showResult && (
        <p className="text-center text-xs font-medium uppercase tracking-widest text-accent-400 -mt-2 mb-4 px-4 drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]">Sign in to vote</p>
      )}

      {/* Actions */}
      <div className="flex items-center px-5 flex-wrap pb-4 gap-2 border-t border-white/5 pt-3">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 py-1.5 px-3 rounded-xl hover:bg-white/10 text-sm font-semibold group"
          aria-label="Toggle comments"
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>{commentCount}</span>
          {showComments ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </button>

        {total > 0 && (
          <span className="text-xs font-bold text-gray-500 ml-2 tracking-wide uppercase">{total} votes total</span>
        )}

        <div className="flex-1" />

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-gray-400 hover:text-accent-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-accent-500/10 group"
          aria-label="Share post"
        >
          <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-white/10 bg-surface/30">
          <CommentSection postId={post.id} onCountChange={setCommentCount} />
        </div>
      )}
    </article>
  )
}
