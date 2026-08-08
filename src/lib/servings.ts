export const MULTIPLIERS = [1, 2] as const

export const MAX_MULTIPLIER = 20

// Servings are stored to two decimals; finer than that is noise on a number
// that started life as an estimate.
export const roundMultiplier = (value: number): number =>
  Math.round(value * 100) / 100

export const formatMultiplier = (value: number): string =>
  roundMultiplier(value).toString()

export const isMultiplier = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && value <= MAX_MULTIPLIER

export const applyMultiplier = (calories: number, value: number): number =>
  Math.round(calories * value)
