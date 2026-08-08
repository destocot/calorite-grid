import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { authClient } from '#/lib/auth-client'
import { getSettings, setSettings } from '#/server/settings'

import type { SubmitEvent } from 'react'

type Settings = Awaited<ReturnType<typeof getSettings>>

// Blank clears the value; anything unparseable is a typo, not an instruction.
const parseCalories = (value: string): number | null | undefined => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? Math.round(parsed) : undefined
}

const SettingsPage = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = Route.useRouteContext()

  const queryKey = ['settings']
  const { data } = useQuery({ queryKey, queryFn: () => getSettings() })

  const [goal, setGoal] = useState('')
  const [gym, setGym] = useState('')

  useEffect(() => {
    if (!data) return

    setGoal(data.calorieGoal?.toString() ?? '')
    setGym(data.gymCalories === 0 ? '' : data.gymCalories.toString())
  }, [data])

  const save = useMutation({
    mutationFn: (values: Partial<Settings>) => setSettings({ data: values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['grid'] })
    },
  })

  const submitGoal = (event: SubmitEvent) => {
    event.preventDefault()

    const calorieGoal = parseCalories(goal)
    if (calorieGoal === undefined) return

    save.mutate({ calorieGoal })
  }

  const submitGym = (event: SubmitEvent) => {
    event.preventDefault()

    const gymCalories = parseCalories(gym)
    if (gymCalories === undefined) return

    // Blank is the off switch; zero disables the toggle on the grid.
    save.mutate({ gymCalories: gymCalories ?? 0 })
  }

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

      <form onSubmit={submitGoal} className="panel mb-3 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Daily goal</span>
          <span className="text-faint text-xs">
            {data?.calorieGoal === null ? 'Not set' : 'Leave blank to clear'}
          </span>
        </div>

        <div className="mt-3 flex gap-2.5">
          <input
            placeholder="Calories"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            className="control numeral min-w-0 flex-1 text-center"
          />
          <button
            type="submit"
            disabled={save.isPending}
            className="btn btn-primary px-6"
          >
            Save
          </button>
        </div>
      </form>

      <form onSubmit={submitGym} className="panel mb-3 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Gym session</span>
          <span className="text-faint text-xs">Leave blank to turn off</span>
        </div>

        <p className="text-muted mt-2 text-xs">
          Subtracted from your day when you toggle Gym on.
        </p>

        <div className="mt-3 flex gap-2.5">
          <input
            placeholder="Calories"
            value={gym}
            onChange={(event) => setGym(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            className="control numeral min-w-0 flex-1 text-center"
          />
          <button
            type="submit"
            disabled={save.isPending}
            className="btn btn-primary px-6"
          >
            Save
          </button>
        </div>
      </form>

      <button type="button" onClick={signOut} className="btn btn-danger">
        Sign out
      </button>
    </main>
  )
}

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})
