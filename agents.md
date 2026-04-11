# MagicBlock Tutorial Series Agent Guide

This repository is a series of 7 tutorials.
Each week is a Solana dApp written in Anchor and built with products from the MagicBlock ecosystem.

## Series Roadmap

1. Week 1: Ephemeral Rollups and Delegation
- Focus: how delegation to ER works and why it is fast.
- Showcase app: a counter program.
- Goal: demonstrate high-frequency instruction execution (`increment` and `decrement`) on ephemeral rollup.

2. Week 2: Private Ephemeral Rollups, Permissions, and Auth Tokens
- Focus: private state access on ER, permission management, and token-authenticated RPC access.
- Showcase app: Rock Paper Scissors where each player's choice remains hidden while the match is in progress.
- Continuity: from here through Week 6, features are additive to this same project line.

3. Week 3: Verifiable Randomness
- Focus: deterministic and verifiable randomness integration for fair game logic.
- Planned addition: single-player mode where opponent move is generated via verifiable randomness.

4. Week 4: Session Keys
- Focus: uninterrupted on-chain UX without repeated wallet popups.
- Planned addition: best-of-3 mode so players can continue gameplay with fewer signature interruptions.

5. Week 5: Magic Actions
- Focus: post-ER instruction execution on base layer.
- Planned addition: leaderboard that gets updated on every reveal and game account does not need to be delegated.

6. Week 6: Private Payments API
- Focus: private SPL token transfer/trade flows.
- Planned addition: wager support so players can stake tokens on games privately.

7. Week 7: Trustless Digital Arcade (New Project)
- Focus: a fresh multi-game platform rather than another incremental extension.
- Planned app: a trustless digital arcade with games like Battleship, Plinko, and other wager-enabled single/multiplayer experiences.

## Agent Guidance

- Keep tutorial folders aligned with week numbers (`week1/`, `week2/`, etc.).
- Treat each week as a focused product milestone around one MagicBlock capability.
- Preserve continuity from Week 2 to Week 6: avoid redesigns that block incremental feature layering.
- Prefer additive schema/instruction changes and backward-compatible state transitions where possible.
