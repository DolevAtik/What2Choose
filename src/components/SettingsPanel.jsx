import { useState, useEffect, useRef } from 'react'
import { Settings, Moon, Sun, Globe, User, LogOut, ChevronRight, Info } from 'lucide-react'
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
    <div className="relative" ref={panelRef}>
      {/* Hamburger/Settings Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`p-2 rounded-xl transition-all duration-200 group relative
          ${open
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          }`}
        aria-label={t('settings')}
      >
        <Settings className={`w-5 h-5 transition-all duration-300 ${open ? 'rotate-45 scale-110' : 'group-hover:scale-110'}`} />
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-12 ${isRTL ? 'left-0' : 'right-0'} w-[280px] glass-panel !rounded-2xl overflow-hidden shadow-[0_16px_60px_rgba(0,0,0,0.6)] border !border-white/10 z-50`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-gray-100">{t('settings')}</span>
            </div>

            {/* Theme Section */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t('theme')}</p>
              <div className="flex gap-2">
                {/* Dark */}
                <button
                  onClick={() => { if (isLightMode) onToggleTheme() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border
                    ${!isLightMode
                      ? 'bg-gradient-to-br from-primary-600/30 to-accent-600/20 border-primary-500/40 text-primary-300 shadow-[0_0_12px_rgba(139,92,246,0.2)]'
                      : 'border-white/5 text-gray-500 bg-surface/50 hover:border-white/10 hover:text-gray-300'
                    }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  {t('themeDark')}
                </button>
                {/* Light */}
                <button
                  onClick={() => { if (!isLightMode) onToggleTheme() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border
                    ${isLightMode
                      ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(251,189,35,0.15)]'
                      : 'border-white/5 text-gray-500 bg-surface/50 hover:border-white/10 hover:text-gray-300'
                    }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  {t('themeLight')}
                </button>
              </div>
            </div>

            {/* Language Section */}
            <div className="px-4 pt-2 pb-3 border-b border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{t('language')}</p>
              <div className="flex gap-2">
                {/* English */}
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border
                    ${lang === 'en'
                      ? 'bg-gradient-to-br from-sky-600/30 to-blue-600/20 border-sky-500/40 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                      : 'border-white/5 text-gray-500 bg-surface/50 hover:border-white/10 hover:text-gray-300'
                    }`}
                >
                  <span className="text-base leading-none">🇺🇸</span>
                  {t('langEn')}
                </button>
                {/* Hebrew */}
                <button
                  onClick={() => setLanguage('he')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border
                    ${lang === 'he'
                      ? 'bg-gradient-to-br from-blue-600/30 to-sky-600/20 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                      : 'border-white/5 text-gray-500 bg-surface/50 hover:border-white/10 hover:text-gray-300'
                    }`}
                >
                  <span className="text-base leading-none">🇮🇱</span>
                  {t('langHe')}
                </button>
              </div>
            </div>

            {/* User Actions */}
            {user ? (
              <div className="py-2">
                <button
                  onClick={() => handleNavigate('/profile')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary-400" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{t('myProfile')}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-all ${isRTL ? 'rotate-180' : ''}`} />
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-red-400 group-hover:text-red-300 transition-colors">{t('signOut')}</span>
                </button>
              </div>
            ) : (
              <div className="py-2">
                <button
                  onClick={() => handleNavigate('/auth')}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-accent-400" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">{t('signIn')}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 flex items-center gap-1.5">
              <Info className="w-3 h-3 text-gray-700" />
              <span className="text-[10px] text-gray-700 font-medium">What2Choose · {t('appVersion')} 1.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
