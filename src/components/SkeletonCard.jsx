import { motion } from 'framer-motion'

export default function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-surfaceHover relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-surfaceHover rounded-full w-24 relative overflow-hidden">
            <Shimmer />
          </div>
          <div className="h-3 bg-surface/50 rounded-full w-16 relative overflow-hidden">
            <Shimmer />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="px-5 py-4">
        <div className="h-4 bg-surfaceHover rounded-full w-3/4 relative overflow-hidden">
          <Shimmer />
        </div>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 gap-1.5 mx-4 mb-5 rounded-2xl overflow-hidden relative shadow-lg">
        <div className="aspect-[4/5] bg-surfaceHover relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="aspect-[4/5] bg-surface/50 relative overflow-hidden">
          <Shimmer />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-4 border-t border-white/5 pt-3">
        <div className="h-6 w-16 bg-surfaceHover/30 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
        <div className="h-6 w-16 bg-surfaceHover/30 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
    </div>
  )
}

function Shimmer() {
  return (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear',
      }}
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
    />
  )
}
