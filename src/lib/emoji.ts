export const FOOD_EMOJI = [
  '🍳',
  '🥚',
  '🥓',
  '🥞',
  '🧇',
  '🥐',
  '🍞',
  '🥖',
  '🥯',
  '🧈',
  '🥩',
  '🍗',
  '🍖',
  '🌭',
  '🍔',
  '🍟',
  '🍕',
  '🥪',
  '🌮',
  '🌯',
  '🥙',
  '🧆',
  '🥘',
  '🍲',
  '🍜',
  '🍝',
  '🍛',
  '🍣',
  '🍤',
  '🐟',
  '🦐',
  '🦀',
  '🥗',
  '🥬',
  '🥦',
  '🥕',
  '🌽',
  '🥔',
  '🍠',
  '🧅',
  '🍅',
  '🥒',
  '🫑',
  '🍄',
  '🫘',
  '🥜',
  '🌰',
  '🧀',
  '🥛',
  '🍶',
  '🍎',
  '🍌',
  '🍓',
  '🫐',
  '🍇',
  '🍊',
  '🍋',
  '🍉',
  '🍑',
  '🥭',
  '🍍',
  '🥑',
  '🥥',
  '🍐',
  '🍒',
  '🥝',
  '🍿',
  '🍪',
  '🍫',
  '🍬',
  '🍩',
  '🍰',
  '🧁',
  '🍦',
  '🍯',
  '☕',
  '🍵',
  '🥤',
  '🧃',
  '🍺',
  '🥃',
  '🍷',
  '💊',
  '🥫',
  '🍱',
  '🍚',
  '🥟',
  '🧋',
  '🫖',
  '🧊',
] as const

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

// A single emoji can be many code points (skin tones, ZWJ sequences), so
// length checks are useless here — count grapheme clusters instead.
export function countGraphemes(value: string): number {
  if (!segmenter) return [...value].length

  return [...segmenter.segment(value)].length
}

export function normalizeEmoji(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

export function isValidEmoji(value: string | null): boolean {
  return (
    value === null || (countGraphemes(value) === 1 && !/^[\w\s]$/.test(value))
  )
}
