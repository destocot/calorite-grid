export const MULTIPLIERS = [0.5, 1, 2] as const

export type Multiplier = (typeof MULTIPLIERS)[number]

const LABELS: Record<number, string> = {
  0.5: '½',
  1: '1',
  2: '2',
}

export const formatMultiplier = (value: number): string =>
  LABELS[value] ?? String(value)

export const isMultiplier = (value: number): value is Multiplier =>
  MULTIPLIERS.includes(value as Multiplier)

export const applyMultiplier = (calories: number, value: number): number =>
  Math.round(calories * value)
