import type { Choice, GameState } from '@/types/game'

/**
 * Minimal onchain game snapshot passed to UI subscribers.
 * The SolanaBlockchainService will fetch from the chain and shape this.
 */
export interface OnchainGame {
  gameId: string
  player1: string
  player2: string | null
  state: GameState
  /** Only present when state === GameState.WinnerDeclared */
  result?: {
    type: 'win' | 'lose' | 'tie'
    player1Choice: Choice
    player2Choice: Choice
  }
}

/**
 * Adapter interface between UI and the Solana program.
 *
 * To integrate real blockchain calls:
 *  1. Implement this interface in SolanaBlockchainService
 *  2. Swap MockBlockchainService for SolanaBlockchainService in main.tsx
 *  3. Wire @solana/kit + @magicblock-labs/ephemeral-rollups-kit inside each method
 */
export interface BlockchainService {
  /** Creates a new game. Returns the gameId string. */
  createGame(): Promise<string>

  /** Joins an existing game as player 2. */
  joinGame(gameId: string): Promise<void>

  /** Commits the player's choice on-chain. */
  makeChoice(gameId: string, choice: Choice): Promise<void>

  /**
   * Subscribes to live updates for a game.
   * Returns an unsubscribe function to clean up the listener.
   */
  subscribeToGame(
    gameId: string,
    callback: (game: OnchainGame) => void,
  ): () => void
}
