import { useCallback, useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

export default function ImageUpload({ label, value, onChange, id }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

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
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  function handleInputChange(e) {
    handleFile(e.target.files?.[0])
  }

  function clear(e) {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const preview = value ? URL.createObjectURL(value) : null

  return (
    <div className="flex flex-col gap-2">
      {/* Label is intentionally empty or hidden here since we put the label inside the upload box or rely on parent, but let's keep it styled if passed */}
      {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-square rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all duration-300 flex flex-col items-center justify-center
          ${dragging ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-white/10 bg-black/40 hover:border-primary-500/50 hover:bg-surface'}
          ${value ? 'border-none shadow-glass' : ''}
        `}
        role="button"
        aria-label={`Upload ${label}`}
        id={id}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <button
                onClick={clear}
                className="w-10 h-10 bg-red-500/20 border border-red-500/30 hover:bg-red-500 hover:border-red-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all"
                aria-label="Remove image"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              dragging ? 'bg-primary-500/20 shadow-neon-primary' : 'bg-surface border border-white/5 shadow-inner'
            }`}>
              <Upload className={`w-6 h-6 transition-colors ${dragging ? 'text-primary-400' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 font-bold tracking-wide mb-1">
                {dragging ? 'Drop it here!' : 'Click to upload'}
              </p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex flex-col gap-0.5">
                <span>PNG, JPG, WEBP</span>
                <span>Max 10MB</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
