/**
 * Taiti Scoring System
 * Formula: (X - N + N*5) * multiplier
 * X = cards left, N = number of "2" cards
 * Multiplier: 13 cards = 4x, 9-12 = 3x, 5-8 = 2x, 1-4 = 1x
 */

export function getMultiplier(cardsLeft: number): number {
  if (cardsLeft === 13) return 4
  if (cardsLeft >= 9) return 3
  if (cardsLeft >= 5) return 2
  return 1
}

export function calculatePoints(cardsLeft: number, twosLeft: number): { points: number; multiplier: number } {
  const multiplier = getMultiplier(cardsLeft)
  const points = (cardsLeft - twosLeft + twosLeft * 5) * multiplier
  return { points, multiplier }
}

export const WINNER_POINTS = -10
export const MAX_PLAYERS = 4
export const FUTURE_MAX_PLAYERS = 3
