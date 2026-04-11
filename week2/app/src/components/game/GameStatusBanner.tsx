import { AnimatePresence, motion } from 'framer-motion'
import { UsersThree, Target, CircleNotch, Eye } from '@phosphor-icons/react'
import type { UIGamePhase } from '@/types/game'
import { PHASE_MESSAGES } from '@/constants/game'

const phaseIcons: Partial<Record<UIGamePhase, React.ReactNode>> = {
  'waiting-for-opponent': <UsersThree size={18} weight="fill" />,
  selecting: <Target size={18} weight="fill" />,
  'awaiting-confirmation': (
    <CircleNotch size={18} weight="bold" className="animate-spin" />
  ),
  revealing: <Eye size={18} weight="fill" />,
}

interface Props {
  phase: UIGamePhase
}

export function GameStatusBanner({ phase }: Props) {
  const message = PHASE_MESSAGES[phase]
  if (!message) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25 }}
        className="glass-surface rounded-box px-5 py-3 flex items-center gap-3 text-sm"
      >
        <span className="text-primary shrink-0">{phaseIcons[phase]}</span>
        <div className="min-w-0">
          <span className="font-display font-semibold text-base-content tracking-wide">
            {message.title}
          </span>
          <span className="text-muted ml-2 text-xs">{message.subtitle}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
