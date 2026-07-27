import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { formatLocalDate, localDateString } from '#/lib/local-date'
import { getHistory } from '#/server/history'

export const Route = createFileRoute('/_authenticated/history')({
  ssr: false,
  component: HistoryPage,
})

function HistoryPage() {
  const today = localDateString()
  const { data: days } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(),
  })

  return (
    <main className="flex min-h-full flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <Link to="/" className="p-2 text-sm text-neutral-500">
          Back
        </Link>
        <span className="p-2 text-sm text-neutral-500">History</span>
      </header>

      {days?.length === 0 && (
        <p className="mt-8 text-center text-neutral-600">Nothing logged yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {days?.map((day) => (
          <section
            key={day.localDate}
            className="overflow-hidden rounded-2xl bg-neutral-900"
          >
            <div className="flex items-baseline justify-between border-b border-neutral-800 px-4 py-3">
              <h2 className="text-sm text-neutral-400">
                {day.localDate === today
                  ? 'Today'
                  : formatLocalDate(day.localDate)}
              </h2>
              <span className="text-xl font-semibold tabular-nums">
                {day.total}
              </span>
            </div>

            <ul className="py-1">
              {day.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 px-4 py-1">
                  {item.emoji && (
                    <span className="text-base">{item.emoji}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {item.name}
                  </span>
                  <span className="text-sm tabular-nums text-neutral-500">
                    {item.calories}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
