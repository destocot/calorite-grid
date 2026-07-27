import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { entries, foods } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'

const localDate = z.iso.date()

export const getGrid = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ localDate }))
  .handler(async ({ data, context }) => {
    const [gridFoods, logged] = await Promise.all([
      db
        .select({
          id: foods.id,
          name: foods.name,
          calories: foods.calories,
        })
        .from(foods)
        .where(
          and(eq(foods.userId, context.user.id), eq(foods.showOnGrid, true)),
        )
        .orderBy(asc(foods.sortOrder), asc(foods.createdAt)),
      db
        .select({ foodId: entries.foodId, calories: entries.calories })
        .from(entries)
        .where(
          and(
            eq(entries.userId, context.user.id),
            eq(entries.localDate, data.localDate),
          ),
        ),
    ])

    return {
      foods: gridFoods,
      loggedFoodIds: logged.map((entry) => entry.foodId),
      total: logged.reduce((sum, entry) => sum + entry.calories, 0),
    }
  })

export const toggleFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ foodId: z.uuid(), localDate }))
  .handler(async ({ data, context }) => {
    const [food] = await db
      .select({ name: foods.name, calories: foods.calories })
      .from(foods)
      .where(and(eq(foods.id, data.foodId), eq(foods.userId, context.user.id)))

    if (!food) {
      throw new Error('Food not found')
    }

    const removed = await db
      .delete(entries)
      .where(
        and(
          eq(entries.userId, context.user.id),
          eq(entries.foodId, data.foodId),
          eq(entries.localDate, data.localDate),
        ),
      )
      .returning({ id: entries.id })

    if (removed.length > 0) {
      return { logged: false }
    }

    await db.insert(entries).values({
      userId: context.user.id,
      foodId: data.foodId,
      localDate: data.localDate,
      foodName: food.name,
      calories: food.calories,
    })

    return { logged: true }
  })
