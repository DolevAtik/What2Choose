import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import Attribution from '../components/Attribution'

export default function AuthPage() {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const { signIn, signUp, signInWithGoogle } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (tab === 'login') {
        await signIn(email, password)
      } else {
        if (!username.trim()) {
          setError('Username is required')
          setLoading(false)
          return
        }
        await signUp(email, password, username)
        setSuccess('Account created! Check your email to confirm.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-8 animate-fade-in flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-[0_8px_32px_rgba(255,255,255,0.1)] mb-4 relative overflow-hidden group">
            <img src="/logo.jpeg" alt="What2Choose Logo" className="w-full h-full object-cover relative z-10 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/10 to-accent-500/10" />
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 tracking-tight">What2Choose</h1>
          <p className="mt-2 text-primary-400 font-medium text-sm tracking-widest uppercase">Your decisions, decided by the crowd</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 animate-fade-up !rounded-3xl border-t border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

          {/* Tab toggle */}
          <div className="flex bg-black/40 rounded-2xl p-1 mb-8 gap-1 border border-white/5 shadow-inner relative">
            <button
              className={`flex-1 py-2.5 text-sm font-bold tracking-wide uppercase transition-all duration-300 rounded-xl relative z-10 ${
                tab === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => { setTab('login'); setError(''); setSuccess('') }}
            >
              {tab === 'login' && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)] border border-primary-500/30 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              Sign In
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-bold tracking-wide uppercase transition-all duration-300 rounded-xl relative z-10 ${
                tab === 'signup' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => { setTab('signup'); setError(''); setSuccess('') }}
            >
              {tab === 'signup' && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-accent-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)] border border-primary-500/30 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              Create Account
            </button>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-bold text-red-400 animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm font-bold text-emerald-400 animate-fade-in shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              {success}
            </div>
          )}

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              {tab === 'signup' && (
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-focus-within:text-primary-400 transition-colors" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-base pl-12 bg-black/40 text-base py-4"
                    autoComplete="username"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-focus-within:text-primary-400 transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-12 bg-black/40 text-base py-4"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none group-focus-within:text-primary-400 transition-colors" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-12 pr-12 bg-black/40 text-base py-4"
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-base uppercase tracking-widest mt-2 shadow-[0_8px_30px_rgba(139,92,246,0.4)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  tab === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="btn-secondary w-full py-4 text-sm font-bold tracking-wide flex items-center justify-center gap-3 border-white/10 hover:border-white/20 hover:bg-surface disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 font-medium mt-8 tracking-wide">
          By continuing, you agree to our <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">Terms of Service</span> &amp; <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
        </p>

        <div className="mt-4 flex justify-center">
          <Attribution />
        </div>
      </div>
    </div>
  )
}
