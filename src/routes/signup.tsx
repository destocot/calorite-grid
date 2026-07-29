import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'

import type { FormEvent } from 'react'

const fieldClass = 'control h-14 rounded-[var(--radius-panel)] text-lg'

export const SignUpPage = () => {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
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
      <div className="mb-10 text-center">
        <p className="eyebrow">Calorie Grid</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">
          Create account
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
          <p role="alert" className="text-ember text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary h-14 text-lg"
        >
          Create account
        </button>
      </form>

      <Link
        to="/login"
        search={{ redirect: '/' }}
        className="nav-link mt-8 text-center"
      >
        I already have an account
      </Link>
    </main>
  )
}

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: '/' })
    }
  },
  component: SignUpPage,
})
