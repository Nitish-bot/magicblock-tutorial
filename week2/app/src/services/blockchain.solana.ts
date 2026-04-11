/**
 * Solana blockchain service — placeholder for real integration.
 *
 * To implement:
 *  1. Import @solana/kit, @magicblock-labs/ephemeral-rollups-kit
 *  2. Import generated instructions from week1/app/client/src/generated/
 *  3. Implement each method using the UiWalletAccount from SelectedWalletAccountContext
 *  4. In subscribeToGame, open a WebSocket subscription to the game account PDA
 *  5. Map onchain GameState/GameResult → OnchainGame and call the subscriber
 *
 * Usage: swap MockBlockchainService for SolanaBlockchainService in main.tsx
 */

import type { BlockchainService, OnchainGame } from './blockchain.interface'
import type { Choice } from '@/types/game'

export class SolanaBlockchainService implements BlockchainService {
  async createGame(): Promise<string> {
    throw new Error('SolanaBlockchainService.createGame: not implemented')
  }

  async joinGame(_gameId: string): Promise<void> {
    throw new Error('SolanaBlockchainService.joinGame: not implemented')
  }

  async makeChoice(_gameId: string, _choice: Choice): Promise<void> {
    throw new Error('SolanaBlockchainService.makeChoice: not implemented')
  }

  subscribeToGame(
    _gameId: string,
    _callback: (game: OnchainGame) => void,
  ): () => void {
    throw new Error('SolanaBlockchainService.subscribeToGame: not implemented')
  }
}
