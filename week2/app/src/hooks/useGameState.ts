import { useCallback, useEffect, useState } from 'react'
import { GameState, type Choice, type UIGameState, type UIGamePhase } from '@/types/game'
import type { BlockchainService, OnchainGame } from '@/services/blockchain.interface'

const INITIAL_STATE: UIGameState = {
  gameId: null,
  phase: 'waiting-for-opponent',
  myChoice: null,
  opponentChoice: null,
  result: null,
  isLoading: false,
  txError: null,
}

function mapOnchainToPhase(
  game: OnchainGame,
  currentPhase: UIGamePhase,
): Partial<UIGameState> {
  switch (game.state) {
    case GameState.AwaitingPlayerTwo:
      return { phase: 'waiting-for-opponent' }

    case GameState.AwaitingFirstChoice:
    case GameState.AwaitingSecondChoice:
      // Don't revert if already awaiting confirmation or further
      if (
        currentPhase === 'awaiting-confirmation' ||
        currentPhase === 'revealing' ||
        currentPhase === 'result'
      ) {
        return {}
      }
      return { phase: 'selecting' }

    case GameState.GameFinished:
      return { phase: 'revealing' }

    case GameState.WinnerDeclared: {
      if (!game.result) return { phase: 'revealing' }
      const { type, player1Choice, player2Choice } = game.result
      return {
        phase: 'result',
        // Always treating local user as player1 in mock; SolanaService will flip as needed
        myChoice: player1Choice,
        opponentChoice: player2Choice,
        result: {
          outcome: type,
          myChoice: player1Choice,
          opponentChoice: player2Choice,
        },
      }
    }

    default:
      return {}
  }
}

export function useGameState(
  gameId: string | null,
  service: BlockchainService,
) {
  const [state, setState] = useState<UIGameState>({
    ...INITIAL_STATE,
    gameId,
  })

  // Subscribe to onchain game updates
  useEffect(() => {
    if (!gameId) return

    setState((prev) => ({ ...prev, gameId, phase: 'waiting-for-opponent', txError: null }))

    const unsubscribe = service.subscribeToGame(gameId, (game: OnchainGame) => {
      setState((prev) => ({
        ...prev,
        ...mapOnchainToPhase(game, prev.phase),
        isLoading: false,
      }))
    })

    return unsubscribe
  }, [gameId, service])

  const makeChoice = useCallback(
    async (choice: Choice) => {
      if (!gameId || state.isLoading) return

      setState((prev) => ({
        ...prev,
        isLoading: true,
        txError: null,
        myChoice: choice,
        phase: 'awaiting-confirmation',
      }))

      try {
        await service.makeChoice(gameId, choice)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          phase: 'revealing',
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          txError:
            err instanceof Error ? err.message : 'Transaction failed. Please try again.',
          myChoice: null,
          phase: 'selecting',
        }))
      }
    },
    [gameId, state.isLoading, service],
  )

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, txError: null }))
  }, [])

  return { state, makeChoice, dismissError }
}
