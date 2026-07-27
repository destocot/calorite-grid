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

  if (data.foods.length === 0) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-6 px-8">
        <p className="text-center text-neutral-500">
          No foods on the grid yet.
        </p>
        <Link
          to="/foods"
          className="h-14 rounded-2xl bg-neutral-100 px-8 text-lg leading-[3.5rem] font-medium text-neutral-950"
        >
          Add food
        </Link>
      </main>
    )
  }

  const columns = columnsFor(data.foods.length)

  return (
    <main className="flex h-full flex-col gap-2 p-2">
      <header className="flex shrink-0 items-start justify-between px-3 py-1">
        <div className="flex flex-col">
          <span className="text-4xl leading-none font-semibold tabular-nums">
            {data.total}
          </span>
          <span className="mt-1 text-xs text-neutral-500">
            {formatLocalDate(localDate)}
          </span>
        </div>

        <nav className="flex items-center gap-1 text-xs text-neutral-500">
          <Link to="/history" className="p-2">
            History
          </Link>
          <Link to="/foods" className="p-2">
            Foods
          </Link>
          <Link to="/settings" className="p-2">
            Settings
          </Link>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 items-center overflow-y-auto">
        <div
          className="grid w-full gap-2"
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
                onClick={() => toggle.mutate(food.id)}
                className={`flex aspect-[2/3] flex-col items-center justify-center gap-1 rounded-3xl p-3 transition-[background-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.96] ${
                  logged
                    ? 'bg-neutral-100 text-neutral-950 shadow-[0_0_40px_-8px_rgba(255,255,255,0.45)]'
                    : 'bg-neutral-900 text-neutral-500'
                }`}
              >
                {food.emoji && (
                  <span className="text-3xl leading-none">{food.emoji}</span>
                )}
                <span className="text-center text-lg leading-tight font-medium text-balance">
                  {food.name}
                </span>
                <span className="text-sm tabular-nums opacity-60">
                  {food.calories}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )
}
