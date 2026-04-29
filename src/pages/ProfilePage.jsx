import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, BarChart2, Image as ImageIcon, Edit3, X, User as UserIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import DecisionCard from '../components/DecisionCard'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfile } = useAuth()

  const [posts, setPosts] = useState([])
  const [stats, setStats] = useState({ posts: 0, totalVotes: 0, followers: 0, following: 0 })
  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [showModal, setShowModal] = useState(null) // 'followers' | 'following' | null
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

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

      // Followers / following counts & lists
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower:profiles!follower_id(id, username, avatar_url)')
        .eq('following_id', user.id)

      const { data: followingData } = await supabase
        .from('follows')
        .select('following:profiles!following_id(id, username, avatar_url)')
        .eq('follower_id', user.id)

      const followersCount = followersData?.length || 0
      const followingCount = followingData?.length || 0
      
      setFollowersList(followersData?.map(f => f.follower) || [])
      setFollowingList(followingData?.map(f => f.following) || [])

      setStats({ posts: userPosts.length, totalVotes, followers: followersCount, following: followingCount })
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

  async function uploadAvatar(event) {
    try {
      setUploadingAvatar(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      await updateProfile({ avatar_url: publicUrl })
    } catch (error) {
      alert('Error uploading avatar: ' + error.message)
    } finally {
      setUploadingAvatar(false)
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
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden ring-4 ring-primary-500/20 shadow-neon-primary relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-4xl font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{displayName[0]?.toUpperCase()}</span>
                )}
                
                {/* Upload overlay */}
                <label className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300 ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  {uploadingAvatar ? (
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-white mb-1" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 truncate tracking-tight">{displayName}</h1>
                </div>
                <p className="text-sm font-medium text-gray-500 mt-0.5 truncate tracking-wide">{user.email}</p>
              </div>
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
            <div onClick={() => setShowModal('followers')} className="glass-panel !bg-white/5 p-4 text-center border !border-white/10 hover:shadow-glass transition-all duration-300 cursor-pointer">
              <p className="text-2xl font-black text-gray-200">{stats.followers}</p>
              <p className="text-[9px] uppercase tracking-widest text-gray-500 font-bold mt-1">Followers</p>
            </div>
            <div onClick={() => setShowModal('following')} className="glass-panel !bg-white/5 p-4 text-center border !border-white/10 hover:shadow-glass transition-all duration-300 cursor-pointer">
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

      {/* Users Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(null)} />
          <div className="relative w-full max-w-sm glass-panel p-6 shadow-2xl animate-fade-in border !border-white/10 z-10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold text-gray-200 uppercase tracking-wider">
                {showModal === 'followers' ? 'Followers' : 'Following'}
              </h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {(showModal === 'followers' ? followersList : followingList).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No users found.</p>
              ) : (
                (showModal === 'followers' ? followersList : followingList).map(u => (
                  <button key={u.id} onClick={() => { setShowModal(null); navigate(`/user/${u.id}`) }} className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors text-left group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <span className="font-bold text-gray-200 group-hover:text-white transition-colors truncate">
                      @{u.username}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
