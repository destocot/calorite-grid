import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'

const SettingsPage = () => {
  const router = useRouter()
  const { user } = Route.useRouteContext()

  const signOut = async () => {
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/login', search: { redirect: '/' } })
  }

  return (
    <main className="flex min-h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="mb-5 flex shrink-0 items-center justify-between">
        <Link to="/" className="nav-link -ml-2">
          Back
        </Link>
        <p className="eyebrow">Settings</p>
      </header>

      <div className="panel mb-3 flex items-center justify-between px-4 py-3.5">
        <span className="eyebrow">Account</span>
        <span className="truncate text-sm font-medium">
          {user.username ?? user.name}
        </span>
      </div>

      <button type="button" onClick={signOut} className="btn btn-danger">
        Sign out
      </button>
    </main>
  )
}

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})
