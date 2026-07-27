import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

import type { FormEvent } from 'react'

function sanitizeRedirect(url: unknown): string {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    return '/'
  }
  return url
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

function LoginPage() {
  const router = useRouter()
  const search = Route.useSearch()

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)

    const result =
      mode === 'signIn'
        ? await authClient.signIn.username({ username, password })
        : await authClient.signUp.email({
            email: `${username}@calorie.local`,
            name: username,
            username,
            password,
          })

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
      <h1 className="mb-10 text-center text-3xl font-semibold tracking-tight">
        Calorie Grid
      </h1>

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
          className="h-14 rounded-2xl bg-neutral-900 px-5 text-lg outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-neutral-600"
        />

        <input
          name="password"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="h-14 rounded-2xl bg-neutral-900 px-5 text-lg outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-neutral-600"
        />

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="h-14 rounded-2xl bg-neutral-100 text-lg font-medium text-neutral-950 transition-opacity active:opacity-60 disabled:opacity-40"
        >
          {mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn')
          setError('')
        }}
        className="mt-8 text-sm text-neutral-500"
      >
        {mode === 'signIn' ? 'Create an account' : 'I already have an account'}
      </button>
    </main>
  )
}
