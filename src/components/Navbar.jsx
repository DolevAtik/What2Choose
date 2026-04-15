import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusSquare, User, Zap, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import SearchBar from './SearchBar'
import NotificationsPanel from './NotificationsPanel'
import SettingsPanel from './SettingsPanel'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLightMode])

  // ESC to close search
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') setSearchOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const links = [
    { path: '/', icon: Home, label: t('feed') },
    { path: '/create', icon: PlusSquare, label: 'Create', requireAuth: true },
    { path: user ? '/profile' : '/auth', icon: User, label: user ? t('myProfile') : t('signIn') },
  ]

  return (
    <>
      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Top bar */}
      <header className="flex fixed top-0 left-0 right-0 z-50 glass-panel !rounded-none !border-x-0 !border-t-0 px-4 md:px-6 py-3 items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group transition-all"
        >
          <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-neon-primary transition-all duration-300 group-hover:scale-105 p-1">
            <img src="/logo.png" alt="What2Choose Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-300 tracking-tight">What2Choose</span>
        </button>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200 group"
            aria-label="Search users"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Notifications (only when logged in) */}
          <NotificationsPanel />

          {/* Settings hamburger (replaces sun/moon) */}
          <SettingsPanel
            isLightMode={isLightMode}
            onToggleTheme={() => setIsLightMode(prev => !prev)}
          />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-2 ml-1">
            {links.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300
                    ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-glow-desktop"
                      className="absolute inset-0 bg-white/10 rounded-xl shadow-glass border border-white/5"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
                  <span className="relative z-10">{label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Bottom Floating Pill (mobile) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[320px]">
        <div className="glass-panel !rounded-3xl flex items-center justify-around px-2 py-2">
          {links.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path
            const isCreate = path === '/create'

            if (isCreate) {
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative -top-4 flex flex-col items-center group"
                  aria-label={label}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                    ${isActive
                      ? 'bg-gradient-to-br from-primary-500 to-accent-500 shadow-neon-accent scale-95'
                      : 'bg-gradient-to-br from-primary-600 to-accent-600 shadow-neon-primary group-hover:scale-105'
                    }`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </button>
              )
            }

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="nav-item group"
                aria-label={label}
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 z-10 relative transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-gray-300'}`} />
                  {isActive && (
                    <>
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent-400 rounded-full shadow-neon-accent"
                      />
                      <motion.div
                        layoutId="nav-glow-mobile"
                        className="absolute inset-0 bg-primary-500/20 blur-md rounded-full -z-10"
                      />
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
