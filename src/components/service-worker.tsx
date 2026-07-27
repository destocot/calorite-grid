import { useEffect } from 'react'

export function ServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.register('/sw.js')
  }, [])

  return null
}
