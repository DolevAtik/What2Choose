import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, BarChart2, Image as ImageIcon, Edit3 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import DecisionCard from '../components/DecisionCard'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfile } = useAuth()

  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, totalVotes: 0, followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (user) fetchUserData()
    else {
      navigate('/auth')
    }
  }, [user])

  async function fetchUserData() {
    setLoading(true)

    // Fetch posts
    const { data: userPosts } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url, email)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })

    if (userPosts) {
      setPosts(userPosts)

      // Get vote counts for all posts
      const postIds = userPosts.map((p) => p.id)
      let totalVotes = 0
      if (postIds.length > 0) {
        const { count } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', postIds)
        totalVotes = count || 0
      }

      // Followers / following counts
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      setStats({ posts: userPosts.length, totalVotes, followers: followersCount || 0, following: followingCount || 0 })
    }

    setLoading(false)
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/auth')
    } catch (err) {
      console.error(err)
    }
  }

  async function saveUsername() {
    if (!newUsername.trim() || savingName) return
    setSavingName(true)
    try {
      await updateProfile({ username: newUsername.trim() })
      setEditingUsername(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingName(false)
    }
  }

  const displayName = profile?.username || user?.email?.split('@')[0] || 'You'
  const avatarUrl = profile?.avatar_url

  if (!user) return null

  return (
    <div className="min-h-screen pt-20 pb-28 md:pb-12 md:pt-20 relative z-10">
      {/* Header */}
      <div className="glass-panel !rounded-none !border-x-0 !border-t-0 shadow-glass border-b border-white/5 md:mt-0">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-6">

          {/* Avatar & Name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden ring-4 ring-primary-500/20 shadow-neon-primary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-4xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{displayName[0]?.toUpperCase()}</span>
                )}
                {!avatarUrl && <div className="absolute inset-0 bg-black/20" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {editingUsername ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
                    className="input-base text-base font-bold py-2.5 px-4 bg-black/40"
                    placeholder="New username"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveUsername}
                      disabled={savingName}
                      className="btn-primary py-2 px-4 text-sm flex-1"
                    >
                      {savingName ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingUsername(false)}
                      className="btn-secondary py-2 px-4 text-sm font-semibold border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 truncate tracking-tight">{displayName}</h1>
                    <button
                      onClick={() => { setNewUsername(displayName); setEditingUsername(true) }}
                      className="text-gray-500 hover:text-accent-400 transition-colors p-1.5 rounded-full hover:bg-surface"
                      aria-label="Edit username"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mt-0.5 truncate tracking-wide">{user.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="glass-panel !bg-primary-900/20 p-4 text-center border !border-primary-500/20 hover:shadow-neon-primary transition-all duration-300">
              <p className="text-2xl font-black text-primary-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">{stats.posts}</p>
              <p className="text-[9px] uppercase tracking-widest text-primary-500 font-bold mt-1">Posts</p>
            </div>
            <div className="glass-panel !bg-accent-900/20 p-4 text-center border !border-accent-500/20 hover:shadow-neon-accent transition-all duration-300">
              <p className="text-2xl font-black text-accent-300 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">{stats.totalVotes}</p>
              <p className="text-[9px] uppercase tracking-widest text-accent-500 font-bold mt-1">Votes</p>
            </div>
            <div className="glass-panel !bg-white/5 p-4 text-center border !border-white/10 hover:shadow-glass transition-all duration-300">
              <p className="text-2xl font-black text-gray-200">{stats.followers}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mt-1">Followers</p>
            </div>
            <div className="glass-panel !bg-white/5 p-4 text-center border !border-white/10 hover:shadow-glass transition-all duration-300">
              <p className="text-2xl font-black text-gray-200">{stats.following}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mt-1">Following</p>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6">
        <div className="flex items-center gap-2 mb-2">
           <span className="w-1.5 h-6 bg-primary-500 rounded-full shadow-neon-primary" />
           <h2 className="text-lg font-bold text-gray-200 tracking-wide">MY DECISIONS</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="w-8 h-8 border-2 border-white/10 border-t-primary-500 rounded-full animate-spin shadow-neon-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in glass-panel !rounded-3xl border-dashed border-2 border-white/10">
            <div className="text-6xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">📸</div>
            <h3 className="text-xl font-bold text-gray-200 mb-2">No decisions yet</h3>
            <p className="text-sm text-gray-400 mb-6 font-medium">Share your first A/B decision with the world!</p>
            <button onClick={() => navigate('/create')} className="btn-primary inline-flex shadow-[0_8px_30px_rgba(139,92,246,0.3)]">
              Create First Post
            </button>
          </div>
        ) : (
          posts.map((post) => <DecisionCard key={post.id} post={post} />)
        )}
      </div>

      {/* Sign out */}
      <div className="max-w-lg mx-auto px-4 pt-8 pb-4">
        <button
          onClick={handleSignOut}
          className="btn-secondary w-full py-4 text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] tracking-wide uppercase font-bold"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
