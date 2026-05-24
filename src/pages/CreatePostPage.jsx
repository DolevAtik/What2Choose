import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Lightbulb, Plus, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useLanguage } from '../contexts/LanguageContext'
import ImageUpload from '../components/ImageUpload'
import { withTimeout } from '../lib/withTimeout'

const CATEGORIES = ['Fashion', 'Food', 'Shopping', 'Travel']
const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [question, setQuestion] = useState('')
  const [optionType, setOptionType] = useState('images') // 'images' | 'text'
  // images is an array of 2–4 File|null values
  const [images, setImages] = useState([null, null])
  // texts is an array of 2–4 string values
  const [texts, setTexts] = useState(['', ''])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [progressPct, setProgressPct] = useState(null)
  const [error, setError] = useState('')

  function addOption() {
    if (optionType === 'images') {
      if (images.length < 4) setImages(prev => [...prev, null])
    } else {
      if (texts.length < 4) setTexts(prev => [...prev, ''])
    }
  }

  function removeOption(idx) {
    if (optionType === 'images') {
      if (images.length <= 2) return
      setImages(prev => prev.filter((_, i) => i !== idx))
    } else {
      if (texts.length <= 2) return
      setTexts(prev => prev.filter((_, i) => i !== idx))
    }
  }

  function setImage(idx, file) {
    setImages(prev => {
      const next = [...prev]
      next[idx] = file
      return next
    })
  }

  function setText(idx, value) {
    setTexts(prev => {
      const next = [...prev]
      next[idx] = value
      return next
    })
  }

  async function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = (e) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.onload = () => {
          const MAX_SIZE = 800
          let w = img.width, h = img.height
          if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE } }
          else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE } }
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Blob failed')), 'image/jpeg', 0.8)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function uploadToStorage(blob, path) {
    async function tryBucket(bucketId) {
      const upload = supabase.storage.from(bucketId).upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false, // avoid requiring UPDATE policy on retries/collisions
      })
      // Increased timeout to 90s to allow for slower connections
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload timed out')), 90000))
      const { error } = await Promise.race([upload, timeout])
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from(bucketId).getPublicUrl(path)
      return publicUrl
    }

    try {
      return await tryBucket('post-images')
    } catch (e) {
      // Backward compatibility: some projects used bucket id "posts"
      if (String(e?.message || '').toLowerCase().includes('bucket')) {
        return await tryBucket('posts')
      }
      throw e
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!question.trim()) return setError(t('errQuestionRequired'))
    if (optionType === 'images') {
      for (let i = 0; i < images.length; i++) {
        if (!images[i]) return setError(t('errUploadOption', { letter: OPTION_LETTERS[i] }))
      }
    } else {
      for (let i = 0; i < texts.length; i++) {
        if (!texts[i]?.trim()) return setError(t('errEnterOption', { letter: OPTION_LETTERS[i] }))
      }
    }
    if (!category) return setError(t('errCategoryRequired'))

    setLoading(true)
    setProgressPct(0)
    setProgressMsg(`${t('loading')} 0%`)

    try {
      const ts = Date.now()
      const optionCount = optionType === 'images' ? images.length : texts.length
      const totalSteps = optionType === 'images' ? optionCount * 2 : 1
      let doneSteps = 0

      const bumpProgress = () => {
        doneSteps += 1
        const pct = Math.min(100, Math.floor((doneSteps / totalSteps) * 100))
        setProgressPct(pct)
        setProgressMsg(`${t('loading')} ${pct}%`)
      }
      
      // Ensure the FK target exists without overwriting profile fields the user edited.
      const { error: profileError } = await withTimeout(
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            username:
              user.user_metadata?.username ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User',
            avatar_url: user.user_metadata?.avatar_url || null,
          }, { onConflict: 'id', ignoreDuplicates: true }),
        12000,
        'Preparing your profile timed out'
      )
      if (profileError) throw profileError

      let urls = []
      if (optionType === 'images') {
        // Upload all images in parallel for better performance
        const uploadPromises = images.map(async (file, i) => {
          // Step 1: process
          const blob = await processImage(file)
          bumpProgress()
          // Step 2: upload
          const unique =
            (globalThis.crypto?.randomUUID?.() || `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`)
          const path = `${user.id}/${ts}_${unique}_${OPTION_LETTERS[i].toLowerCase()}.jpg`
          return uploadToStorage(blob, path)
            .then((url) => {
              bumpProgress()
              return url
            })
        })
        urls = await Promise.all(uploadPromises)
      } else {
        bumpProgress()
      }

      setProgressMsg('Loading 100%')
      setProgressPct(100)

      const row = {
        author_id: user.id,
        question: question.trim(),
        category,
      }
      if (optionType === 'images') {
        row.option_a_url = urls[0]
        row.option_b_url = urls[1]
        if (urls[2]) row.option_c_url = urls[2]
        if (urls[3]) row.option_d_url = urls[3]
      } else {
        // Text-only options (requires schema_v4.sql in Supabase)
        row.option_a_text = texts[0].trim()
        row.option_b_text = texts[1].trim()
        if (texts[2]?.trim()) row.option_c_text = texts[2].trim()
        if (texts[3]?.trim()) row.option_d_text = texts[3].trim()
      }

      const { error: insertError } = await supabase.from('posts').insert(row)
      if (insertError) throw new Error(`Database error: ${insertError.message}`)

      navigate('/')
    } catch (err) {
      console.error(err)
      const msg = err?.message || ''
      const details = err?.details || err?.hint || err?.error_description || ''
      if (err.message?.includes('bucket not found')) {
        setError(t('errStorageBucketMissing'))
      } else if (msg.includes('option_c_url') || msg.includes('option_d_url')) {
        setError(t('errSchemaV3Missing'))
      } else if (msg.includes('option_a_text') || msg.includes('option_b_text') || msg.includes('option_c_text') || msg.includes('option_d_text')) {
        setError(t('errSchemaV4Missing'))
      } else if (err.message?.includes('Policy')) {
        setError(t('errPermissionDenied', { details: details || '' }))
      } else if (msg.toLowerCase().includes('foreign key') || msg.toLowerCase().includes('profiles')) {
        setError(t('errProfileNotReady'))
      } else {
        setError(details ? `${msg}\n${details}` : (msg || 'Failed to create post.'))
      }
    } finally {
      setLoading(false)
      setProgressMsg('')
      setProgressPct(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="glass-panel text-center p-8 max-w-sm w-full">
          <span className="text-4xl block mb-4">🔒</span>
          <h2 className="text-xl font-bold text-gray-200 mb-2">Sign in Required</h2>
          <p className="text-gray-400 mb-6">You need an account to post a decision.</p>
          <button onClick={() => navigate('/auth')} className="btn-primary w-full">Go to Sign In</button>
        </div>
      </div>
    )
  }

  // Grid layout: 2→2col, 3→2+1 centered, 4→2x2
  const gridClass = (optionType === 'images' ? images.length : texts.length) === 4
    ? 'grid-cols-2'
    : (optionType === 'images' ? images.length : texts.length) === 3
      ? 'grid-cols-2'
      : 'grid-cols-2'

  return (
    <div className="min-h-screen pt-20 pb-28 md:pb-12 md:pt-24 relative z-10">
      {/* Header */}
      <div className="sticky top-[60px] md:top-16 z-40 glass-panel !rounded-none !border-x-0 !border-t-0 shadow-glass">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 hover:bg-surface border border-white/5 transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">{t('newDecision')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Tip */}
        <div className="glass-panel p-4 flex gap-4 items-start border-l-4 border-l-primary-500">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">{t('tipText')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 glass-panel p-5 md:p-6 !rounded-3xl">

          {/* Question */}
          <div className="space-y-2">
            <label htmlFor="question" className="text-sm font-bold text-gray-200 tracking-wide uppercase">
              {t('yourQuestion')} <span className="text-accent-500">*</span>
            </label>
            <textarea
              id="question"
              placeholder={t('questionPlaceholder')}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={200}
              className="input-base resize-none bg-black/40 shadow-inner"
            />
            <p className="text-xs font-semibold text-gray-500 text-right">{question.length}/200</p>
          </div>

          {/* Option Type */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-200 tracking-wide uppercase">
              {t('optionType')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOptionType('images')}
                className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 border
                  ${optionType === 'images'
                    ? 'bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500 text-primary-300 shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02]'
                    : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300 hover:bg-surface'
                  }`}
              >
                {t('optionTypeImages')}
              </button>
              <button
                type="button"
                onClick={() => setOptionType('text')}
                className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 border
                  ${optionType === 'text'
                    ? 'bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500 text-primary-300 shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02]'
                    : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300 hover:bg-surface'
                  }`}
              >
                {t('optionTypeText')}
              </button>
            </div>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-200 tracking-wide uppercase">
                Options <span className="text-xs text-gray-500 normal-case font-medium ml-1">({optionType === 'images' ? images.length : texts.length}/4)</span>
              </label>
              {(optionType === 'images' ? images.length : texts.length) < 4 && (
                <motion.button
                  type="button"
                  onClick={addOption}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-400 border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addOption')}
                </motion.button>
              )}
            </div>

            <div className={`grid ${gridClass} gap-3`}>
              <AnimatePresence mode="popLayout">
                {(optionType === 'images' ? images : texts).map((val, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`relative ${(optionType === 'images' ? images.length : texts.length) === 3 && idx === 2 ? 'col-span-2 max-w-[50%] mx-auto w-full' : ''}`}
                  >
                    {optionType === 'images' ? (
                      <ImageUpload
                        id={`option-${OPTION_LETTERS[idx].toLowerCase()}-upload`}
                        label={t('optionLabel', { letter: OPTION_LETTERS[idx] })}
                        value={val}
                        onChange={(file) => setImage(idx, file)}
                      />
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-300 tracking-wider uppercase">
                          {t('optionLabel', { letter: OPTION_LETTERS[idx] })}
                        </label>
                        <input
                          value={val}
                          onChange={(e) => setText(idx, e.target.value)}
                          placeholder={t('optionTextPlaceholder', { letter: OPTION_LETTERS[idx] })}
                          maxLength={80}
                          className="input-base bg-black/40 shadow-inner"
                        />
                      </div>
                    )}
                    {/* Remove button (only for C and D) */}
                    {idx >= 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
                        aria-label={t('removeOption')}
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-200 tracking-wide uppercase">{t('category')} <span className="text-accent-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 border
                    ${category === cat
                      ? 'bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500 text-primary-300 shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02]'
                      : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300 hover:bg-surface'
                    }`}
                >
                  {cat === 'Fashion' ? '👗 Fashion' : cat === 'Food' ? '🍕 Food' : cat === 'Shopping' ? '🛍 Shopping' : '✈️ Travel'}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-semibold text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base tracking-wide uppercase mt-2 shadow-[0_8px_30px_rgba(139,92,246,0.3)]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {progressMsg || t('uploading')}
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {t('postDecision')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
