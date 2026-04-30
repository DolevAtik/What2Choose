import { useState, useEffect, useRef } from 'react'
import { Bell, Vote, MessageCircle, UserPlus, X, CheckCheck, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'

const TYPE_CONFIG = {
  vote: {
    icon: Vote,
    color: 'text-accent-400',
    bg: 'bg-accent-500/10',
    labelKey: 'votedOnDecision',
  },
  comment: {
    icon: MessageCircle,
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    labelKey: 'commentedOnDecision',
  },
  follow: {
    icon: UserPlus,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    labelKey: 'startedFollowing',
  },
  like: {
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    labelKey: 'likedYourPost',
  },
}

export default function NotificationsPanel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const panelRef = useRef(null)
  const isRTL = lang === 'he'

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Real-time subscription
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(id, username, avatar_url)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.read).length)
  }

  async function markAllRead() {
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false)
  }

  function handleOpen() {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      markAllRead()
    }
  }

  function handleNotifClick(notif) {
    setOpen(false)
    if (notif.type === 'follow') {
      if (notif.actor?.id) navigate(`/user/${notif.actor.id}`)
    } else if (notif.post_id) {
      navigate(`/?post=${notif.post_id}`)
    } else if (notif.actor?.id) {
      navigate(`/user/${notif.actor.id}`)
    }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all duration-200 group"
        aria-label={t('notifications')}
      >
        <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-neon-primary"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            dir={isRTL ? 'rtl' : 'ltr'}
            className={`absolute top-12 w-[340px] overflow-hidden z-50 solid-panel
              ${isRTL ? 'left-0' : 'right-0'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-bold text-gray-100">{t('notifications')}</span>
              </div>
              <div className="flex items-center gap-2">
                {notifications.some(n => !n.read) && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    {t('markAllRead')}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">{t('noNotifications')}</p>
                  <p className="text-xs text-gray-600 mt-1">{t('noNotificationsDesc')}</p>
                </div>
              ) : (
                notifications.map((notif, i) => {
                  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.vote
                  const Icon = config.icon
                  const actorName = notif.actor?.username || 'Someone'
                  const avatarUrl = notif.actor?.avatar_url

                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} transition-colors hover:bg-white/5
                        ${!notif.read ? 'bg-primary-500/5' : ''}
                        ${i < notifications.length - 1 ? 'border-b border-white/5' : ''}
                      `}
                    >
                      {/* Actor avatar */}
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={actorName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-sm font-bold">{actorName[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${config.bg} border border-white/10`}>
                          <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 leading-snug">
                          <span className="font-bold">{actorName}</span>{' '}
                          <span className="text-gray-400">{t(config.labelKey)}</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">{timeAgo(notif.created_at)}</p>
                      </div>

                      {!notif.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5 shadow-neon-primary" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
