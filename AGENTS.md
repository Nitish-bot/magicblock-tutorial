# AGENTS.md

## Repo Notes

- This repo is an Anchor program for MagicBlock ephemeral rollups.
- The generated Codama client lives under `app/client/src/generated`.
- Do not hand-edit generated client files. Update source IDL/Codama inputs and rerun `bun run generate`.

## PDA Conventions

- `Game` PDA seeds: `["game", game_id_le_bytes]`
- `PlayerChoice` PDA seeds: `["choice", player_pubkey, game_id_le_bytes]`
- Keep this exact order consistent across:
  - Anchor account constraints
  - Codama PDA generation
  - `invoke_signed` calls in CPIs
  - MagicBlock permission/delegation helpers

## Test Conventions

- Main integration test: `tests/mb.test.ts`
- The test uses the generated Codama client plus `@magicblock-labs/ephemeral-rollups-kit`.
- It is written to run against both localnet and devnet.

## Environment

- `CLUSTER=localnet` or `CLUSTER=devnet`
- Optional base RPC overrides:
  - `BASE_URL`
  - `BASE_WS_URL`
- Required for ephemeral rollup access:
  - `EPHEMERAL_URL`
  - `EPHEMERAL_WS_URL`
- Optional validator override:
  - `ER_VALIDATOR`
- Signer inputs:
  - `AUTHORITY_BYTES` optional; on devnet the default authority falls back to `~/.config/solana/id.json`
  - `P1B` required on devnet
  - `P2B` required on devnet
- If using a TEE ephemeral endpoint, `P1B` and `P2B` must be present because the test requests auth tokens with detached signatures.

## Commands

- Generate client: `bun run generate`
- Local test file: `bun test --timeout 1000000 tests/mb.test.ts`
- Devnet test file: `CLUSTER=devnet bun test --timeout 1000000 tests/mb.test.ts`
- Anchor test wrapper: `bun run test`
- Anchor devnet wrapper: `bun run test:devnet`

## Review Checklist

- When changing `reveal_winner`, verify the winner is committed back to the base layer and all delegated accounts undelegate cleanly.
- When changing seeds, update both the Rust program and generated client expectations.
- When changing tests, prefer real state assertions over transaction-only success checks.
