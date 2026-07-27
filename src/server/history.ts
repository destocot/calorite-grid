import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq } from 'drizzle-orm'

import { db } from '#/db'
import { entries } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'

interface DayItem {
  id: string
  name: string
  emoji: string | null
  calories: number
}

interface Day {
  localDate: string
  total: number
  items: Array<DayItem>
}

export const getHistory = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const rows = await db
      .select({
        id: entries.id,
        localDate: entries.localDate,
        foodName: entries.foodName,
        foodEmoji: entries.foodEmoji,
        calories: entries.calories,
      })
      .from(entries)
      .where(eq(entries.userId, context.user.id))
      .orderBy(desc(entries.localDate), asc(entries.createdAt))

    const days = new Map<string, Day>()

    for (const row of rows) {
      const day = days.get(row.localDate) ?? {
        localDate: row.localDate,
        total: 0,
        items: [],
      }

      day.total += row.calories
      day.items.push({
        id: row.id,
        name: row.foodName,
        emoji: row.foodEmoji,
        calories: row.calories,
      })
      days.set(row.localDate, day)
    }

    return [...days.values()]
  })
