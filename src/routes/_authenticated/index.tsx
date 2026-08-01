import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { OneOffSheet } from '#/components/one-off-sheet'
import { formatLocalDate } from '#/lib/local-date'
import { MULTIPLIERS, applyMultiplier, formatMultiplier } from '#/lib/servings'
import { useLocalDate } from '#/lib/use-local-date'
import {
  addOneOff,
  getGrid,
  removeEntry,
  setMultiplier,
  toggleFood,
} from '#/server/grid'

import type { OneOffValues } from '#/components/one-off-sheet'
import type { MouseEvent, PointerEvent } from 'react'

const TAP_SLOP = 10

interface GridOrder {
  localDate: string
  ids: Array<string>
}

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
  const [adding, setAdding] = useState(false)

  const orderRef = useRef<GridOrder | null>(null)
  const pressRef = useRef<{ x: number; y: number } | null>(null)

  const beginPress = (event: PointerEvent) => {
    pressRef.current = { x: event.clientX, y: event.clientY }
  }

  // A drag that scrolls the grid must not also toggle whatever it started on.
  const isTap = (event: MouseEvent): boolean => {
    const start = pressRef.current
    pressRef.current = null
    if (!start) return true

    return (
      Math.abs(event.clientX - start.x) < TAP_SLOP &&
      Math.abs(event.clientY - start.y) < TAP_SLOP
    )
  }

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

  const addExtra = useMutation({
    mutationFn: (values: OneOffValues) =>
      addOneOff({ data: { ...values, localDate } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const removeExtra = useMutation({
    mutationFn: (id: string) => removeEntry({ data: { id, localDate } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Grid>(queryKey)

      queryClient.setQueryData<Grid>(queryKey, (current) => {
        if (!current) return current

        const extra = current.extras.find((item) => item.id === id)
        if (!extra) return current

        return {
          ...current,
          extras: current.extras.filter((item) => item.id !== id),
          total: current.total - extra.calories,
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

  const columns = columnsFor(data.foods.length + data.extras.length + 1)
  const dense = columns > 2

  // Logged foods float up, but only on the first paint of a day. Re-sorting on
  // every tap would slide the grid out from under the thumb mid-tap.
  if (orderRef.current?.localDate !== localDate) {
    orderRef.current = {
      localDate,
      ids: [...data.foods]
        .sort(
          (a, b) =>
            Number(b.id in data.logged) - Number(a.id in data.logged),
        )
        .map((food) => food.id),
    }
  }

  const overGoal =
    data.calorieGoal !== null && data.total > data.calorieGoal

  const rank = new Map(orderRef.current.ids.map((id, index) => [id, index]))
  const orderedFoods = [...data.foods].sort(
    (a, b) =>
      (rank.get(a.id) ?? rank.size) - (rank.get(b.id) ?? rank.size),
  )

  return (
    <main className="flex h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <header className="shrink-0">
        <p className="eyebrow">Calories today</p>
        <div className="rule mt-2 flex items-end justify-between pt-2">
          <span
            className={`numeral text-[3.25rem] leading-[0.95] font-extrabold tracking-[-0.03em] transition-colors duration-300 ${
              overGoal ? 'text-ember' : ''
            }`}
          >
            {data.total.toLocaleString()}
          </span>
          <div className="flex flex-col items-end pb-1">
            <span className="text-muted text-xs">
              {formatLocalDate(localDate)}
            </span>
            {data.calorieGoal !== null && (
              <span
                className={`numeral text-xs ${overGoal ? 'text-ember' : 'text-faint'}`}
              >
                of {data.calorieGoal.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="rule mt-2" />
      </header>

      {data.foods.length === 0 && data.extras.length === 0 ? (
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
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="nav-link"
          >
            Or log something one-off
          </button>
        </div>
      ) : (
        <div className="no-scrollbar flex min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-4">
          <div
            className={`m-auto grid w-full ${dense ? 'gap-2.5' : 'gap-3'}`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {data.extras.map((extra) => (
              <button
                key={extra.id}
                type="button"
                aria-label={`Remove ${extra.name}`}
                onPointerDown={beginPress}
                onClick={(event) => {
                  if (!isTap(event)) return

                  buzz()
                  setStamped(extra.id)
                  removeExtra.mutate(extra.id)
                }}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget) setStamped(null)
                }}
                style={{ borderRadius: 'var(--radius-card)' }}
                className={`ease-punch bg-paper/8 text-paper/85 border-paper/30 flex aspect-2/3 flex-col items-center justify-between overflow-hidden border border-dashed p-2.5 transition-[background-color,border-color] duration-200 active:scale-[0.95] ${
                  stamped === extra.id ? 'animate-stamp' : ''
                }`}
              >
                <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
                  <span
                    className={`${dense ? 'text-[1.625rem]' : 'text-[2.25rem]'} leading-none opacity-75 ${
                      stamped === extra.id ? 'animate-pop' : ''
                    }`}
                  >
                    {extra.emoji}
                  </span>
                  <span
                    className={`line-clamp-3 text-center leading-[1.15] font-semibold wrap-break-word hyphens-auto ${
                      dense ? 'text-[0.8125rem]' : 'text-[1.0625rem]'
                    }`}
                  >
                    {extra.name}
                  </span>
                </span>
                <span className="numeral shrink-0 text-[0.6875rem] font-medium tracking-wide opacity-50">
                  {extra.calories}
                </span>
              </button>
            ))}

            {orderedFoods.map((food) => {
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
                    onPointerDown={beginPress}
                    onClick={(event) => {
                      if (!isTap(event)) return

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
                            onPointerDown={beginPress}
                            onClick={(event) => {
                              if (!isTap(event)) return

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

            <button
              type="button"
              aria-label="Add a one-off food"
              onClick={() => setAdding(true)}
              style={{ borderRadius: 'var(--radius-card)' }}
              className="ease-punch text-paper/35 border-paper/18 hover:text-paper/60 grid aspect-2/3 place-items-center border border-dashed transition-colors duration-200 active:scale-[0.95]"
            >
              <span className="text-2xl leading-none">+</span>
            </button>
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

      {adding && (
        <OneOffSheet
          onAdd={(values) => addExtra.mutate(values)}
          onClose={() => setAdding(false)}
        />
      )}
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
