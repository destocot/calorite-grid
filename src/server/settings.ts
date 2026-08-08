import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { users } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'

const calories = z.number().int().min(0).max(20000)

export const getSettings = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [row] = await db
      .select({
        calorieGoal: users.calorieGoal,
        gymCalories: users.gymCalories,
      })
      .from(users)
      .where(eq(users.id, context.user.id))

    return {
      calorieGoal: row?.calorieGoal ?? null,
      gymCalories: row?.gymCalories ?? 0,
    }
  })

// Each field saves on its own, so an omitted key means "leave it alone" while
// an explicit null means "clear it".
export const setSettings = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({
      calorieGoal: calories.nullable().optional(),
      gymCalories: calories.optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    if (Object.keys(data).length === 0) return data

    await db.update(users).set(data).where(eq(users.id, context.user.id))

    return data
  })
