import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { authClient } from '#/lib/auth-client'
import { getCalorieGoal, setCalorieGoal } from '#/server/settings'

import type { SubmitEvent } from 'react'

const SettingsPage = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = Route.useRouteContext()

  const queryKey = ['calorie-goal']
  const { data } = useQuery({ queryKey, queryFn: () => getCalorieGoal() })

  const [goal, setGoal] = useState('')

  useEffect(() => {
    if (data) setGoal(data.calorieGoal?.toString() ?? '')
  }, [data])

  const save = useMutation({
    mutationFn: (calorieGoal: number | null) =>
      setCalorieGoal({ data: { calorieGoal } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
      void queryClient.invalidateQueries({ queryKey: ['grid'] })
    },
  })

  const submit = (event: SubmitEvent) => {
    event.preventDefault()

    const trimmed = goal.trim()
    if (!trimmed) {
      save.mutate(null)
      return
    }

    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return

    save.mutate(Math.round(parsed))
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

      <form onSubmit={submit} className="panel mb-3 px-4 py-3.5">
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

      <button type="button" onClick={signOut} className="btn btn-danger">
        Sign out
      </button>
    </main>
  )
}

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})
