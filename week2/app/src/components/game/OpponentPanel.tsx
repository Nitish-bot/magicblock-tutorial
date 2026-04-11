import { motion } from 'framer-motion'
import { HandFist, Hand, Scissors } from '@phosphor-icons/react'
import { Choice } from '@/types/game'
import { CHOICE_META } from '@/constants/game'
import type { UIGamePhase } from '@/types/game'

const ICONS = {
  [Choice.Rock]: HandFist,
  [Choice.Paper]: Hand,
  [Choice.Scissors]: Scissors,
}

interface Props {
  opponentChoice: Choice | null
  phase: UIGamePhase
}

export function OpponentPanel({ opponentChoice, phase }: Props) {
  const isRevealed = phase === 'result' && opponentChoice !== null
  const meta = opponentChoice !== null ? CHOICE_META[opponentChoice] : null
  const Icon = opponentChoice !== null ? ICONS[opponentChoice] : null

  const isWaiting =
    phase === 'waiting-for-opponent' || phase === 'lobby' || phase === 'selecting'
  const isRevealPhase = phase === 'revealing' || phase === 'awaiting-confirmation'

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-muted font-display text-xs tracking-[0.3em] uppercase">
        Opponent
      </span>

      <div
        className="relative size-40 flex items-center justify-center"
        style={{ perspective: '800px' }}
      >
        {/* Mystery face — rotates away on reveal */}
        <motion.div
          animate={{ rotateY: isRevealed ? 90 : 0, opacity: isRevealed ? 0 : 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ backfaceVisibility: 'hidden', position: 'absolute' }}
          className={`flex items-center justify-center size-36 rounded-full
                      bg-base-200 border-2 border-base-content/10
                      ${isRevealPhase ? 'anim-orbit-pulse' : ''}`}
        >
          {isWaiting ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="size-20 rounded-full bg-base-content/5"
            />
          ) : (
            <span
              className="font-display font-bold text-5xl select-none"
              style={{ color: 'oklch(94% 0.01 280 / 0.25)' }}
            >
              ?
            </span>
          )}
        </motion.div>

        {/* Revealed face — rotates in from behind */}
        {opponentChoice !== null && Icon && meta && (
          <motion.div
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{
              rotateY: isRevealed ? 0 : -90,
              opacity: isRevealed ? 1 : 0,
            }}
            transition={{ duration: 0.35, ease: 'easeInOut', delay: 0.2 }}
            style={{
              backfaceVisibility: 'hidden',
              position: 'absolute',
              borderColor: meta.colorVar,
              boxShadow: `0 0 24px ${meta.colorVar}55, 0 0 48px ${meta.colorVar}22`,
            }}
            className="flex items-center justify-center size-36 rounded-full bg-base-200 border-2"
          >
            <Icon size={80} weight="fill" style={{ color: meta.colorVar }} />
          </motion.div>
        )}
      </div>

      {isRevealed && meta ? (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-sm tracking-widest uppercase"
          style={{ color: meta.colorVar }}
        >
          {meta.label}
        </motion.span>
      ) : (
        <span className="font-display text-xs tracking-wider text-muted">
          {isWaiting ? '—' : '···'}
        </span>
      )}
    </div>
  )
}
