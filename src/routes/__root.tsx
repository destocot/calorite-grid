import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import { ServiceWorker } from '#/components/service-worker'
import { getSession } from '#/lib/session'
import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#0a0a0a' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      { name: 'apple-mobile-web-app-title', content: 'Calories' },
      { title: 'Calorie Grid' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/icon-192.png' },
      { rel: 'icon', href: '/icon-192.png', type: 'image/png' },
    ],
  }),
  beforeLoad: async () => ({ session: await getSession() }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full bg-neutral-950 text-neutral-100 antialiased select-none">
        <div className="mx-auto h-full w-full max-w-sm">{children}</div>
        <ServiceWorker />
        <Scripts />
      </body>
    </html>
  )
}
