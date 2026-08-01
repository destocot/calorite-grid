import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

import { formatLocalDate, localDateString } from '#/lib/local-date'
import { formatMultiplier } from '#/lib/servings'
import { getHistory } from '#/server/history'

const HistoryPage = () => {
  const today = localDateString()
  const { data: days } = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(),
  })

  const maxTotal = days?.reduce((max, day) => Math.max(max, day.total), 0) ?? 0
  const average = days?.length
    ? Math.round(days.reduce((sum, day) => sum + day.total, 0) / days.length)
    : 0

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

      {days && days.length > 0 && (
        <section className="panel mb-4 grid grid-cols-2">
          <div className="px-4 py-3">
            <p className="eyebrow">Days logged</p>
            <p className="numeral mt-1.5 text-2xl leading-none font-bold tracking-[-0.02em]">
              {days.length}
            </p>
          </div>
          <div className="border-line border-l px-4 py-3">
            <p className="eyebrow">Avg / day</p>
            <p className="numeral mt-1.5 text-2xl leading-none font-bold tracking-[-0.02em]">
              {average.toLocaleString()}
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {days?.map((day) => (
          <section key={day.localDate} className="panel overflow-hidden">
            <div className="flex items-baseline justify-between px-4 pt-3.5">
              <h2 className="text-sm font-semibold">
                {day.localDate === today
                  ? 'Today'
                  : formatLocalDate(day.localDate, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
              </h2>
              <span className="numeral text-[1.75rem] leading-none font-bold tracking-[-0.02em]">
                {day.total.toLocaleString()}
                <span className="eyebrow ml-1.5">cal</span>
              </span>
            </div>

            <div className="bg-line mx-4 mt-3 h-px">
              <div
                className="bg-paper h-full"
                style={{
                  width:
                    maxTotal > 0 ? `${(day.total / maxTotal) * 100}%` : '0%',
                }}
              />
            </div>

            <ul className="px-4 py-2.5">
              {day.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 py-1">
                  <span className="w-5 shrink-0 text-center text-base">
                    {item.emoji ?? ''}
                  </span>
                  <span className="text-ink/85 min-w-0 flex-1 truncate text-sm">
                    {item.name}
                  </span>
                  {item.multiplier !== 1 && (
                    <span className="numeral text-faint shrink-0 text-xs">
                      &times;{formatMultiplier(item.multiplier)}
                    </span>
                  )}
                  <span className="numeral text-muted shrink-0 text-sm">
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

export const Route = createFileRoute('/_authenticated/history')({
  ssr: false,
  component: HistoryPage,
})
