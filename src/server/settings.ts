import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { users } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'

export const getCalorieGoal = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const [row] = await db
      .select({ calorieGoal: users.calorieGoal })
      .from(users)
      .where(eq(users.id, context.user.id))

    return { calorieGoal: row?.calorieGoal ?? null }
  })

export const setCalorieGoal = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    z.object({ calorieGoal: z.number().int().min(0).max(20000).nullable() }),
  )
  .handler(async ({ data, context }) => {
    await db
      .update(users)
      .set({ calorieGoal: data.calorieGoal })
      .where(eq(users.id, context.user.id))

    return { calorieGoal: data.calorieGoal }
  })
