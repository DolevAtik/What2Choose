import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { withTimeout } from '../lib/withTimeout'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  // Start as true – we wait for Supabase to restore session before rendering
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let loadingTimeout = null

    // Safety timeout: if auth takes > 5s, force clear loading state
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth check timed out, forcing interface load.')
        setLoading(false)
      }
    }, 5000)

    // INITIALIZATION & LISTENERS
    // In Supabase v2, onAuthStateChange fires INITIAL_SESSION synchronously or immediately after mount.
    // We rely on this to set the initial user and profile.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        const currentUser = session?.user ?? null
        const isInitial = event === 'INITIAL_SESSION'
        
        console.log('Auth event:', event, currentUser?.id)
        setUser(currentUser)

        if (currentUser) {
          // Only fetch profile if switching to a new user or refreshing
          // Using a catch to ensure it doesn't block the logic
          await ensureProfile(currentUser).catch(err => {
            console.error('Initial profile fetch failed:', err)
          })
        } else {
          setProfile(null)
        }

        // Clear loading state on first significant event
        if (loading) {
          setLoading(false)
          if (loadingTimeout) clearTimeout(loadingTimeout)
        }
      }
    )

    return () => {
      mounted = false
      if (loadingTimeout) clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  /** Creates a profile row if none exists, then sets it in state */
  async function ensureProfile(currentUser) {
    const { data: existingProfile } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .eq('id', currentUser.id)
        .single(),
      12000,
      'Loading profile timed out'
    )

    if (existingProfile) {
      setProfile(existingProfile)
      return existingProfile
    }

    // New user (social login, etc.) – create profile
    const username =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0]

    const { error: createError } = await withTimeout(
      supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          username: username || 'User',
          avatar_url: currentUser.user_metadata?.avatar_url || null,
          email: currentUser.email,
        })
        .select('id, username, avatar_url, created_at')
        .single(),
      12000,
      'Creating profile timed out'
    )

    if (createError && createError.code !== '23505') {
      console.error('Failed to create initial profile:', createError)
    }

    return fetchProfile(currentUser.id)
  }

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    }
    setProfile(data)
    return data
  }

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Supabase error during signout:', err)
    } finally {
      setUser(null)
      setProfile(null)
      // Wipe any lingering auth keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.startsWith('w2c-')) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates })
      .select('id, username, avatar_url, created_at')
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}
