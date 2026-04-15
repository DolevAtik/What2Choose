import { createContext, useContext, useState, useEffect } from 'react'
import { translations, interpolate } from '../lib/i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('w2c-lang') || 'en'
  })

  // Apply RTL for Hebrew
  useEffect(() => {
    const isRTL = lang === 'he'
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
    localStorage.setItem('w2c-lang', lang)
  }, [lang])

  /** Translate a key, with optional interpolation vars */
  function t(key, vars) {
    const str = translations[lang]?.[key] ?? translations['en']?.[key] ?? key
    return vars ? interpolate(str, vars) : str
  }

  function toggleLanguage() {
    setLang(prev => prev === 'en' ? 'he' : 'en')
  }

  function setLanguage(newLang) {
    if (newLang === 'en' || newLang === 'he') setLang(newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>')
  return ctx
}
