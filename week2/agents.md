# Week 2 Agent Architecture Guide

This document explains the architecture of the Rock Paper Scissors stack located in `week2/`.
It is intentionally detailed and operational: use it as a map before changing code.

## 1. Series Context

Repository roadmap context:
- Week 1: counter-based Ephemeral Rollup + delegation fundamentals.
- Week 2 (this document): private ER + permissions + auth tokens via Rock Paper Scissors.
- Weeks 3 to 6: additive extensions to the Week 2 project line (randomness, session keys, magic actions, private payments).
- Week 7: new standalone trustless digital arcade project.

## 2. Project Purpose (Week 2)

This Week 2 project is a Rock-Paper-Scissors dApp built around:
- An Anchor program (`programs/magicblock-tutorial`) deployed to Solana.
- MagicBlock Ephemeral Rollups delegation + commit flow.
- A generated TypeScript client (`app/client/src/generated`) produced from Anchor IDL via Codama.
- A Vitest integration test (`tests/rock-paper-scissors.test.ts`) that exercises base layer + private ephemeral behavior.
- A React/Vite frontend (`app/src`) that currently uses a mock service by default, with a placeholder real Solana service implementation.

## 3. Top-Level Architecture (Week 2 Scope)

Key root files/directories:
- `Anchor.toml`: Anchor toolchain/provider/scripts config.
- `Cargo.toml`: Rust workspace root, includes `programs/*`.
- `package.json`: JS tooling scripts (generate, setup, test:devnet).
- `codama.json`: points at `target/idl/magicblock_tutorial.json` and renders JS client into `app/client`.
- `vitest.config.ts`: alias `@/client` to generated client sources.
- `tests/rock-paper-scissors.test.ts`: full end-to-end integration scenario.
- `programs/magicblock-tutorial/`: on-chain program.
- `app/`: frontend app.
- `target/`: Anchor build artifacts and generated IDL/types.
- `test-ledger/`, `magicblock-test-storage/`: local validator state artifacts.

## 4. Runtime Systems and Responsibility Boundaries

There are three runtime domains:

1. Base Layer (Solana RPC)
- Owns canonical accounts and final committed state.
- Handles account creation and non-delegated reads/writes.

2. Ephemeral Rollup (MagicBlock)
- Receives delegated PDAs.
- Executes fast/private game actions (`make_choice`, `reveal_winner`).
- Commits + undelegates accounts back to base layer in reveal path.

Private ER specifics:
- Authenticated endpoints can issue wallet-bound auth tokens for scoped reads/writes.
- Permissions constrain which delegated accounts each participant may view.

3. Off-chain clients
- Integration test orchestrates both layers and validates state transitions.
- Frontend uses service abstraction to talk to chain (mock now, Solana service later).

## 5. On-Chain Program Architecture

Program location:
- `programs/magicblock-tutorial/src/lib.rs`

Program ID:
- `Bv4p1TKzfmuUzZDmVCe2KzmY65ShCj7xbZn2Uc8qSxQv`

### 5.1 Modules

- `constants.rs`: PDA seed constants (`game`, `choice`).
- `state.rs`: account/state enums and game logic helper (`Choice::beats`).
- `error.rs`: domain errors (`JoinOwnGame`, `ChooseTooEarly`, etc.).
- `utils.rs`: `AccountType` enum + seed derivation helper for generic permission/delegation APIs.
- `instructions/*.rs`: instruction account constraints + handlers.

Instruction exports are centralized in:
- `programs/magicblock-tutorial/src/instructions.rs`

### 5.2 Account Model

`Game` account (`state.rs`):
- `game_id: u64`
- `player1: Pubkey`
- `player2: Option<Pubkey>`
- `state: GameState`
- `result: GameResult`

`PlayerChoice` account (`state.rs`):
- `game_id: u64`
- `player: Pubkey`
- `choice: Option<Choice>`

