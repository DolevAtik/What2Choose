import { useLanguage } from '../contexts/LanguageContext'

const LINKEDIN_URL = 'https://www.linkedin.com/in/dolev-atik/'

function LinkedInIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M20.45 20.45h-3.55v-5.56c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.95v5.65H9.37V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.35-1.85 3.58 0 4.24 2.36 4.24 5.43v6.31ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM3.56 20.45h3.55V9H3.56v11.45ZM22.22 0H1.78C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.78 24h20.44C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  )
}

export default function Attribution({ className = '' }) {
  const { t, lang } = useLanguage()
  const isRTL = lang === 'he'

  return (
    <a
      href={LINKEDIN_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors ${isRTL ? 'flex-row-reverse' : ''} ${className}`}
      aria-label={t('builtByLinkedInAria')}
    >
      <span>{t('builtByDolevAtik')}</span>
      <LinkedInIcon className="w-4 h-4 text-[#0A66C2]" />
    </a>
  )
}

