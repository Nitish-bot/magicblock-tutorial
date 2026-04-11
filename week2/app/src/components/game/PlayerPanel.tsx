import { motion } from 'framer-motion'
import {
  HandFist,
  Hand,
  Scissors,
} from '@phosphor-icons/react'
import { Choice } from '@/types/game'
import { CHOICE_META } from '@/constants/game'

const ICONS = {
  [Choice.Rock]: HandFist,
  [Choice.Paper]: Hand,
  [Choice.Scissors]: Scissors,
}

interface Props {
  myChoice: Choice | null
  isLoading: boolean
  phase: string
}

export function PlayerPanel({ myChoice, isLoading, phase }: Props) {
  const isConfirmed =
    phase === 'awaiting-confirmation' ||
    phase === 'revealing' ||
    phase === 'result'
  const meta = myChoice !== null ? CHOICE_META[myChoice] : null
  const Icon = myChoice !== null ? ICONS[myChoice] : null

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-muted font-display text-xs tracking-[0.3em] uppercase">
        You
      </span>

      <div className="relative flex items-center justify-center size-40">
        {myChoice === null ? (
          /* Pulsing orb — no choice yet */
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="size-32 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="size-20 rounded-full bg-primary/10"
            />
          </motion.div>
        ) : (
          /* Chosen icon with glow */
          <motion.div
            key={myChoice}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className={`flex items-center justify-center size-36 rounded-full bg-base-200
                        border-2 ${isConfirmed ? 'border-primary glow-primary' : 'border-primary/40'}`}
          >
            {Icon && (
              <Icon
                size={80}
                weight="fill"
                style={{ color: meta?.colorVar }}
              />
            )}
          </motion.div>
        )}

        {/* Loading ring */}
        {isLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
          />
        )}

        {/* Lock ring when confirmed */}
        {isConfirmed && myChoice !== null && !isLoading && (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border border-primary/30"
          />
        )}
      </div>

      {meta && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-sm tracking-widest uppercase"
          style={{ color: meta.colorVar }}
        >
          {meta.label}
        </motion.span>
      )}
    </div>
  )
}
