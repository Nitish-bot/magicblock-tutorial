import { motion } from 'framer-motion'

export function VsDisplay() {
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex items-center justify-center"
      >
        {/* Orbit ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute size-16 rounded-full border border-primary/30 border-dashed"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          className="absolute size-12 rounded-full border border-secondary/20 border-dashed"
        />

        {/* VS text */}
        <span className="font-display font-bold text-xl tracking-[0.3em] text-primary/80 z-10">
          VS
        </span>
      </motion.div>
    </div>
  )
}
