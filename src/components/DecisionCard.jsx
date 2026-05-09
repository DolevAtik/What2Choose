import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share2, ChevronDown, ChevronUp, CheckCircle, Heart, Send, X, Search, Trash2, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import CommentSection from './CommentSection'
import { toast } from '../lib/toast'

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function DecisionCard({ post }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [userVote, setUserVote] = useState(null)
  const [votes, setVotes] = useState({ A: 0, B: 0, C: 0, D: 0 })
  const [showComments, setShowComments] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [voting, setVoting] = useState(false)
  const [showResult, setShowResult] = useState(false)
  // Likes
  const [likeCount, setLikeCount] = useState(0)
  const [hasLiked, setHasLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  // Share
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareToChat, setShareToChat] = useState(false)
  const [chatUsers, setChatUsers] = useState([])
  const [chatSearch, setChatSearch] = useState('')
  const [chatSearchResults, setChatSearchResults] = useState([])
  const [chatSending, setChatSending] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  // Follow (feed shortcut)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  // Voters modal (author-only)
  const [showVoters, setShowVoters] = useState(false)
  const [votersLoading, setVotersLoading] = useState(false)
  const [votersError, setVotersError] = useState('')
  const [voters, setVoters] = useState([]) // { choice, user_id, profiles: { username, avatar_url, email } }
  const shareMenuRef = useRef(null)

  const hasLoaded = useRef(false)

  // Build options list from post fields
  const options = [
    { letter: 'A', url: post.option_a_url, text: post.option_a_text },
    { letter: 'B', url: post.option_b_url, text: post.option_b_text },
    post.option_c_url || post.option_c_text ? { letter: 'C', url: post.option_c_url, text: post.option_c_text } : null,
    post.option_d_url || post.option_d_text ? { letter: 'D', url: post.option_d_url, text: post.option_d_text } : null,
  ].filter(Boolean)

  const optionCount = options.length

  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    loadData()
  }, [post.id])

  async function loadData() {
    // Votes
    const { data: votesData } = await supabase
      .from('votes').select('choice').eq('post_id', post.id)

    if (votesData) {
      const counts = { A: 0, B: 0, C: 0, D: 0 }
      votesData.forEach(v => counts[v.choice] = (counts[v.choice] || 0) + 1)
      setVotes(counts)
    }

    if (user) {
      // My vote
      const { data: myVote } = await supabase
        .from('votes').select('choice').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
      if (myVote) { setUserVote(myVote.choice); setShowResult(true) }

      // My like (graceful – table may not exist yet)
      try {
        const { data: myLike } = await supabase
          .from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
        setHasLiked(!!myLike)
      } catch (e) { /* likes table not created yet */ }
    }

    // Like count (graceful)
    try {
      const { count: likeCnt } = await supabase
        .from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
      setLikeCount(likeCnt || 0)
    } catch (e) { /* likes table not created yet */ }

    // Comment count
    const { count: cCnt } = await supabase
      .from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id)
    setCommentCount(cCnt || 0)

    // Follow state (only when logged in and not my own post)
    if (user && post.author_id && user.id !== post.author_id) {
      const { data: f } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', post.author_id)
        .maybeSingle()
      setIsFollowingAuthor(!!f)
    }
  }

  async function toggleFollowAuthor(e) {
    e.stopPropagation()
    if (!user || !post.author_id || user.id === post.author_id || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowingAuthor) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', post.author_id)
        if (error) throw error
        setIsFollowingAuthor(false)
        toast.info(t('unfollow'))
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: post.author_id })
        if (error) throw error
        setIsFollowingAuthor(true)
        toast.success(t('follow'))
      }
    } catch (err) {
      console.error('Follow toggle failed:', err)
      toast.error(err?.message || 'Failed to update follow')
    } finally {
      setFollowLoading(false)
    }
  }

  async function openVoters() {
    if (!user || user.id !== post.author_id) return
    setShowVoters(true)
    if (voters.length > 0 || votersLoading) return

    setVotersLoading(true)
    setVotersError('')
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('choice, user_id, profiles(username, avatar_url, email)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setVoters(data || [])
    } catch (e) {
      console.error('Failed to load voters:', e)
      setVotersError(e?.message || 'Failed to load voters')
    } finally {
      setVotersLoading(false)
    }
  }

  async function vote(choice) {
    if (!user || userVote || voting) return
    setVoting(true)
    try {
      const { error } = await supabase.from('votes').insert({ post_id: post.id, user_id: user.id, choice })
      if (error) { console.error(error); return }
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#8b5cf6', '#ec4899', '#3b82f6'] })
      setUserVote(choice)
      setVotes(prev => ({ ...prev, [choice]: (prev[choice] || 0) + 1 }))
      setTimeout(() => setShowResult(true), 100)
    } finally {
      setVoting(false)
    }
  }

  async function toggleLike(e) {
    e.stopPropagation()
    if (!user || liking) return
    setLiking(true)
    try {
      if (hasLiked) {
        await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
        setHasLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
        setHasLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } finally {
      setLiking(false)
    }
  }

  // Calculate percentages for all options
  const total = options.reduce((sum, o) => sum + (votes[o.letter] || 0), 0)
  function pct(letter) {
    if (total === 0) return Math.round(100 / optionCount)
    return Math.round(((votes[letter] || 0) / total) * 100)
  }

  function handleShare() {
    setShowShareMenu(!showShareMenu)
  }

  async function searchChatUsers(q) {
    if (!q.trim()) { setChatSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${q}%`)
      .neq('id', user?.id)
      .limit(6)
    setChatSearchResults(data || [])
  }

  async function sendPostToUser(targetUserId) {
    if (!user || chatSending) return
    setChatSending(true)
    try {
      // Get or create conversation
      const { data: existing, error: existError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existError) throw existError

      let convId = existing?.id
      if (!convId) {
        const { data: newConv, error: newConvError } = await supabase
          .from('conversations')
          .insert({ user1_id: user.id, user2_id: targetUserId })
          .select('id')
          .single()
        
        if (newConvError) throw newConvError
        convId = newConv?.id
      }

      if (convId) {
        const { error: msgError } = await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, post_id: post.id })
        if (msgError) throw msgError
      }
      
      toast.success(t('sentToChat'))
    } catch (err) {
      console.error('Chat share error:', err)
      toast.error(err?.message ? `${t('chatError')}: ${err.message}` : t('chatError'))
    } finally {
      setChatSending(false)
      setShowShareMenu(false)
      setShareToChat(false)
      setChatSearch('')
      setChatSearchResults([])
    }
  }

  async function handleDeletePost() {
    if (!window.confirm(t('confirmDeletePost'))) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      setIsDeleted(true)
    } catch (err) {
      console.error('Error deleting post:', err)
      toast.error(t('failedToDeletePost'))
      setIsDeleting(false)
    }
  }

  const authorName = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'User'
  const avatarUrl = post.profiles?.avatar_url

  // Layout grid class
  const gridClass = optionCount === 4
    ? 'grid-cols-2'
    : optionCount === 3
      ? 'grid-cols-2'
      : 'grid-cols-2'

  if (isDeleted) return null

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card group"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/5">
        <button
          onClick={() => post.author_id && navigate(`/user/${post.author_id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left group/author"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden shrink-0 shadow-neon-primary relative group-hover/author:ring-2 group-hover/author:ring-primary-400/50 transition-all">
            {avatarUrl ? (
              <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold z-10 relative">{authorName[0]?.toUpperCase()}</span>
            )}
            {!avatarUrl && <div className="absolute inset-0 bg-black/20" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-100 truncate group-hover/author:text-primary-300 transition-colors">{authorName}</p>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </button>
        {post.category && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-surfaceHover text-primary-400 border border-primary-500/20 shadow-[0_0_10px_rgba(139,92,246,0.1)] shrink-0">
            {t(`cat${post.category}`) || post.category}
          </span>
        )}

        {user && user.id !== post.author_id && (
          <button
            onClick={toggleFollowAuthor}
            disabled={followLoading}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shrink-0
              ${isFollowingAuthor
                ? 'bg-white/6 border-white/10 text-gray-300 hover:bg-white/10'
                : 'bg-primary-500/15 border-primary-500/25 text-primary-200 hover:bg-primary-500/25'
              }
              ${followLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={isFollowingAuthor ? t('unfollow') : t('follow')}
          >
            {followLoading ? '…' : (isFollowingAuthor ? t('unfollow') : t('follow'))}
          </button>
        )}

        {user?.id === post.author_id && (
          <button
            onClick={handleDeletePost}
            disabled={isDeleting}
            className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
            title={t('deletePost')}
          >
            {isDeleting ? <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin block" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Question */}
      <div className="px-5 py-4">
        <h2 className="text-[17px] font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 leading-snug">{post.question}</h2>
      </div>

      {/* Options Grid */}
      <div className={`grid ${gridClass} gap-1.5 mx-4 mb-5 rounded-2xl overflow-hidden relative shadow-lg`}>
        {options.map((opt) => {
          const p = pct(opt.letter)
          const isVoted = userVote === opt.letter
          const isOther = userVote && userVote !== opt.letter
          const isFirst = opt.letter === 'A'
          const isLast = opt.letter === options[options.length - 1].letter
          // Special center layout for 3rd option when count=3
          const isThirdOfThree = optionCount === 3 && opt.letter === 'C'
          const isTextOption = !opt.url && !!opt.text
          const resultOverlayClass = isTextOption
            ? (isVoted ? 'bg-primary-900/15' : 'bg-white/10')
            : (isVoted ? 'bg-primary-900/25' : 'bg-black/25')

          return (
            <motion.button
              key={opt.letter}
              whileTap={!userVote ? { scale: 0.95 } : {}}
              onClick={() => vote(opt.letter)}
              disabled={!!userVote || voting || !user}
              className={`relative aspect-[4/5] overflow-hidden transition-all duration-500
                ${!userVote && user ? 'cursor-pointer' : 'cursor-default'}
                ${isOther ? 'opacity-90' : 'opacity-100'}
                ${isThirdOfThree ? 'col-span-2 max-w-[50%] mx-auto w-full !aspect-square' : ''}
                ${isFirst && !isThirdOfThree ? 'rounded-l-2xl' : ''}
                ${isLast && !isThirdOfThree ? 'rounded-r-2xl' : ''}
                ${isThirdOfThree ? 'rounded-2xl' : ''}
              `}
              aria-label={t('voteForOption', { letter: opt.letter })}
            >
              {isTextOption ? (
                <div className="w-full h-full bg-surface/60 border border-white/10 flex items-center justify-center p-4">
                  <p className="text-center text-base md:text-lg font-black text-gray-100 leading-snug line-clamp-5">
                    {opt.text}
                  </p>
                </div>
              ) : (
                <motion.img
                  layoutId={`img-${post.id}-${opt.letter}`}
                  src={opt.url}
                  alt={`Option ${opt.letter}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Pre-vote overlay */}
              {!showResult && (
                <div
                  className={`absolute inset-0 transition-all duration-300
                    ${!userVote && user
                      ? 'bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 hover:opacity-100'
                      : 'bg-gradient-to-t from-black/55 to-transparent'
                    }`}
                >
                  {isTextOption ? (
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black text-white bg-black/45 backdrop-blur-md border border-white/15 ${voting ? 'animate-pulse' : ''}`}>
                        {opt.letter}
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span
                        whileHover={{ scale: 1.1 }}
                        className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl text-white bg-black/40 backdrop-blur-md border border-white/20 ${voting ? 'animate-pulse' : ''}`}
                      >
                        {opt.letter}
                      </motion.span>
                    </div>
                  )}
                </div>
              )}

              {/* Result overlay */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`absolute inset-0 flex flex-col items-center justify-end pb-4 px-3 gap-2 transition-all duration-500 ${resultOverlayClass}`}
                  >
                    {isVoted && (
                      <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-gradient-to-t from-primary-600/50 to-transparent"
                      />
                    )}
                    {isVoted && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <CheckCircle className="w-7 h-7 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10" />
                      </motion.div>
                    )}
                    <div className={`w-full rounded-full h-2 overflow-hidden relative z-10 border border-white/10 ${
                      isTextOption
                        ? (isVoted ? 'bg-white/10' : 'bg-white/8')
                        : (isVoted ? 'bg-black/35 backdrop-blur-md' : 'bg-black/25 backdrop-blur-sm')
                    }`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ duration: 1, ease: 'circOut' }}
                        className={`h-full rounded-full ${isVoted ? 'bg-gradient-to-r from-primary-500 to-accent-400 shadow-neon-primary' : 'bg-gray-500'}`}
                      />
                    </div>
                    <div className="flex items-end justify-between w-full relative z-10">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white font-black text-xl drop-shadow-md leading-none">
                        {p}%
                      </motion.span>
                      <span className="text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                        {t('votesCount', { n: votes[opt.letter] || 0 })}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </div>

      {/* No auth nudge */}
      {!user && !showResult && (
        <button
          onClick={() => navigate('/auth')}
          className="w-full text-center text-xs font-bold uppercase tracking-widest text-accent-400 -mt-2 mb-4 px-4 drop-shadow-[0_0_4px_rgba(96,165,250,0.5)] hover:text-white hover:scale-105 transition-all duration-300"
        >
          {t('signInToVote')}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center px-5 flex-wrap pb-4 gap-2 border-t border-white/5 pt-3">
        {/* Comments */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-300 py-1.5 px-3 rounded-xl hover:bg-white/10 text-sm font-semibold group"
        >
          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>{commentCount}</span>
          {showComments ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </button>

        {/* Like on Post */}
        <motion.button
          onClick={toggleLike}
          whileTap={{ scale: 0.85 }}
          className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-sm font-semibold transition-all duration-300 group
            ${hasLiked ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
          aria-label="Like"
        >
          <Heart className={`w-4 h-4 transition-all duration-200 ${hasLiked ? 'fill-red-400 scale-110' : 'group-hover:scale-110'}`} />
          <span>{likeCount}</span>
        </motion.button>

        {total > 0 && (
          <span className="text-xs font-bold text-gray-500 ml-1 tracking-wide uppercase hidden sm:block">{t('votesTotal', { n: total })}</span>
        )}

        {/* Author-only: view voters */}
        {user?.id === post.author_id && (
          <button
            onClick={openVoters}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-all duration-300 py-1.5 px-3 rounded-xl hover:bg-white/10 text-sm font-semibold group"
            title={t('viewVotes')}
          >
            <Users className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">{t('viewVotes')}</span>
          </button>
        )}

        <div className="flex-1" />

        <div className="relative" ref={shareMenuRef}>
          <button
            onClick={handleShare}
            className={`flex items-center gap-1.5 text-gray-400 hover:text-accent-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-accent-500/10 group
              ${showShareMenu ? 'text-accent-400 bg-accent-500/10' : ''}`}
          >
            <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          <AnimatePresence>
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                className="absolute bottom-10 right-0 w-[220px] glass-panel !rounded-2xl overflow-hidden shadow-xl border !border-white/10 z-30"
              >
                {!shareToChat ? (
                  <>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{t('share')}</p>
                    </div>
                    {typeof navigator.share !== 'undefined' && (
                      <button
                        onClick={() => { navigator.share({ title: post.question, url: `${window.location.origin}/?post=${post.id}` }); setShowShareMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-semibold text-gray-200"
                      >
                        <Share2 className="w-4 h-4 text-primary-400" /> {t('shareLink')}
                      </button>
                    )}
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?post=${post.id}`); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-semibold text-gray-200"
                    >
                      <Share2 className="w-4 h-4 text-accent-400" /> {t('copyLink')}
                    </button>
                    {user && (
                      <button
                        onClick={() => setShareToChat(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm font-semibold text-gray-200 border-t border-white/5"
                      >
                        <Send className="w-4 h-4 text-emerald-400" /> {t('sendInChat')}
                      </button>
                    )}
                    <button onClick={() => setShowShareMenu(false)} className="absolute top-2 right-2 p-1 text-gray-600 hover:text-gray-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <button onClick={() => { setShareToChat(false); setChatSearch(''); setChatSearchResults([]) }} className="text-gray-500 hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-xs font-bold text-gray-300">{t('sendTo')}</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        autoFocus
                        value={chatSearch}
                        onChange={e => { setChatSearch(e.target.value); searchChatUsers(e.target.value) }}
                        placeholder={t('searchUser')}
                        className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
                      />
                    </div>
                    <div className="mt-2 space-y-1 max-h-[140px] overflow-y-auto">
                      {chatSearchResults.map(u => (
                        <button
                          key={u.id}
                          onClick={() => sendPostToUser(u.id)}
                          disabled={chatSending}
                          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                            {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : u.username?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-200 truncate">@{u.username}</span>
                          {chatSending && <span className="ml-auto w-3 h-3 border border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />}
                        </button>
                      ))}
                      {chatSearch && chatSearchResults.length === 0 && (
                        <p className="text-xs text-gray-600 text-center py-2">{t('noUsersFound')}</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10 bg-surface/30 overflow-hidden"
          >
            <CommentSection postId={post.id} onCountChange={setCommentCount} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voters Modal */}
      <AnimatePresence>
        {showVoters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoters(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90]"
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 260 }}
              className="fixed inset-x-3 top-20 bottom-6 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[92vw] md:max-w-md glass-panel !rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.7)] border !border-white/10 z-[100] overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-black text-gray-100 uppercase tracking-wider">{t('voters')}</span>
                </div>
                <button onClick={() => setShowVoters(false)} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {votersLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <span className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : votersError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-sm font-bold text-red-400 mb-1">{t('error')}</p>
                    <p className="text-xs text-gray-400 whitespace-pre-wrap">{votersError}</p>
                    <button onClick={() => { setVoters([]); openVoters() }} className="btn-primary w-full mt-4">
                      {t('retry')}
                    </button>
                  </div>
                ) : voters.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">{t('noVotesYet')}</p>
                ) : (
                  <div className="space-y-4">
                    {options.map((opt) => {
                      const group = voters.filter(v => v.choice === opt.letter)
                      if (group.length === 0) return null
                      return (
                        <div key={opt.letter} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                          <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5">
                            <span className="text-xs font-black text-gray-200 tracking-widest uppercase">Option {opt.letter}</span>
                            <span className="text-xs font-bold text-gray-400">{group.length}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {group.map((v) => {
                              const name = v.profiles?.username || v.profiles?.email?.split('@')[0] || 'User'
                              const avatar = v.profiles?.avatar_url
                              return (
                                <div key={`${v.user_id}-${opt.letter}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden shrink-0">
                                    {avatar ? (
                                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-white text-sm font-bold">{name[0]?.toUpperCase()}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-100 truncate">@{name}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.article>
  )
}
