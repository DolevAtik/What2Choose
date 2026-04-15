import { useCallback, useRef, useState } from 'react'
import { Upload, X, Camera } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function ImageUpload({ label, value, onChange, id }) {
  const { t } = useLanguage()
  const [dragging, setDragging] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const videoRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)

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
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    stopCamera()
  }

  // ─── Camera (getUserMedia for desktop, input capture for mobile) ──────────

  function isMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  function openCamera(e) {
    e.stopPropagation()
    setCameraError('')
    if (isMobile()) {
      // On mobile: native camera input is the smoothest UX
      cameraInputRef.current?.click()
    } else {
      // On desktop: getUserMedia with preview
      startDesktopCamera()
    }
  }

  async function startDesktopCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStream(mediaStream)
      setShowCamera(true)
      // Give React time to render <video> before assigning srcObject
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      })
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Camera not accessible. Check browser permissions.')
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setShowCamera(false)
  }

  function capturePhoto(e) {
    e.stopPropagation()
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera_photo.jpg', { type: 'image/jpeg' })
        onChange(file)
        stopCamera()
      }
    }, 'image/jpeg', 0.9)
  }

  const preview = value ? URL.createObjectURL(value) : null

  // ─── Camera Preview Overlay ────────────────────────────────────────────────
  if (showCamera) {
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</label>}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-white/10">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3 px-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); stopCamera() }}
              className="flex-1 py-2.5 rounded-xl bg-black/60 border border-white/10 text-gray-300 text-xs font-bold backdrop-blur-sm hover:bg-black/80 transition-colors"
            >
              ✕ Cancel
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-500 transition-colors shadow-neon-primary"
            >
              📸 Capture
            </button>
          </div>
        </div>
      </div>
    )
  }

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
              className={`w-full flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200
                ${dragging ? 'bg-primary-500/20' : 'bg-surface hover:bg-surfaceHover border border-white/5 hover:border-white/10'}`}
            >
              <Upload className={`w-5 h-5 ${dragging ? 'text-primary-400' : 'text-gray-400'}`} />
              <span className="text-[11px] text-gray-400 font-semibold">{dragging ? t('dropHere') : t('clickToUpload')}</span>
            </button>

            {/* Camera button */}
            <button
              type="button"
              onClick={openCamera}
              className="w-full flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-surface hover:bg-surfaceHover border border-white/5 hover:border-primary-500/30 transition-all duration-200 group"
            >
              <Camera className="w-4 h-4 text-gray-500 group-hover:text-primary-400 transition-colors" />
              <span className="text-[10px] text-gray-500 group-hover:text-gray-300 font-semibold transition-colors">{t('orTakePhoto')}</span>
            </button>

            {cameraError && (
              <p className="text-[10px] text-red-400 text-center px-1">{cameraError}</p>
            )}
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

      {/* Camera input (mobile native) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
