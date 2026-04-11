import { AnimatePresence, motion } from 'framer-motion'
import { Trophy, SmileyXEyes, Handshake, ArrowsClockwise, House } from '@phosphor-icons/react'
import { HandFist, Hand, Scissors } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import type { UIResult } from '@/types/game'
import { Choice } from '@/types/game'
import { CHOICE_META } from '@/constants/game'

const CHOICE_ICONS = {
  [Choice.Rock]: HandFist,
  [Choice.Paper]: Hand,
  [Choice.Scissors]: Scissors,
}

const OUTCOME_CONFIG = {
  win: {
    label: 'VICTORY',
    Icon: Trophy,
    colorClass: 'text-success',
    glowClass: 'glow-success',
    borderColor: 'oklch(83% 0.27 140)',
    animate: { scale: [1, 1.12, 1] },
    transition: { duration: 0.6, repeat: 3 },
  },
  lose: {
    label: 'DEFEATED',
    Icon: SmileyXEyes,
    colorClass: 'text-error',
    glowClass: 'glow-error',
    borderColor: 'oklch(62% 0.25 28)',
    animate: { x: [0, -10, 10, -10, 10, 0] },
    transition: { duration: 0.5, delay: 0.2 },
  },
  tie: {
    label: 'DRAW',
    Icon: Handshake,
    colorClass: 'text-warning',
    glowClass: 'glow-warning',
    borderColor: 'oklch(80% 0.18 80)',
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 1, repeat: 2 },
  },
}

interface Props {
  result: UIResult | null
  gameId: string | null
  onPlayAgain: () => void
}

export function ResultOverlay({ result, gameId, onPlayAgain }: Props) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 glass-surface border-t border-base-content/10
                     rounded-t-3xl px-6 pt-6 pb-10 flex flex-col items-center gap-6 shadow-2xl"
        >
          {/* Drag handle */}
          <div className="w-12 h-1 rounded-full bg-base-content/20" />

          {(() => {
            const cfg = OUTCOME_CONFIG[result.outcome]
            const MyIcon = CHOICE_ICONS[result.myChoice]
            const OppIcon = CHOICE_ICONS[result.opponentChoice]
            const myMeta = CHOICE_META[result.myChoice]
            const oppMeta = CHOICE_META[result.opponentChoice]

            return (
              <>
                {/* Outcome label */}
                <motion.div
                  animate={cfg.animate}
                  transition={cfg.transition}
                  className="flex items-center gap-3"
                >
                  <cfg.Icon size={28} weight="fill" className={cfg.colorClass} />
                  <h2
                    className={`font-display font-bold text-3xl tracking-[0.2em] ${cfg.colorClass}`}
                  >
                    {cfg.label}
                  </h2>
                  <cfg.Icon size={28} weight="fill" className={cfg.colorClass} />
                </motion.div>

                {/* Choices showdown */}
                <div className="flex items-center gap-6">
                  {/* My choice */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="flex items-center justify-center size-20 rounded-full bg-base-200 border-2"
                      style={{
                        borderColor: myMeta.colorVar,
                        boxShadow: `0 0 16px ${myMeta.colorVar}44`,
                      }}
                    >
                      <MyIcon size={44} weight="fill" style={{ color: myMeta.colorVar }} />
                    </div>
                    <span className="text-muted text-xs font-display uppercase tracking-wider">
                      You
                    </span>
                  </div>

                  <span className="font-display text-muted text-lg tracking-wider">VS</span>

                  {/* Opponent choice */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="flex items-center justify-center size-20 rounded-full bg-base-200 border-2"
                      style={{
                        borderColor: oppMeta.colorVar,
                        boxShadow: `0 0 16px ${oppMeta.colorVar}44`,
                      }}
                    >
                      <OppIcon size={44} weight="fill" style={{ color: oppMeta.colorVar }} />
                    </div>
                    <span className="text-muted text-xs font-display uppercase tracking-wider">
                      Opp.
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full max-w-xs">
                  <button
                    onClick={onPlayAgain}
                    className="btn btn-primary btn-outline flex-1 font-display tracking-widest uppercase text-xs gap-2"
                  >
                    <ArrowsClockwise size={14} weight="bold" />
                    Play Again
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="btn btn-ghost flex-1 font-display tracking-widest uppercase text-xs gap-2"
                  >
                    <House size={14} weight="bold" />
                    Home
                  </button>
                </div>

                {gameId && (
                  <p className="text-muted text-xs font-display tracking-wider">
                    Game #{gameId}
                  </p>
                )}
              </>
            )
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