Enums:
- `GameState`: `AwaitingPlayerTwo`, `AwaitingFirstChoice`, `AwaitingSecondChoice`, `GameFinished`, `WinnerDeclared`
- `GameResult`: `Winner(GameData)`, `Tie(Choice)`, `None`
- `Choice`: `Rock`, `Paper`, `Scissors`

### 5.3 PDA Scheme

Defined by `constants.rs` and used throughout constraints/derivation:
- Game PDA seeds: `[b"game", game_id.to_le_bytes()]`
- PlayerChoice PDA seeds: `[b"choice", player_pubkey, game_id.to_le_bytes()]`

`utils.rs` wraps these in `AccountType` for shared derivation logic used by:
- `create_permission`
- `delegate_pda`

### 5.4 Instruction Semantics

1. `create_game` (`instructions/create_game.rs`)
- Initializes `Game` + creator's `PlayerChoice`.
- Sets `Game.state = AwaitingPlayerTwo`, `Game.result = None`.

2. `join_game` (`instructions/join_game.rs`)
- Rejects joining own game (`JoinOwnGame`).
- Rejects if `player2` already set (`JoinFullGame`).
- Creates player2's `PlayerChoice` PDA.
- Sets `game.player2 = Some(player)` and `state = AwaitingFirstChoice`.

3. `make_choice` (`instructions/make_choice.rs`)
- Rejects duplicate choice (`ChooseTwice`).
- Enforces state machine:
  - `AwaitingFirstChoice -> AwaitingSecondChoice`
  - `AwaitingSecondChoice -> GameFinished`
  - otherwise error `ChooseTooEarly`
- Stores choice in caller's `PlayerChoice`.

4. `reveal_winner` (`instructions/reveal_winner.rs`)
- Guard rails:
  - requires `player2.is_some()`
  - requires both `player1_choice.choice` and `player2_choice.choice`
- Computes winner/tie via `Choice::beats` and writes `Game.result`.
- Sets `Game.state = WinnerDeclared`.
- Calls permission program CPI (`UpdatePermissionCpiBuilder`) to clear account members (`members: None`) for:
  - game
  - player1 choice
  - player2 choice
- Calls `commit_and_undelegate_accounts(...)` so ER state is finalized back to base layer.

5. `create_permission` (`instructions/create_permission.rs`)
- Generic permission creation via CPI to MagicBlock permission program.
- Derives signer seeds from `AccountType` + bump.
- Optional `members` allows scoped access control policies.

6. `delegate_pda` (`instructions/delegate_pda.rs`)
- Generic delegation entrypoint using `#[delegate]` macro.
- Delegates target PDA (`game_or_choice`) with optional validator override.

### 5.5 Ephemeral Rollup Hooks/Macros

In `lib.rs` / handlers:
- `#[ephemeral]` at program module level.
- `#[delegate]` for delegation context.
- `#[commit]` for reveal flow.

These are core to ER behavior and should not be removed without redesigning the runtime model.

## 6. Permission + Delegation Lifecycle

Canonical lifecycle for a game:

1. Base layer:
- Create game + player1 choice account.

2. Base layer:
- Create permission for player1 choice.
- Delegate permission authority to ER validator.
- Delegate player1 choice PDA.

3. Base layer after join:
- Create permission for game account and player2 choice account.
- Delegate both permissions and both PDAs.

4. Ephemeral layer:
- Players submit `make_choice` on delegated accounts.

5. Ephemeral layer:
- `reveal_winner` updates result and state.
- Program clears permissions.
- Program commits + undelegates accounts back to base.

6. Base layer:
- Final winner state becomes visible in canonical RPC.

## 7. Generated TypeScript Client Architecture

Generation source chain:
- Anchor build outputs IDL at `target/idl/magicblock_tutorial.json`.
- `codama.json` points to that IDL.
- `npm run generate` (or `bun run generate`) runs `codama run js`.
- Artifacts emitted under `app/client/src/generated`.

Generated structure:
- `accounts/`: codecs/decoders for account data.
- `instructions/`: strongly typed instruction builders/parsers.
- `pdas/`: PDA derivation helpers.
- `types/`: enum/struct types mirrored from IDL.
- `programs/magicblockTutorial.ts`: instruction/account discriminators, instruction identification, plugin helpers.
- `errors/`: generated error maps.

