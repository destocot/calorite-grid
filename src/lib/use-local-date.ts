import { useEffect, useState } from 'react'

import { localDateString } from './local-date'

// An installed PWA is resumed, not reloaded, so the day has to be re-read
// rather than captured once on mount.
export function useLocalDate(): string {
  const [localDate, setLocalDate] = useState(localDateString)

  useEffect(() => {
    const sync = () => setLocalDate(localDateString())

    const interval = setInterval(sync, 30_000)
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return localDate
}
