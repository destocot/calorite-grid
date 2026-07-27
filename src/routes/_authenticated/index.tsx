import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { formatLocalDate } from '#/lib/local-date'
import { useLocalDate } from '#/lib/use-local-date'
import { getGrid, toggleFood } from '#/server/grid'

export const Route = createFileRoute('/_authenticated/')({
  ssr: false,
  component: HomePage,
})

type Grid = Awaited<ReturnType<typeof getGrid>>

function columnsFor(count: number): number {
  return Math.max(2, Math.ceil(Math.sqrt(count)))
}

function HomePage() {
  const queryClient = useQueryClient()
  const localDate = useLocalDate()
  const queryKey = ['grid', localDate]

  const { data } = useQuery({
    queryKey,
    queryFn: () => getGrid({ data: { localDate } }),
  })

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
    return <div className="h-full" />
  }

  const columns = columnsFor(data.foods.length)

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
        <div className="flex min-h-0 flex-1 items-center overflow-y-auto py-4">
          <div
            className="grid w-full gap-3"
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
                  onClick={() => toggle.mutate(food.id)}
                  style={{ borderRadius: 'var(--radius-card)' }}
                  className={`flex aspect-[2/3] flex-col items-center justify-center gap-1.5 p-3 transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.95] ${
                    logged
                      ? 'bg-paper text-canvas shadow-[inset_0_0_0_1px_rgba(11,11,12,0.12)]'
                      : 'bg-surface text-muted shadow-[inset_0_0_0_1px_var(--color-line)]'
                  }`}
                >
                  {food.emoji && (
                    <span
                      className={`text-[1.75rem] leading-none transition-opacity duration-200 ${
                        logged ? 'opacity-100' : 'opacity-45'
                      }`}
                    >
                      {food.emoji}
                    </span>
                  )}
                  <span
                    className={`text-center text-[0.9375rem] leading-tight font-semibold text-balance ${
                      logged ? '' : 'text-ink/70'
                    }`}
                  >
                    {food.name}
                  </span>
                  <span className="numeral text-xs opacity-55">
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
