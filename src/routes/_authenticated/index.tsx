import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { formatLocalDate } from '#/lib/local-date'
import { useLocalDate } from '#/lib/use-local-date'
import { getGrid, toggleFood } from '#/server/grid'

export const Route = createFileRoute('/_authenticated/')({
  ssr: false,
  component: HomePage,
})

type Grid = Awaited<ReturnType<typeof getGrid>>

function columnsFor(count: number): number {
  return Math.min(3, Math.max(2, Math.ceil(Math.sqrt(count))))
}

function buzz() {
  try {
    navigator.vibrate(12)
  } catch {
    // Safari has no vibrate; haptics are a bonus, never a requirement.
  }
}

function HomePage() {
  const queryClient = useQueryClient()
  const localDate = useLocalDate()
  const queryKey = ['grid', localDate]

  const { data } = useQuery({
    queryKey,
    queryFn: () => getGrid({ data: { localDate } }),
  })

  const [stamped, setStamped] = useState<string | null>(null)

  const toggle = useMutation({
    mutationFn: (foodId: string) => toggleFood({ data: { foodId, localDate } }),
    onMutate: async (foodId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Grid>(queryKey)

      queryClient.setQueryData<Grid>(queryKey, (current) => {
        if (!current) return current

        const food = current.foods.find((item) => item.id === foodId)
        if (!food) return current

        const wasLogged = current.loggedFoodIds.includes(foodId)

        return {
          ...current,
          loggedFoodIds: wasLogged
            ? current.loggedFoodIds.filter((id) => id !== foodId)
            : [...current.loggedFoodIds, foodId],
          total: wasLogged
            ? current.total - food.calories
            : current.total + food.calories,
        }
      })

      return { previous }
    },
    onError: (_error, _foodId, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  if (!data) {
    return <GridSkeleton localDate={localDate} />
  }

  const columns = columnsFor(data.foods.length)
  const dense = columns > 2

  return (
    <main className="flex h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <header className="shrink-0">
        <p className="eyebrow">Calories today</p>
        <div className="rule mt-2 flex items-end justify-between pt-2">
          <span className="numeral text-[3.25rem] leading-[0.95] font-extrabold tracking-[-0.03em]">
            {data.total.toLocaleString()}
          </span>
          <span className="text-muted pb-1 text-xs">
            {formatLocalDate(localDate)}
          </span>
        </div>
        <div className="rule mt-2" />
      </header>

      {data.foods.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5">
          <p className="text-muted text-center text-sm">
            Nothing on the grid yet.
          </p>
          <Link
            to="/foods"
            className="btn btn-primary grid place-items-center px-7"
          >
            Add your first food
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-y-auto py-4">
          <div
            className={`m-auto grid w-full ${dense ? 'gap-2.5' : 'gap-3'}`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {data.foods.map((food) => {
              const logged = data.loggedFoodIds.includes(food.id)

              return (
                <button
                  key={food.id}
                  type="button"
                  aria-pressed={logged}
                  onClick={() => {
                    buzz()
                    setStamped(food.id)
                    toggle.mutate(food.id)
                  }}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) setStamped(null)
                  }}
                  style={{ borderRadius: 'var(--radius-card)' }}
                  className={`ease-punch flex aspect-2/3 flex-col items-center justify-between overflow-hidden p-2.5 transition-[background-color,color,box-shadow] duration-200 active:scale-[0.95] ${
                    stamped === food.id ? 'animate-stamp' : ''
                  } ${
                    logged
                      ? 'bg-paper text-canvas shadow-[inset_0_0_0_1px_rgba(11,11,12,0.14),0_6px_20px_-8px_rgba(240,234,221,0.45)]'
                      : 'bg-raised text-muted shadow-[inset_0_0_0_1px_var(--color-line)]'
                  }`}
                >
                  <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                    <span
                      className={`${dense ? 'text-[1.625rem]' : 'text-[2.25rem]'} leading-none transition-[filter,opacity] duration-200 ${
                        stamped === food.id ? 'animate-pop' : ''
                      } ${
                        logged ? 'opacity-100 grayscale-0' : 'opacity-80 grayscale'
                      }`}
                    >
                      {food.emoji}
                    </span>
                    <span
                      className={`line-clamp-3 text-center leading-[1.15] font-semibold wrap-break-word hyphens-auto ${
                        dense ? 'text-[0.8125rem]' : 'text-[1.0625rem]'
                      } ${logged ? '' : 'text-ink/75'}`}
                    >
                      {food.name}
                    </span>
                  </span>
                  <span className="numeral shrink-0 text-[0.6875rem] font-medium tracking-wide opacity-60">
                    {food.calories}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <nav className="rule flex shrink-0 items-center justify-around pt-2">
        <Link to="/history" className="nav-link">
          History
        </Link>
        <Link to="/foods" className="nav-link">
          Foods
        </Link>
        <Link to="/settings" className="nav-link">
          Settings
        </Link>
      </nav>
    </main>
  )
}

function GridSkeleton({ localDate }: Readonly<{ localDate: string }>) {
  return (
    <main className="flex h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <header className="shrink-0">
        <p className="eyebrow">Calories today</p>
        <div className="rule mt-2 flex items-end justify-between pt-2">
          <span className="numeral text-faint text-[3.25rem] leading-[0.95] font-extrabold tracking-[-0.03em]">
            &mdash;
          </span>
          <span className="text-muted pb-1 text-xs">
            {formatLocalDate(localDate)}
          </span>
        </div>
        <div className="rule mt-2" />
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden py-4">
        <div className="m-auto grid w-full animate-pulse grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              key={index}
              className="bg-raised/60 aspect-2/3 rounded-(--radius-card)"
            />
          ))}
        </div>
      </div>

      <nav className="rule flex shrink-0 items-center justify-around pt-2">
        <Link to="/history" className="nav-link">
          History
        </Link>
        <Link to="/foods" className="nav-link">
          Foods
        </Link>
        <Link to="/settings" className="nav-link">
          Settings
        </Link>
      </nav>
    </main>
  )
}
