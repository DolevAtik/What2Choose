import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function ImageUpload({ label, value, onChange, id }) {
  const { t } = useLanguage()
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB')
      return
    }
    onChange(file)
  }, [onChange])

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  function clear(e) {
    e.stopPropagation()
    onChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const preview = value ? URL.createObjectURL(value) : null

  // ─── Main Upload UI ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-300 flex flex-col items-center justify-center
          ${dragging ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-white/10 bg-black/40'}
          ${value ? 'border-none shadow-glass' : ''}
        `}
        id={id}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <button
                type="button"
                onClick={clear}
                className="w-10 h-10 bg-red-500/20 border border-red-500/30 hover:bg-red-500 hover:border-red-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all"
                aria-label="Remove image"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3">
            {/* Upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200
                ${dragging ? 'bg-primary-500/20' : 'bg-surface hover:bg-surfaceHover border border-white/5 hover:border-white/10'}`}
            >
              <Upload className={`w-6 h-6 ${dragging ? 'text-primary-400' : 'text-gray-400'}`} />
              <span className="text-[12px] text-gray-400 font-semibold">{dragging ? t('dropHere') : t('clickToUpload')}</span>
            </button>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">{t('maxSize')}</p>
          </div>
        )}
      </div>

      {/* File input (gallery) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
