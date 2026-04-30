import { useEffect, useRef, useState } from 'react'
import { TOAST_EVENT_NAME } from '../lib/toast'
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const STYLES = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  error: 'border-red-500/20 bg-red-500/10 text-red-200',
  info: 'border-white/10 bg-white/8 text-gray-200',
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  useEffect(() => {
    function onToast(e) {
      const id = ++idRef.current
      const type = e?.detail?.type || 'info'
      const message = e?.detail?.message || ''
      const durationMs = e?.detail?.durationMs ?? 3200
      if (!message) return

      setToasts((prev) => [{ id, type, message }, ...prev].slice(0, 3))
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, durationMs)
    }

    window.addEventListener(TOAST_EVENT_NAME, onToast)
    return () => window.removeEventListener(TOAST_EVENT_NAME, onToast)
  }, [])

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[200] w-[92vw] max-w-sm pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || ICONS.info
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`mb-2 glass-panel !rounded-2xl border ${STYLES[t.type] || STYLES.info} shadow-[0_12px_40px_rgba(0,0,0,0.6)]`}
            >
              <div className="flex items-start gap-2.5 p-3">
                <Icon className="w-4.5 h-4.5 mt-0.5 shrink-0" />
                <p className="text-sm font-semibold leading-snug">{t.message}</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

