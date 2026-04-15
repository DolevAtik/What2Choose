import { useState, useEffect, useRef } from 'react'
import { Search, X, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SearchBar({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .limit(8)

      setResults(data || [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(user) {
    navigate(`/user/${user.id}`)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center pt-24 px-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(9,9,11,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="glass-panel !rounded-2xl flex items-center gap-3 px-4 py-3 border !border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <Search className="w-5 h-5 text-primary-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base font-medium"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin shrink-0" />
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 glass-panel !rounded-2xl overflow-hidden border !border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
            >
              {results.map((u, i) => {
                const name = u.username || 'User'
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelect(u)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left
                      ${i < results.length - 1 ? 'border-b border-white/5' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center overflow-hidden shrink-0 shadow-neon-primary">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-bold">{name[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-100 truncate">{name}</p>
                    </div>
                    <User className="w-4 h-4 text-gray-500 shrink-0" />
                  </button>
                )
              })}
            </motion.div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 glass-panel !rounded-2xl px-4 py-6 text-center border !border-white/10"
            >
              <p className="text-gray-400 text-sm font-medium">No users found for "<span className="text-primary-400">{query}</span>"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
