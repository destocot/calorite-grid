import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const router = useRouter()
  const { user } = Route.useRouteContext()

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/login', search: { redirect: '/' } })
  }

  return (
    <main className="flex min-h-full flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <Link to="/" className="p-2 text-sm text-neutral-500">
          Back
        </Link>
        <span className="p-2 text-sm text-neutral-500">Settings</span>
      </header>

      <div className="flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3">
        <span className="text-sm text-neutral-500">Signed in as</span>
        <span className="truncate">{user.username ?? user.name}</span>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="h-12 rounded-xl bg-neutral-900 text-red-400 active:opacity-60"
      >
        Sign out
      </button>
    </main>
  )
}
