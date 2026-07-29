export const localDateString = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// new Date('2026-07-27') parses as UTC midnight, which lands on the previous
// day for anyone behind it. Build the date from parts instead.
export const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number)

  if (year === undefined || month === undefined || day === undefined) {
    return new Date(Number.NaN)
  }

  return new Date(year, month - 1, day)
}

export const formatLocalDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  },
): string => {
  const date = parseLocalDate(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, options)
}