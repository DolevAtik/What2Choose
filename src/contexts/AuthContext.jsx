import { createContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Start as true – we wait for Supabase to restore session before rendering
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // First: restore session from storage synchronously (Supabase v2)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await ensureProfile(currentUser)
      }
      setLoading(false)
    })

    // Then: listen for future auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        console.log('Auth event:', event, session?.user?.id)

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentUser) {
            await ensureProfile(currentUser)
          }
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /** Creates a profile row if none exists, then sets it in state */
  async function ensureProfile(currentUser) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    if (existingProfile) {
      setProfile(existingProfile)
      return existingProfile
    }

    // New user (social login, etc.) – create profile
    const username =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split('@')[0]

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .upsert({
        id: currentUser.id,
        username: username || 'User',
        avatar_url: currentUser.user_metadata?.avatar_url || null,
        email: currentUser.email,
      })
      .select()
      .single()

    if (createError) console.error('Failed to create initial profile:', createError)
    setProfile(newProfile)
    return newProfile
  }

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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
      for (let key in localStorage) {
        if (key.startsWith('sb-') || key.startsWith('w2c-')) {
          localStorage.removeItem(key)
        }
      }
    }
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates })
      .select()
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
