import { Menu } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function SettingsPanel({ open, onToggle }) {
  const { t } = useLanguage()

  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-xl transition-all duration-200 group relative
        ${open
          ? 'bg-white/10 text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      aria-label={t('settings')}
    >
      <Menu className={`w-6 h-6 transition-all duration-300 ${open ? 'rotate-90 scale-110' : 'group-hover:scale-110'}`} />
    </button>
  )
}
