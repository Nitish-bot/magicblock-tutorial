import { Choice, GameState } from '@/types/game'
import type { BlockchainService, OnchainGame } from './blockchain.interface'

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function randomId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

function randomChoice(): Choice {
  return [Choice.Rock, Choice.Paper, Choice.Scissors][
    Math.floor(Math.random() * 3)
  ] as Choice
}

function computeOutcome(
  p1: Choice,
  p2: Choice,
): 'win' | 'lose' | 'tie' {
  if (p1 === p2) return 'tie'
  const beats: Record<Choice, Choice> = {
    [Choice.Rock]: Choice.Scissors,
    [Choice.Paper]: Choice.Rock,
    [Choice.Scissors]: Choice.Paper,
  }
  return beats[p1] === p2 ? 'win' : 'lose'
}

interface InternalGame {
  gameId: string
  player1: string
  player2: string | null
  state: GameState
  player1Choice: Choice | null
  player2Choice: Choice | null
  resultType: 'win' | 'lose' | 'tie' | null
}

/**
 * Mock blockchain service for UI development.
 * Simulates realistic delays and state progressions without any real wallet.
 *
 * Flow:
 *  createGame() → AwaitingPlayerTwo → (2.5s) AwaitingFirstChoice
 *  joinGame()   → AwaitingFirstChoice immediately
 *  makeChoice() → (800ms confirm) → AwaitingSecondChoice
 *               → (1.5s opponent) → WinnerDeclared
 */
export class MockBlockchainService implements BlockchainService {
  private games = new Map<string, InternalGame>()
  private subscribers = new Map<string, Set<(g: OnchainGame) => void>>()

  async createGame(): Promise<string> {
    await delay(600)
    const gameId = randomId()
    this.games.set(gameId, {
      gameId,
      player1: 'mock-player-1',
      player2: null,
      state: GameState.AwaitingPlayerTwo,
      player1Choice: null,
      player2Choice: null,
      resultType: null,
    })

    // Simulate opponent joining after 2.5 s
    setTimeout(() => {
      this._updateGame(gameId, {
        player2: 'mock-player-2',
        state: GameState.AwaitingFirstChoice,
      })
    }, 2500)

    return gameId
  }

  async joinGame(gameId: string): Promise<void> {
    await delay(600)
    if (!this.games.has(gameId)) {
      this.games.set(gameId, {
        gameId,
        player1: 'mock-player-1',
        player2: 'mock-joiner',
        state: GameState.AwaitingFirstChoice,
        player1Choice: null,
        player2Choice: null,
        resultType: null,
      })
    } else {
      this._updateGame(gameId, {
        player2: 'mock-joiner',
        state: GameState.AwaitingFirstChoice,
      })
    }
  }

  async makeChoice(gameId: string, choice: Choice): Promise<void> {
    await delay(800)
    this._updateGame(gameId, {
      player1Choice: choice,
      state: GameState.AwaitingSecondChoice,
    })

    // Simulate opponent committing + reveal after 1.5 s
    setTimeout(() => {
      const game = this.games.get(gameId)
      if (!game) return
      const opponentChoice = randomChoice()
      const resultType = computeOutcome(choice, opponentChoice)
      this._updateGame(gameId, {
        player2Choice: opponentChoice,
        state: GameState.WinnerDeclared,
        resultType,
      })
    }, 1500)
  }

  subscribeToGame(
    gameId: string,
    callback: (game: OnchainGame) => void,
  ): () => void {
    if (!this.subscribers.has(gameId)) {
      this.subscribers.set(gameId, new Set())
    }
    this.subscribers.get(gameId)!.add(callback)

    // Push current state immediately if game exists
    const current = this.games.get(gameId)
    if (current) {
      callback(this._toOnchainGame(current))
    }

    return () => {
      this.subscribers.get(gameId)?.delete(callback)
    }
  }

  private _updateGame(gameId: string, updates: Partial<InternalGame>) {
    const game = this.games.get(gameId)
    if (!game) return
    Object.assign(game, updates)
    const snapshot = this._toOnchainGame(game)
    this.subscribers.get(gameId)?.forEach((cb) => cb(snapshot))
  }

  private _toOnchainGame(game: InternalGame): OnchainGame {
    const base: OnchainGame = {
      gameId: game.gameId,
      player1: game.player1,
      player2: game.player2,
      state: game.state,
    }
    if (
      game.state === GameState.WinnerDeclared &&
      game.player1Choice !== null &&
      game.player2Choice !== null &&
      game.resultType !== null
    ) {
      base.result = {
        type: game.resultType,
        player1Choice: game.player1Choice,
        player2Choice: game.player2Choice,
      }
    }
    return base
  }
}
