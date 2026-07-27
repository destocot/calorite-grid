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
    <main className="flex min-h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="mb-5 flex shrink-0 items-center justify-between">
        <Link to="/" className="nav-link -ml-2">
          Back
        </Link>
        <p className="eyebrow">History</p>
      </header>

      {days?.length === 0 && (
        <p className="text-faint mt-16 text-center text-sm">
          Nothing logged yet.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {days?.map((day) => (
          <section key={day.localDate} className="panel overflow-hidden">
            <div className="flex items-end justify-between px-4 pt-3 pb-2">
              <h2 className="eyebrow">
                {day.localDate === today
                  ? 'Today'
                  : formatLocalDate(day.localDate, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
              </h2>
              <span className="numeral text-2xl leading-none font-bold tracking-[-0.02em]">
                {day.total.toLocaleString()}
              </span>
            </div>

            <ul className="rule mx-4 py-2">
              {day.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 py-1">
                  <span className="w-5 text-center text-base">
                    {item.emoji ?? ''}
                  </span>
                  <span className="text-ink/85 min-w-0 flex-1 truncate text-sm">
                    {item.name}
                  </span>
                  <span className="numeral text-muted text-sm">
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
