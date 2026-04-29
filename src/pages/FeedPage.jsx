import { useEffect, useState, useRef, useCallback } from 'react'
import { Sparkles, Users, Globe } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import DecisionCard from '../components/DecisionCard'
import SkeletonCard from '../components/SkeletonCard'

const CATEGORIES = ['All', 'Fashion', 'Food', 'Shopping', 'Travel']
const PAGE_SIZE = 10

export default function FeedPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetPostId = searchParams.get('post')

  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState('All')
  const [feedMode, setFeedMode] = useState(() => localStorage.getItem('feedMode') || 'global') // 'global' | 'following'
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)
  const postRefs = useRef({})

  const fetchPosts = useCallback(async (reset = false) => {
    const page = reset ? 0 : pageRef.current
    if (!reset && !hasMore) return

    reset ? setLoading(true) : setLoadingMore(true)

    let query = supabase
      .from('posts')
      .select('*, profiles(username, avatar_url, email)')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (category !== 'All') {
      query = query.eq('category', category)
    }

    // Following mode logic
    if (feedMode === 'following') {
      if (!user) {
        // If not logged in but somehow in following mode, show empty
        setPosts([])
        setLoading(false)
        setLoadingMore(false)
        setHasMore(false)
        return
      }
      
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      
      const followingIds = (follows || []).map(f => f.following_id)
      if (followingIds.length === 0) {
        setPosts([])
        setLoading(false)
        setLoadingMore(false)
        setHasMore(false)
        return
      }
      query = query.in('author_id', followingIds)
    }

    const { data, error } = await query

    if (!error && data) {
      if (reset) {
        setPosts(data)
      } else {
        setPosts((prev) => [...prev, ...data])
      }
      pageRef.current = page + 1
      setHasMore(data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [category, hasMore, feedMode, user])

  // Initial fetch and reset on category or feedMode change
  useEffect(() => {
    // If in following mode but user hasn't loaded yet from auth, wait.
    // If in global mode, load instantly!
    if (feedMode === 'following' && user === undefined) return
    
    pageRef.current = 0
    setHasMore(true)
    fetchPosts(true)
  }, [category, feedMode, user])

  // Save feedMode preference
  useEffect(() => {
    localStorage.setItem('feedMode', feedMode)
  }, [feedMode])

  // Scroll to target post after load
  useEffect(() => {
    if (!targetPostId || loading) return
    const el = postRefs.current[targetPostId]
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2', 'ring-offset-gray-950')
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2', 'ring-offset-gray-950'), 3000)
        setSearchParams({}, { replace: true })
      }, 300)
    }
  }, [targetPostId, loading, posts])

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        fetchPosts(false)
      }
    }, { rootMargin: '200px' })

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, loading, fetchPosts])

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-12 md:pt-24 relative z-10">
      {/* Page header */}
      <div className="sticky top-[60px] md:top-16 z-40 glass-panel !rounded-none !border-x-0 !border-t-0 shadow-glass">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 tracking-tight">Feed</h1>
            </div>
            {/* Following / Global toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5">
              <button
                onClick={() => setFeedMode('global')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                  ${feedMode === 'global' ? 'bg-primary-600 text-white shadow-neon-primary' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <Globe className="w-3.5 h-3.5" />
                All
              </button>
              <button
                onClick={() => setFeedMode('following')}
                disabled={!user}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                  ${feedMode === 'following' ? 'bg-primary-600 text-white shadow-neon-primary' : 'text-gray-400 hover:text-gray-200'}
                  ${!user ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Users className="w-3.5 h-3.5" />
                Following
              </button>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300
                  ${category === cat
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-neon-primary scale-[1.02]'
                    : 'bg-surface/50 border border-white/5 text-gray-400 hover:bg-surface hover:text-gray-200'
                  }`}
              >
                {cat === 'All' ? '🔥 All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : posts.length === 0 ? (
          <EmptyState category={category} feedMode={feedMode} />
        ) : (
          posts.map((post) => (
            <div key={post.id} ref={el => postRefs.current[post.id] = el} className="transition-all duration-700 rounded-2xl">
              <DecisionCard post={post} />
            </div>
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {loadingMore && (
          <div className="flex justify-center py-4">
             <SkeletonCard />
          </div>
        )}

        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8">
            <p className="text-sm font-bold uppercase tracking-widest text-primary-500 drop-shadow">END OF FEED</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ category, feedMode }) {
  return (
    <div className="text-center py-20 animate-fade-in glass-panel !rounded-3xl border-dashed border-2 border-white/10">
      <div className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{feedMode === 'following' ? '👥' : '👻'}</div>
      <h3 className="text-lg font-bold text-gray-200 mb-1">
        {feedMode === 'following' ? 'No posts from people you follow' : 'No decisions yet'}
      </h3>
      <p className="text-sm text-gray-500 font-medium tracking-wide">
        {feedMode === 'following'
          ? 'Follow people to see their posts here'
          : category !== 'All'
            ? `No posts in ${category} yet. Be the first!`
            : 'Be the first to post a decision!'}
      </p>
    </div>
  )
}
