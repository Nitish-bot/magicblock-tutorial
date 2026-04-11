import { AnimatePresence, motion } from 'framer-motion'
import { Choice } from '@/types/game'
import { ALL_CHOICES } from '@/constants/game'
import { ChoiceCard } from './ChoiceCard'

interface Props {
  visible: boolean
  selectedChoice: Choice | null
  disabled: boolean
  onSelect: (choice: Choice) => void
}

export function ChoiceSelector({ visible, selectedChoice, disabled, onSelect }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            {ALL_CHOICES.map((choice) => (
              <ChoiceCard
                key={choice}
                choice={choice}
                isSelected={selectedChoice === choice}
                isDimmed={selectedChoice !== null && selectedChoice !== choice}
                disabled={disabled}
                onClick={onSelect}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
