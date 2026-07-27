import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

import type { FormEvent } from 'react'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: '/' })
    }
  },
  component: SignUpPage,
})

const fieldClass =
  'h-14 rounded-2xl bg-neutral-900 px-5 text-lg outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-neutral-600'

function SignUpPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setPending(true)

    const result = await authClient.signUp.email({
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
    await router.navigate({ to: '/' })
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
          onChange={(event) => setUsername(event.target.value)}
          required
          minLength={3}
          maxLength={30}
          className={fieldClass}
        />

        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className={fieldClass}
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
          Create account
        </button>
      </form>

      <Link
        to="/login"
        search={{ redirect: '/' }}
        className="mt-8 text-center text-sm text-neutral-500"
      >
        I already have an account
      </Link>
    </main>
  )
}
