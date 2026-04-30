import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PlusSquare, User, Zap, Search, Settings, Moon, Sun, LogOut, ChevronRight, X, MessageCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import { supabase } from '../lib/supabase'
import SearchBar from './SearchBar'
import NotificationsPanel from './NotificationsPanel'
import SettingsPanel from './SettingsPanel'
import Attribution from './Attribution'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { lang, t, setLanguage } = useLanguage()

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light'
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const drawerRef = useRef(null)

  const isRTL = lang === 'he'

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.remove('light-mode')
      localStorage.setItem('theme', 'dark')
    }
  }, [isLightMode])

  // ESC to close search/settings
  useEffect(() => {
    function onKey(e) { 
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Unread messages count
  useEffect(() => {
    if (!user) return
    let channel = null

    async function loadUnread() {
      try {
        const { data: convs } = await supabase
          .from('conversations')
          .select('id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        if (!convs?.length) return
        const convIds = convs.map(c => c.id)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', convIds)
          .neq('sender_id', user.id)
          .eq('read', false)
        setUnreadMessages(count || 0)
      } catch (e) { /* chat tables not created yet */ }
    }
    loadUnread()

    try {
      channel = supabase
        .channel(`chat-unread-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            if (payload.new.sender_id !== user.id) {
              setUnreadMessages(prev => prev + 1)
            }
          })
        .subscribe()
    } catch (e) { /* chat tables not created yet */ }

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [user])

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e) {
      if (settingsOpen && drawerRef.current && !drawerRef.current.contains(e.target)) {
        // Only close if we didn't click the trigger button (handled by SettingsPanel)
        // But since SettingsPanel is inside the header and drawer is outside, 
        // we need to be careful. Check for data-settings-trigger or similar?
        // Let's just check if it's not a button in the top bar.
        if (e.target.closest('[data-settings-trigger="true"]')) return
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [settingsOpen])

  async function handleSignOut() {
    setSettingsOpen(false)
    await signOut()
    navigate('/auth')
  }

  function handleNavigate(path) {
    setSettingsOpen(false)
    navigate(path)
  }

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

      {/* Settings Drawer (Outside header to escape stacking context) */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />

            {/* Side Panel */}
            <motion.div
              ref={drawerRef}
              initial={{ x: isRTL ? '-100%' : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '-100%' : '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              dir={isRTL ? 'rtl' : 'ltr'}
              className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-[310px] glass-panel !rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] ${isRTL ? 'border-r' : 'border-l'} !border-white/10 z-[100] flex flex-col`}
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
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
                {/* User Info */}
                {user && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{isRTL ? 'מחובר כ' : 'Logged in as'}</p>
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

                {/* Theme */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{t('theme')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { if (isLightMode) setIsLightMode(false) }}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all duration-300 border
                        ${!isLightMode ? 'bg-primary-600/20 border-primary-500 text-primary-300' : 'border-white/5 text-gray-500 bg-white/5'}`}
                    >
                      <Moon className="w-5 h-5" />
                      {t('themeDark')}
                    </button>
                    <button
                      onClick={() => { if (!isLightMode) setIsLightMode(true) }}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-xs font-bold transition-all duration-300 border
                        ${isLightMode ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'border-white/5 text-gray-500 bg-white/5'}`}
                    >
                      <Sun className="w-5 h-5" />
                      {t('themeLight')}
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">{t('language')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setLanguage('en')} className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all border ${lang === 'en' ? 'bg-sky-600/20 border-sky-500 text-sky-200' : 'border-white/5 text-gray-500 bg-white/5'}`}>🇺🇸 EN</button>
                    <button onClick={() => setLanguage('he')} className={`flex items-center justify-center gap-2 p-3 rounded-2xl text-sm font-bold transition-all border ${lang === 'he' ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'border-white/5 text-gray-500 bg-white/5'}`}>🇮🇱 HE</button>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  {user ? (
                    <>
                      <button onClick={() => handleNavigate('/profile')} className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center"><User className="w-5 h-5 text-primary-400" /></div>
                        <span className="flex-1 text-base font-semibold text-gray-200 group-hover:text-white">{t('myProfile')}</span>
                        <ChevronRight className={`w-5 h-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
                      </button>
                      <button onClick={handleSignOut} className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all group ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><LogOut className="w-5 h-5 text-red-500" /></div>
                        <span className="flex-1 text-base font-bold text-red-500">{t('signOut')}</span>
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleNavigate('/auth')} className={`w-full flex items-center gap-4 p-5 rounded-2xl bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 transition-all group ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center"><User className="w-5 h-5 text-accent-400" /></div>
                      <span className="flex-1 text-lg font-bold text-gray-100">{t('signIn')}</span>
                      <ChevronRight className={`w-6 h-6 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex flex-col gap-1 items-center bg-black/20 mt-auto">
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center"><img src="/logo.jpeg" className="w-full h-full object-cover" /></div>
                   <span className="text-xs font-bold text-gray-500">What2Choose</span>
                </div>
                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-[0.2em]">{isRTL ? 'עוצב עבור מקבלי החלטות' : 'Crafted for decision makers'}</p>
                <Attribution className="mt-3" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="flex fixed top-0 left-0 right-0 z-50 glass-panel !rounded-none !border-x-0 !border-t-0 px-4 md:px-6 py-3 items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 group transition-all"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 overflow-hidden">
            <img src="/logo.jpeg" alt="What2Choose Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-300 tracking-tight">What2Choose</span>
        </button>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200 group"
          >
            <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Chat (mobile header shortcut) */}
          {user && (
            <button
              onClick={() => { navigate('/chat'); setUnreadMessages(0) }}
              className="relative p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200 group"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-emerald-500 to-primary-500 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-neon-primary">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </button>
          )}

          {/* Notifications */}
          <NotificationsPanel />

          {/* Settings hamburger */}
          <SettingsPanel
            open={settingsOpen}
            onToggle={() => setSettingsOpen((prev) => !prev)}
          />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-2 ml-1">
            {links.map(({ path, icon: Icon, label, badge }) => {
              const isActive = location.pathname === path || (path === '/chat' && location.pathname.startsWith('/chat'))
              return (
                <button
                  key={path}
                  onClick={() => { navigate(path); if (path === '/chat') setUnreadMessages(0) }}
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
                  <div className="relative">
                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
                    {badge && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-gradient-to-br from-emerald-500 to-primary-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
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
          {links.map(({ path, icon: Icon, label, badge }) => {
            const isActive = location.pathname === path
            const isCreate = path === '/create'

            if (isCreate) {
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative -top-4 flex flex-col items-center group"
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
                onClick={() => { navigate(path); if (path === '/chat') setUnreadMessages(0) }}
                className="nav-item group"
              >
                <div className="relative">
                  <Icon className={`w-6 h-6 z-10 relative transition-transform duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-gray-300'}`} />
                  {badge && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-gradient-to-br from-emerald-500 to-primary-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
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