Important usage pattern:
- Tests and future real frontend service should consume generated helpers instead of handcrafting instruction data.

## 8. Integration Test Architecture

Test file:
- `tests/rock-paper-scissors.test.ts`

### 7.1 What It Validates

- Account creation and state initialization.
- Permission creation and delegation correctness.
- Private visibility constraints on delegated accounts (TEE path).
- Ephemeral writes (`make_choice`) and state transitions.
- Reveal + final commit back to base layer.

### 7.2 Connection Topology

- `baseConnection`: base RPC/WS.
- `ephemeralConnection`: ephemeral RPC/WS.
- Per-player ephemeral connections may include auth tokens in TEE mode.

Environment routing:
- `CLUSTER` determines defaults (`devnet` vs local).
- `BASE_ENDPOINT` / `BASE_WS_ENDPOINT` for base RPC.
- `EPHEMERAL_ENDPOINT` / `EPHEMERAL_WS_ENDPOINT` for ER.
- `ER_VALIDATOR` for delegation target.

### 7.3 End-to-End Test Steps

1. Create and fund authority/player wallets.
2. Derive game/choice PDAs and permission PDAs.
3. Create game and delegate player1 choice.
4. Join game and delegate game + player2 choice.
5. Verify delegated account visibility constraints.
6. Submit both choices on ephemeral endpoints.
7. Reveal winner on ephemeral.
8. Poll base layer until `WinnerDeclared` and assert result data.

## 9. Frontend Architecture (`app/`)

### 8.1 Composition

Entry:
- `app/src/main.tsx`

Provides:
- `SelectedWalletAccountProvider` for wallet account selection state.
- `BlockchainServiceContext.Provider` with concrete service instance.

Routing (`app/src/App.tsx`):
- `/` -> `HomePage`
- `/game/:gameId` -> `GamePage`
- `/leaderboard` -> `LeaderboardPage`

Layout:
- `AppLayout` + sticky `Header`.

### 8.2 Service Abstraction

Interface:
- `app/src/services/blockchain.interface.ts`

Methods:
- `createGame()`
- `joinGame(gameId)`
- `makeChoice(gameId, choice)`
- `subscribeToGame(gameId, callback)`

Implementations:
- `blockchain.mock.ts`: full fake state machine for UI development.
- `blockchain.solana.ts`: placeholder for real chain integration.

Current default in `main.tsx`:
- `new MockBlockchainService()`.

### 8.3 UI State Machine

Hook:
- `app/src/hooks/useGameState.ts`

Maintains UI phase (`UIGamePhase`) distinct from on-chain enum:
- `lobby`
- `waiting-for-opponent`
- `selecting`
- `awaiting-confirmation`
- `revealing`
- `result`

Maps on-chain snapshots (`OnchainGame`) to UI state transitions and handles optimistic local updates during transaction submission.

### 8.4 Game UI Components

Core game panel components:
- `GameArena` orchestrates player/opponent panels + VS display.
- `ChoiceSelector` renders selectable choices.
- `GameStatusBanner` renders phase message.
- `TxErrorBanner` displays action failures.
- `ResultOverlay` renders final outcome and replay navigation.

Wallet UI:
- `ConnectWalletMenu` + `WalletOption` + `DisconnectButton` via Wallet Standard APIs.

Styling:
- `app/src/styles/globals.css` uses Tailwind v4 + DaisyUI theme tokens.
- Defines shared utilities (`glass-surface`, glow classes, animation utilities).

## 10. Build, Generate, Test, and Run Workflows

From `week2/` root:

- Build program + regenerate JS client:
  - `bun run setup`
  - (`anchor build && codama run js`)

- Regenerate client only:
  - `bun run generate`

- Devnet tests:
  - `bun run test:devnet`

Frontend (`week2/app`):
- `bun run dev`
- `bun run build`

