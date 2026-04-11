import { motion } from 'framer-motion'
import { HandFist, Hand, Scissors } from '@phosphor-icons/react'
import { Choice } from '@/types/game'
import { CHOICE_META } from '@/constants/game'

const ICONS = {
  [Choice.Rock]: HandFist,
  [Choice.Paper]: Hand,
  [Choice.Scissors]: Scissors,
}

interface Props {
  choice: Choice
  isSelected: boolean
  isDimmed: boolean
  disabled: boolean
  onClick: (choice: Choice) => void
}

export function ChoiceCard({ choice, isSelected, isDimmed, disabled, onClick }: Props) {
  const meta = CHOICE_META[choice]
  const Icon = ICONS[choice]

  return (
    <motion.button
      onClick={() => !disabled && onClick(choice)}
      disabled={disabled}
      whileHover={!disabled && !isSelected ? { scale: 1.06 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      animate={{
        scale: isSelected ? 1.1 : 1,
        opacity: isDimmed ? 0.35 : 1,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      aria-label={meta.label}
      aria-pressed={isSelected}
      className={`relative flex flex-col items-center justify-center gap-3 p-5
                  rounded-2xl border-2 cursor-pointer select-none
                  transition-colors
                  ${isSelected
                    ? 'border-current bg-base-300'
                    : 'border-base-content/10 bg-base-200 hover:border-current hover:bg-base-300/60'
                  }
                  disabled:cursor-not-allowed`}
      style={{
        color: meta.colorVar,
        ...(isSelected
          ? { boxShadow: `0 0 20px ${meta.colorVar}55, 0 0 40px ${meta.colorVar}22` }
          : {}),
      }}
    >
      {/* Glow ring on selected */}
      {isSelected && (
        <motion.div
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: `inset 0 0 12px ${meta.colorVar}33` }}
        />
      )}

      <Icon
        size={52}
        weight={isSelected ? 'fill' : 'bold'}
        style={{ color: meta.colorVar }}
      />

      <span className="font-display font-semibold text-sm tracking-widest uppercase text-base-content">
        {meta.label}
      </span>

      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 size-2 rounded-full"
          style={{ backgroundColor: meta.colorVar }}
        />
      )}
    </motion.button>
  )
}
