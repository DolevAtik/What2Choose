import { Settings, Moon, Sun, Globe, User, LogOut, ChevronRight, Info, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

export default function SettingsPanel({ isLightMode, onToggleTheme }) {
  const { user, signOut } = useAuth()
  const { lang, t, setLanguage } = useLanguage()
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/auth')
  }

  function handleNavigate(path) {
    setOpen(false)
    navigate(path)
  }

  const isRTL = lang === 'he'

  return (
    <div ref={panelRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-xl transition-all duration-200 group relative
          ${open
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        aria-label={t('settings')}
      >
        <Menu className={`w-6 h-6 transition-all duration-300 ${open ? 'rotate-90 scale-110' : 'group-hover:scale-110'}`} />
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />

            {/* Side Panel */}
            <motion.div
              initial={{ x: isRTL ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-[310px] glass-panel !rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l !border-white/10 z-[100] flex flex-col`}
            >
              {/* Header */}
              <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shadow-neon-primary">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-gray-100 block">{t('settings')}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">{t('appVersion')} 1.0</span>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                {/* User Info (if logged in) */}
                {user && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Logged in as</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold border border-primary-500/20">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-100 truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Theme Section */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{t('theme')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Dark */}
                    <button
                      onClick={() => { if (isLightMode) onToggleTheme() }}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all duration-300 border
                        ${!isLightMode
                          ? 'bg-gradient-to-br from-primary-600/20 to-accent-600/10 border-primary-500/50 text-primary-300 shadow-[0_8px_20px_rgba(139,92,246,0.15)]'
                          : 'border-white/5 text-gray-500 bg-white/5 hover:border-white/10 hover:text-gray-300'
                        }`}
                    >
                      <Moon className="w-5 h-5" />
                      {t('themeDark')}
                    </button>
                    {/* Light */}
                    <button
                      onClick={() => { if (!isLightMode) onToggleTheme() }}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all duration-300 border
                        ${isLightMode
                          ? 'bg-gradient-to-br from-amber-500/15 to-yellow-500/15 border-amber-500/50 text-amber-300 shadow-[0_8px_20px_rgba(251,189,35,0.1)]'
                          : 'border-white/5 text-gray-500 bg-white/5 hover:border-white/10 hover:text-gray-300'
                        }`}
                    >
                      <Sun className="w-5 h-5" />
                      {t('themeLight')}
                    </button>
                  </div>
                </div>

                {/* Language Section */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{t('language')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* English */}
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all duration-300 border
                        ${lang === 'en'
                          ? 'bg-gradient-to-br from-sky-600/20 to-blue-600/10 border-sky-500/50 text-sky-200 shadow-[0_8px_20px_rgba(14,165,233,0.1)]'
                          : 'border-white/5 text-gray-500 bg-white/5 hover:border-white/10 hover:text-gray-300'
                        }`}
                    >
                      <span className="text-xl">🇺🇸</span>
                      {t('langEn')}
                    </button>
                    {/* Hebrew */}
                    <button
                      onClick={() => setLanguage('he')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all duration-300 border
                        ${lang === 'he'
                          ? 'bg-gradient-to-br from-blue-600/20 to-sky-600/10 border-blue-500/50 text-blue-200 shadow-[0_8px_20px_rgba(59,130,246,0.1)]'
                          : 'border-white/5 text-gray-500 bg-white/5 hover:border-white/10 hover:text-gray-300'
                        }`}
                    >
                      <span className="text-xl">🇮🇱</span>
                      {t('langHe')}
                    </button>
                  </div>
                </div>

                {/* User Actions */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  {user ? (
                    <>
                      <button
                        onClick={() => handleNavigate('/profile')}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="flex-1 text-base font-semibold text-gray-200 group-hover:text-white transition-colors">{t('myProfile')}</span>
                        <ChevronRight className={`w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-all ${isRTL ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <LogOut className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="flex-1 text-base font-bold text-red-500 group-hover:text-red-400 transition-colors uppercase tracking-widest">{t('signOut')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleNavigate('/auth')}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-accent-400" />
                      </div>
                      <span className="flex-1 text-lg font-bold text-gray-100 group-hover:text-white transition-colors">{t('signIn')}</span>
                      <ChevronRight className={`w-6 h-6 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Sidebar Footer */}
              <div className="p-6 border-t border-white/5 flex flex-col gap-1 items-center bg-black/20">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 bg-white rounded-md p-0.5"><img src="/logo.png" className="w-full h-full object-contain" /></div>
                   <span className="text-xs font-bold text-gray-500">What2Choose</span>
                </div>
                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.2em]">Crafted for decision makers</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
