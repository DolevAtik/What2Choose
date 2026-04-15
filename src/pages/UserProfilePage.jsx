import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserPlus, UserCheck, ArrowLeft, BarChart2, Image as ImageIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import DecisionCard from '../components/DecisionCard'
import SkeletonCard from '../components/SkeletonCard'

export default function UserProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profileData, setProfileData] = useState(null)
  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, totalVotes: 0, followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  // Redirect own profile to /profile
  useEffect(() => {
    if (user && userId === user.id) {
      navigate('/profile', { replace: true })
    }
  }, [user, userId, navigate])

  useEffect(() => {
    if (userId) fetchAll()
  }, [userId])

  async function fetchAll() {
    setLoading(true)

    // Profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!prof) { setLoading(false); return }
    setProfileData(prof)

    // Posts
    const { data: userPosts } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url, email)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })

    setPosts(userPosts || [])

    // Vote count
    let totalVotes = 0
    if (userPosts?.length > 0) {
      const postIds = userPosts.map(p => p.id)
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds)
      totalVotes = count || 0
    }

    // Followers count
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)

    // Following count
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId)

    setStats({
      posts: userPosts?.length || 0,
      totalVotes,
      followers: followersCount || 0,
      following: followingCount || 0,
    })

    // Check if current user follows this profile
    if (user) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle()
      setIsFollowing(!!followRow)
    }

    setLoading(false)
  }

  async function toggleFollow() {
    if (!user) { navigate('/auth'); return }
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId)
        setIsFollowing(false)
        setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }))
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: userId })
        setIsFollowing(true)
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      }
    } catch (err) {
      console.error('Follow error:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-28 md:pb-12">
        <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">👻</p>
          <h2 className="text-2xl font-bold text-gray-200 mb-2">User not found</h2>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">Back to Feed</button>
        </div>
      </div>
    )
  }

  const displayName = profileData.username || profileData.email?.split('@')[0] || 'User'
  const avatarUrl = profileData.avatar_url

  return (
    <div className="min-h-screen pt-20 pb-28 md:pb-12 relative z-10">
      {/* Header */}
      <div className="glass-panel !rounded-none !border-x-0 !border-t-0 shadow-glass border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors mb-5 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Avatar & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden ring-4 ring-primary-500/20 shadow-neon-primary shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-4xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                  {displayName[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 truncate tracking-tight mb-1">
                {displayName}
              </h1>
              {/* Follow button */}
              {user && (
                <motion.button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  whileTap={{ scale: 0.96 }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold transition-all duration-300
                    ${isFollowing
                      ? 'bg-surface border border-white/10 text-gray-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                      : 'bg-gradient-to-r from-primary-600 to-accent-500 text-white shadow-neon-primary hover:shadow-neon-accent'
                    }`}
                >
                  {isFollowing
                    ? <><UserCheck className="w-4 h-4" /> Following</>
                    : <><UserPlus className="w-4 h-4" /> Follow</>
                  }
                </motion.button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Posts', value: stats.posts, icon: '📸' },
              { label: 'Votes', value: stats.totalVotes, icon: '🗳️' },
              { label: 'Followers', value: stats.followers, icon: '👥' },
              { label: 'Following', value: stats.following, icon: '✨' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="glass-panel !bg-white/5 p-3 text-center border !border-white/5">
                <p className="text-lg font-black text-primary-300">{value}</p>
                <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-6 bg-primary-500 rounded-full shadow-neon-primary" />
          <h2 className="text-lg font-bold text-gray-200 tracking-wide">{displayName.toUpperCase()}'S DECISIONS</h2>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 glass-panel !rounded-3xl border-dashed border-2 border-white/10">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-gray-400 font-medium">No decisions posted yet</p>
          </div>
        ) : (
          posts.map(post => <DecisionCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}
