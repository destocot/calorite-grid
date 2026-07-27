import { createFileRoute, useRouter } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const router = useRouter()
  const { user } = Route.useRouteContext()

  return (
    <main className="flex min-h-full flex-col justify-center gap-6 px-6">
      <p className="text-center text-neutral-400">
        Signed in as {user.username ?? user.name}
      </p>

      <button
        type="button"
        onClick={async () => {
          await authClient.signOut()
          await router.invalidate()
          await router.navigate({ to: '/login', search: { redirect: '/' } })
        }}
        className="h-14 rounded-2xl bg-neutral-900 text-lg active:opacity-60"
      >
        Sign out
      </button>
    </main>
  )
}
