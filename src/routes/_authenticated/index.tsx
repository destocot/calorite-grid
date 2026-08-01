import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { formatLocalDate } from '#/lib/local-date'
import { MULTIPLIERS, applyMultiplier, formatMultiplier } from '#/lib/servings'
import { useLocalDate } from '#/lib/use-local-date'
import { getGrid, setMultiplier, toggleFood } from '#/server/grid'

type Grid = Awaited<ReturnType<typeof getGrid>>

interface ServingChange {
  foodId: string
  multiplier: number
}

const columnsFor = (count: number): number =>
  Math.min(3, Math.max(2, Math.ceil(Math.sqrt(count))))

const buzz = () => {
  try {
    navigator.vibrate(12)
  } catch {
    // Safari has no vibrate; haptics are a bonus, never a requirement.
  }
}

const HomePage = () => {
  const queryClient = useQueryClient()
  const localDate = useLocalDate()
  const queryKey = ['grid', localDate]

  const { data } = useQuery({
    queryKey,
    queryFn: () => getGrid({ data: { localDate } }),
  })

  const [stamped, setStamped] = useState<string | null>(null)

  const rollback = (
    _error: unknown,
    _variables: unknown,
    context: { previous: Grid | undefined } | undefined,
  ) => {
    queryClient.setQueryData(queryKey, context?.previous)
  }

  const toggle = useMutation({
    mutationFn: (foodId: string) => toggleFood({ data: { foodId, localDate } }),
    onMutate: async (foodId) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Grid>(queryKey)

      queryClient.setQueryData<Grid>(queryKey, (current) => {
        if (!current) return current

        const food = current.foods.find((item) => item.id === foodId)
        if (!food) return current

        const was = current.logged[foodId]
        const logged = { ...current.logged }

        if (was === undefined) {
          logged[foodId] = 1
        } else {
          delete logged[foodId]
        }

        return {
          ...current,
          logged,
          total:
            was === undefined
              ? current.total + food.calories
              : current.total - applyMultiplier(food.calories, was),
        }
      })

      return { previous }
    },
    onError: rollback,
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const servings = useMutation({
    mutationFn: ({ foodId, multiplier }: ServingChange) =>
      setMultiplier({ data: { foodId, localDate, multiplier } }),
    onMutate: async ({ foodId, multiplier }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Grid>(queryKey)

      queryClient.setQueryData<Grid>(queryKey, (current) => {
        if (!current) return current

        const food = current.foods.find((item) => item.id === foodId)
        const was = current.logged[foodId]
        if (!food || was === undefined) return current

        return {
          ...current,
          logged: { ...current.logged, [foodId]: multiplier },
          total:
            current.total -
            applyMultiplier(food.calories, was) +
            applyMultiplier(food.calories, multiplier),
        }
      })

      return { previous }
    },
    onError: rollback,
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
        <div className="no-scrollbar flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4">
          <div
            className={`m-auto grid w-full ${dense ? 'gap-2.5' : 'gap-3'}`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {data.foods.map((food) => {
              const multiplier = data.logged[food.id]
              const logged = multiplier !== undefined

              return (
                <div
                  key={food.id}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) setStamped(null)
                  }}
                  style={{ borderRadius: 'var(--radius-card)' }}
                  className={`ease-punch relative flex aspect-2/3 overflow-hidden transition-[background-color,color,box-shadow] duration-200 has-[[data-tap]:active]:scale-[0.95] ${
                    stamped === food.id ? 'animate-stamp' : ''
                  } ${
                    logged
                      ? 'bg-paper text-canvas shadow-[inset_0_0_0_1px_rgba(11,11,12,0.14),0_6px_20px_-8px_rgba(240,234,221,0.45)]'
                      : 'bg-raised text-muted shadow-[inset_0_0_0_1px_var(--color-line)]'
                  }`}
                >
                  <button
                    data-tap=""
                    type="button"
                    aria-pressed={logged}
                    aria-label={food.name}
                    onClick={() => {
                      buzz()
                      setStamped(food.id)
                      toggle.mutate(food.id)
                    }}
                    className="absolute inset-0"
                  />

                  <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col p-2.5">
                    <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                      <span
                        className={`${dense ? 'text-[1.625rem]' : 'text-[2.25rem]'} leading-none transition-[filter,opacity] duration-200 ${
                          stamped === food.id ? 'animate-pop' : ''
                        } ${
                          logged
                            ? 'opacity-100 grayscale-0'
                            : 'opacity-80 grayscale'
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

                    <span className="numeral shrink-0 text-center text-[0.6875rem] font-medium tracking-wide opacity-60">
                      {logged
                        ? applyMultiplier(food.calories, multiplier)
                        : food.calories}
                    </span>

                    {logged && (
                      <div className="bg-canvas/12 pointer-events-auto mt-1.5 flex shrink-0 gap-0.5 rounded-full p-0.5">
                        {MULTIPLIERS.map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={multiplier === value}
                            aria-label={`${formatMultiplier(value)} serving`}
                            onClick={() => {
                              buzz()
                              servings.mutate({
                                foodId: food.id,
                                multiplier: value,
                              })
                            }}
                            className={`numeral min-w-0 flex-1 rounded-full py-1 text-[0.6875rem] leading-none font-semibold transition-colors duration-150 ${
                              multiplier === value
                                ? 'bg-canvas text-paper'
                                : 'text-canvas/55'
                            }`}
                          >
                            {formatMultiplier(value)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

const GridSkeleton = ({ localDate }: Readonly<{ localDate: string }>) => {
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

export const Route = createFileRoute('/_authenticated/')({
  ssr: false,
  component: HomePage,
})
