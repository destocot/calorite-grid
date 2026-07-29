import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

import type { SubmitEvent } from 'react'

const sanitizeRedirect = (url: unknown): string => {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    return '/'
  }
  return url
}

export const LoginPage = () => {
  const router = useRouter()
  const search = Route.useSearch()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setPending(true)

    const result = await authClient.signIn.username({ username, password })

    setPending(false)

    if (result.error) {
      setError(result.error.message ?? 'Something went wrong')
      return
    }

    await router.invalidate()
    await router.navigate({ to: search.redirect })
  }

  return (
    <main className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <p className="eyebrow">Calorie Grid</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">
          Sign in
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          name="username"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="control h-14 rounded-(--radius-panel) text-lg"
        />

        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="control h-14 rounded-(--radius-panel) text-lg"
        />

        {error && (
          <p role="alert" className="text-ember text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary h-14 text-lg"
        >
          Sign in
        </button>
      </form>

      <Link to="/signup" className="nav-link mt-8 text-center">
        Create an account
      </Link>
    </main>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: (search) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      throw redirect({ to: search.redirect })
    }
  },
  component: LoginPage,
})
