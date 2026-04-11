import type { UIGamePhase } from '@/types/game'
import { Choice } from '@/types/game'

export const CHOICE_META = {
  [Choice.Rock]: {
    label: 'Rock',
    emoji: '🪨',
    beats: Choice.Scissors,
    /** Phosphor icon component name to import from @phosphor-icons/react */
    iconName: 'HandFist' as const,
    glowClass: 'glow-primary',
    colorVar: 'oklch(58% 0.27 292)',
  },
  [Choice.Paper]: {
    label: 'Paper',
    emoji: '📄',
    beats: Choice.Rock,
    iconName: 'Hand' as const,
    glowClass: 'glow-secondary',
    colorVar: 'oklch(82% 0.17 200)',
  },
  [Choice.Scissors]: {
    label: 'Scissors',
    emoji: '✂',
    beats: Choice.Paper,
    iconName: 'Scissors' as const,
    glowClass: 'glow-success',
    colorVar: 'oklch(83% 0.27 140)',
  },
} as const

export const PHASE_MESSAGES: Record<
  UIGamePhase,
  { title: string; subtitle: string } | null
> = {
  lobby: null,
  'waiting-for-opponent': {
    title: 'Waiting for Opponent',
    subtitle: 'Share the game ID to invite a player',
  },
  selecting: {
    title: 'Choose Your Weapon',
    subtitle: 'Select Rock, Paper, or Scissors',
  },
  'awaiting-confirmation': {
    title: 'Submitting to Chain',
    subtitle: 'Your choice is being committed…',
  },
  revealing: {
    title: 'Revealing Winner',
    subtitle: 'The chain is computing the result…',
  },
  result: null,
}

export const ALL_CHOICES = [Choice.Rock, Choice.Paper, Choice.Scissors] as const
