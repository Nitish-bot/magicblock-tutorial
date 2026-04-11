import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useGameState } from '@/hooks/useGameState'
import { useBlockchainService } from '@/context/BlockchainServiceContext'
import { GameArena } from '@/components/game/GameArena'
import { GameStatusBanner } from '@/components/game/GameStatusBanner'
import { ChoiceSelector } from '@/components/game/ChoiceSelector'
import { TxErrorBanner } from '@/components/game/TxErrorBanner'
import { ResultOverlay } from '@/components/game/ResultOverlay'

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const service = useBlockchainService()

  const { state, makeChoice, dismissError } = useGameState(gameId ?? null, service)

  const showSelector =
    state.phase === 'selecting' || state.phase === 'awaiting-confirmation'

  const handlePlayAgain = () => {
    navigate('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center gap-8 px-4 py-10 flex-1"
    >
      {/* Status */}
      <div className="w-full max-w-2xl">
        <GameStatusBanner phase={state.phase} />
      </div>

      {/* Arena */}
      <div className="w-full max-w-2xl">
        <div className="glass-surface rounded-2xl p-8">
          <GameArena gameState={state} />
        </div>
      </div>

      {/* Error */}
      <div className="w-full max-w-2xl">
        <TxErrorBanner error={state.txError} onDismiss={dismissError} />
      </div>

      {/* Choice selector */}
      <div className="w-full max-w-2xl">
        <ChoiceSelector
          visible={showSelector}
          selectedChoice={state.myChoice}
          disabled={state.isLoading || state.phase === 'awaiting-confirmation'}
          onSelect={makeChoice}
        />
      </div>

      {/* Result overlay */}
      <ResultOverlay
        result={state.result}
        gameId={state.gameId}
        onPlayAgain={handlePlayAgain}
      />
    </motion.div>
  )
}
