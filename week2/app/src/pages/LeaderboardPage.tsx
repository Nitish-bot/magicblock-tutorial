import { motion } from 'framer-motion'
import { Trophy } from '@phosphor-icons/react'

export function LeaderboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center flex-1 gap-6 px-4 py-20"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Trophy size={56} weight="duotone" className="text-warning" />
      </motion.div>

      <div className="text-center">
        <h1 className="font-display font-bold text-2xl tracking-widest uppercase text-base-content">
          Leaderboard
        </h1>
        <p className="text-muted text-sm mt-2 font-display tracking-wider">
          Coming Soon
        </p>
      </div>

      <div className="w-full max-w-lg glass-surface rounded-2xl p-8">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="skeleton w-6 h-4 rounded" />
              <div className="skeleton flex-1 h-4 rounded" />
              <div className="skeleton w-16 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
