import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageContext.jsx'
import './index.css'

// If a dynamic import / chunk preload fails (common after deploy with stale cache),
// reload once to get the latest index.html + assets.
// See: Vite "preload error" event.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    // Avoid infinite reload loops
    const key = 'w2c-preload-reload'
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
