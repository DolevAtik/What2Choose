import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Lightbulb } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import ImageUpload from '../components/ImageUpload'

const CATEGORIES = ['Fashion', 'Food', 'Shopping', 'Travel']

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [question, setQuestion] = useState('')
  const [imageA, setImageA] = useState(null)
  const [imageB, setImageB] = useState(null)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [error, setError] = useState('')
  async function processImage(file) {
    setProgressMsg(`Processing ${file.name}...`)

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onload = (e) => {
        const img = new Image()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.onload = () => {
          const MAX_SIZE = 800 // Increased quality slightly since we use storage now
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create image blob'))
          }, 'image/jpeg', 0.8)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function uploadToStorage(blob, path) {
    console.log(`Starting upload to storage: ${path}`, blob)
    
    // Add a timeout to the upload just in case it hangs
    const uploadPromise = supabase.storage
      .from('posts')
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Storage upload timed out. This is usually due to missing RLS policies in Supabase.')), 15000)
    )

    const { data, error } = await Promise.race([uploadPromise, timeoutPromise])

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }
    
    console.log('Upload successful, getting public URL...')
    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(path)
      
    console.log('Public URL:', publicUrl)
    return publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setProgressMsg('')

    if (!question.trim()) return setError('Please enter your question')
    if (!imageA) return setError('Please upload Option A image')
    if (!imageB) return setError('Please upload Option B image')
    if (!category) return setError('Please select a category')

    setLoading(true)
    setProgressMsg('Processing images...')

    try {
      const ts = Date.now()
      
      console.log('Processing Image A...')
      const blobA = await processImage(imageA)
      console.log('Processing Image B...')
      const blobB = await processImage(imageB)

      setProgressMsg('Uploading Image A...')
      const urlA = await uploadToStorage(blobA, `${user.id}/${ts}_a.jpg`)
      
      setProgressMsg('Uploading Image B...')
      const urlB = await uploadToStorage(blobB, `${user.id}/${ts}_b.jpg`)

      setProgressMsg('Saving post to database...')
      console.log('Saving to DB...', { urlA, urlB })
      
      const { data: dbData, error: insertError } = await supabase.from('posts').insert({
        author_id: user.id,
        question: question.trim(),
        option_a_url: urlA,
        option_b_url: urlB,
        category,
      })

      if (insertError) {
        console.error('Post Insert Error:', insertError)
        throw new Error(`Database error: ${insertError.message}`)
      }

      console.log('Post created successfully!')
      setProgressMsg('Done! Redirecting...')
      navigate('/')
    } catch (err) {
      console.error('Full caught error in handleSubmit:', err)
      if (err.message?.includes('bucket not found')) {
        setError('Storage bucket "posts" not found. Please create it in your Supabase dashboard.')
      } else if (err.message?.includes('storage_quota_exceeded')) {
        setError('Storage quota exceeded. Please check your Supabase dashboard.')
      } else if (err.message?.includes('Policy')) {
        setError('Permission denied. Please run the RLS SQL script in your Supabase dashboard.')
      } else {
        setError(err.message || 'Failed to create post. Please try again.')
      }
    } finally {
      setLoading(false)
      setProgressMsg('')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="glass-panel text-center p-8 max-w-sm w-full animate-fade-up">
          <div className="w-16 h-16 bg-surfaceHover rounded-full flex items-center justify-center mx-auto mb-4 shadow-glass">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400 mb-2">Sign in Required</h2>
          <p className="text-gray-400 mb-6 font-medium">You need an account to post a decision.</p>
          <button onClick={() => navigate('/auth')} className="btn-primary w-full shadow-neon-primary">Go to Sign In</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-28 md:pb-12 md:pt-24 relative z-10">
      {/* Header */}
      <div className="sticky top-[60px] md:top-16 z-40 glass-panel !rounded-none !border-x-0 !border-t-0 shadow-glass">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 hover:bg-surface border border-white/5 transition-all duration-300 hover:-translate-x-1"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">New Decision</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Tip */}
        <div className="glass-panel p-4 flex gap-4 items-start border-l-4 border-l-primary-500">
          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 shadow-neon-primary">
             <Lightbulb className="w-4 h-4 text-primary-400" />
          </div>
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            Post two options and let the community vote. The more specific your question, the better the results!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 glass-panel p-5 md:p-6 !rounded-3xl">

          {/* Question */}
          <div className="space-y-2">
            <label htmlFor="question" className="text-sm font-bold text-gray-200 tracking-wide uppercase">
              Your Question <span className="text-accent-500">*</span>
            </label>
            <textarea
              id="question"
              placeholder="e.g. Which outfit should I wear to the party?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={200}
              className="input-base resize-none bg-black/40 shadow-inner"
            />
            <p className="text-xs font-semibold text-gray-500 text-right">{question.length}/200</p>
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <ImageUpload
              id="option-a-upload"
              label="Option A"
              value={imageA}
              onChange={setImageA}
            />
            <ImageUpload
              id="option-b-upload"
              label="Option B"
              value={imageB}
              onChange={setImageB}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-200 tracking-wide uppercase">Category <span className="text-accent-500">*</span></label>
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
                  {cat === 'Fashion' ? '👗 Fashion' :
                   cat === 'Food' ? '🍕 Food' :
                   cat === 'Shopping' ? '🛍 Shopping' :
                   '✈️ Travel'}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-semibold text-red-400 animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.1)]">
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
                {progressMsg || 'Uploading...'}
              </span>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Post Decision
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
