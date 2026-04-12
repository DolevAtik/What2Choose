import { useEffect, useState, useRef, useCallback } from 'react'
import { Sparkles, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import DecisionCard from '../components/DecisionCard'

const CATEGORIES = ['All', 'Fashion', 'Food', 'Shopping', 'Travel']
const PAGE_SIZE = 10

export default function FeedPage() {
  const [posts, setPosts] = useState([])
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const observerRef = useRef(null)
  const sentinelRef = useRef(null)

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
  }, [category, hasMore])

  // Reset on category change
  useEffect(() => {
    pageRef.current = 0
    setHasMore(true)
    fetchPosts(true)
  }, [category])

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
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary-500 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 tracking-tight">Feed</h1>
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
          <EmptyState category={category} />
        ) : (
          posts.map((post) => (
            <DecisionCard key={post.id} post={post} />
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {loadingMore && (
          <div className="flex justify-center py-4">
            <span className="w-6 h-6 border-2 border-white/10 border-t-primary-500 rounded-full animate-spin shadow-neon-primary" />
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

function SkeletonCard() {
  return (
    <div className="glass-card animate-pulse">
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-surfaceHover shadow-[0_0_15px_rgba(0,0,0,0.5)]" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-surfaceHover rounded-full w-24" />
          <div className="h-3 bg-surface/50 rounded-full w-16" />
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="h-4 bg-surfaceHover rounded-full w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-1.5 mx-4 mb-5 rounded-2xl overflow-hidden relative shadow-lg">
        <div className="aspect-[4/5] bg-surfaceHover rounded-l-2xl" />
        <div className="aspect-[4/5] bg-surfaceHover/80 rounded-r-2xl" />
      </div>
      <div className="flex gap-2 px-5 pb-4 border-t border-white/5 pt-3">
        <div className="h-6 w-16 bg-surfaceHover/50 rounded-lg" />
      </div>
    </div>
  )
}

function EmptyState({ category }) {
  return (
    <div className="text-center py-20 animate-fade-in glass-panel !rounded-3xl border-dashed border-2 border-white/10">
      <div className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">👻</div>
      <h3 className="text-lg font-bold text-gray-200 mb-1">No decisions yet</h3>
      <p className="text-sm text-gray-500 font-medium tracking-wide">
        {category !== 'All'
          ? `No posts in ${category} yet. Be the first!`
          : 'Be the first to post a decision!'}
      </p>
    </div>
  )
}