## 11. Agent Change Strategy (Recommended)

When modifying this codebase, follow this order:

1. Update on-chain logic first (Rust instruction/state changes).
2. Rebuild and regenerate client (`anchor build` + `codama run js`).
3. Update test flows to reflect new instruction accounts/state transitions.
4. Update frontend service adapter and hooks if type/state shape changed.
5. Keep mock behavior semantically aligned with real expected on-chain behavior.

Future-week compatibility rules:
6. Design new fields and states for additive evolution (Weeks 3 to 6 build on this project).
7. Prefer explicit versioned migrations over breaking PDA seed/account layout changes.
8. Keep permission and auth assumptions documented when adding new gameplay or payment flows.

## 12. Critical Invariants and Pitfalls

- Do not break PDA seed conventions unless you intentionally migrate all call sites.
- `make_choice` assumes caller's `PlayerChoice` PDA is derived from signer + game id.
- `reveal_winner` assumes both choices are present and game has two players.
- Permission account handling is not optional in delegated flow; reveal expects permission accounts.
- TEE/private endpoint flows require correctly issued auth tokens for participant-scoped access.
- Generated client files are derived artifacts: edit source program/IDL, then regenerate.
- Frontend currently does not execute real chain writes unless `SolanaBlockchainService` is implemented and wired.

## 13. Quick File Map for Agents

On-chain:
- `programs/magicblock-tutorial/src/lib.rs`
- `programs/magicblock-tutorial/src/state.rs`
- `programs/magicblock-tutorial/src/instructions/*.rs`

Off-chain generated client:
- `app/client/src/generated/index.ts`
- `app/client/src/generated/programs/magicblockTutorial.ts`
- `app/client/src/generated/instructions/*.ts`
- `app/client/src/generated/pdas/*.ts`

Integration test:
- `tests/rock-paper-scissors.test.ts`

Frontend runtime:
- `app/src/main.tsx`
- `app/src/App.tsx`
- `app/src/context/*.tsx`
- `app/src/services/*.ts`
- `app/src/hooks/useGameState.ts`
- `app/src/pages/*.tsx`
- `app/src/components/**/*`

Tooling/config:
- `Anchor.toml`
- `package.json`
- `codama.json`
- `vitest.config.ts`
- `tsconfig.json`

## 14. If You Need to Extend the System

Examples:

- Add new instruction:
  1. Implement in Rust + export in `instructions.rs` + route in `lib.rs`.
  2. Rebuild + regenerate client.
  3. Add/adjust integration test path.
  4. Add service method(s) and UI wiring.

- Add new account field:
  1. Update `state.rs` and handler mutation points.
  2. Rebuild/regenerate to update TS codecs/types.
  3. Update decoders/assertions in tests and any frontend mappings.

- Add leaderboard:
  1. Decide whether data is derived from game accounts or separate account index.
  2. Add query APIs in real service implementation.
  3. Replace placeholder `LeaderboardPage` skeleton with actual data flow.

- Add Week 3 verifiable randomness mode:
  1. Add randomness source integration and proof-verification surfaces.
  2. Introduce single-player mode state transitions without breaking multiplayer flow.
  3. Extend generated types/service mappings for new result metadata.

- Add Week 4 session key support:
  1. Define session authorization boundaries and expiry/revocation model.
  2. Update service transaction pipeline to use session signer where allowed.
  3. Ensure sensitive operations can still require full wallet signatures when needed.

- Add Week 5 magic actions:
  1. Identify post-commit/undelegate base-layer side effects.
  2. Add deterministic action wiring and error handling for chained operations.
  3. Expand tests to validate cross-layer post-action outcomes.

- Add Week 6 private wagers:
  1. Add wager state and escrow/payment flows with privacy constraints.
  2. Preserve participant confidentiality while exposing enough data for settlement proofs.
  3. Add integration tests for happy path, tie path, and failure/refund behavior.

This architecture intentionally separates concerns between program semantics, generated client typing, integration orchestration, and UI state UX. Keep those boundaries clear when making changes.
