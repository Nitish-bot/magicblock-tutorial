/**
 * UI-layer game types.
 * Enums mirror week1/app/client/src/generated/types/ — keep in sync.
 * The SolanaBlockchainService will translate between these and the onchain types.
 */

export enum Choice {
  Rock = 0,
  Paper = 1,
  Scissors = 2,
}

export enum GameState {
  AwaitingPlayerTwo = 0,
  AwaitingFirstChoice = 1,
  AwaitingSecondChoice = 2,
  GameFinished = 3,
  WinnerDeclared = 4,
}

export type UIGamePhase =
  | 'lobby'
  | 'waiting-for-opponent'
  | 'selecting'
  | 'awaiting-confirmation'
  | 'revealing'
  | 'result'

export type UIOutcome = 'win' | 'lose' | 'tie'

export interface UIResult {
  outcome: UIOutcome
  myChoice: Choice
  opponentChoice: Choice
}

export interface UIGameState {
  gameId: string | null
  phase: UIGamePhase
  myChoice: Choice | null
  opponentChoice: Choice | null
  result: UIResult | null
  isLoading: boolean
  txError: string | null
}
