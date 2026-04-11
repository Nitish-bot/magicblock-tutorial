import { AnimatePresence, motion } from 'framer-motion'
import { XCircle, X } from '@phosphor-icons/react'

interface Props {
  error: string | null
  onDismiss: () => void
}

export function TxErrorBanner({ error, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          role="alert"
          className="alert alert-error alert-soft flex items-start gap-3"
        >
          <XCircle size={18} weight="fill" className="shrink-0 mt-0.5" />
          <span className="text-sm font-display flex-1">{error}</span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="btn btn-ghost btn-xs btn-circle shrink-0"
          >
            <X size={14} weight="bold" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
