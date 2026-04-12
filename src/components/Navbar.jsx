import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusSquare, User, Zap, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLightMode])

  const toggleTheme = () => setIsLightMode(!isLightMode)

  const links = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/create', icon: PlusSquare, label: 'Create', requireAuth: true },
    { path: user ? '/profile' : '/auth', icon: User, label: user ? 'Profile' : 'Sign In' },
  ]

  return (
    <>
      {/* Top bar (visible on mobile and desktop) */}
      <header className="flex fixed top-0 left-0 right-0 z-50 glass-panel !rounded-none !border-x-0 !border-t-0 px-4 md:px-6 py-3 items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group transition-all"
        >
          <div className="w-8 h-8 bg-gradient-to-tr from-primary-600 to-accent-500 rounded-xl flex items-center justify-center shadow-neon-primary group-hover:shadow-neon-accent transition-all duration-300 group-hover:scale-105">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-300 tracking-tight">What2Choose</span>
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200 group"
            aria-label="Toggle Theme"
          >
            {isLightMode ? (
              <Moon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            ) : (
              <Sun className="w-5 h-5 group-hover:scale-110 transition-transform" />
            )}
          </button>

          <nav className="hidden md:flex items-center gap-2">
            {links.map(({ path, icon: Icon, label, requireAuth }) => {
              const isActive = location.pathname === path
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-white/10 text-white shadow-glass'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
                  {label}
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
                  {isActive && <div className="absolute inset-0 bg-primary-500/20 blur-md rounded-full" />}
                </div>
                {isActive && <span className="nav-item-indicator" />}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
