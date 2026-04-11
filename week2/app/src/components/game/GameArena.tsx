import { PlayerPanel } from './PlayerPanel'
import { OpponentPanel } from './OpponentPanel'
import { VsDisplay } from './VsDisplay'
import type { UIGameState } from '@/types/game'

interface Props {
  gameState: UIGameState
}

export function GameArena({ gameState }: Props) {
  const { phase, myChoice, opponentChoice, isLoading } = gameState

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-10 items-center w-full max-w-2xl mx-auto">
      <PlayerPanel myChoice={myChoice} isLoading={isLoading} phase={phase} />
      <VsDisplay />
      <OpponentPanel opponentChoice={opponentChoice} phase={phase} />
    </div>
  )
}
