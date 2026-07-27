import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { foods } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'

const foodInput = z.object({
  name: z.string().trim().min(1).max(40),
  calories: z.number().int().min(0).max(10000),
  showOnGrid: z.boolean(),
})

export const listFoods = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) =>
    db
      .select({
        id: foods.id,
        name: foods.name,
        calories: foods.calories,
        showOnGrid: foods.showOnGrid,
      })
      .from(foods)
      .where(eq(foods.userId, context.user.id))
      .orderBy(asc(foods.sortOrder), asc(foods.createdAt)),
  )

export const createFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(foodInput)
  .handler(async ({ data, context }) => {
    const [created] = await db
      .insert(foods)
      .values({ ...data, userId: context.user.id })
      .returning({ id: foods.id })

    return created
  })

export const updateFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(foodInput.extend({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    const { id, ...values } = data

    const updated = await db
      .update(foods)
      .set(values)
      .where(and(eq(foods.id, id), eq(foods.userId, context.user.id)))
      .returning({ id: foods.id })

    if (updated.length === 0) {
      throw new Error('Food not found')
    }

    return updated[0]
  })

export const deleteFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context }) => {
    const removed = await db
      .delete(foods)
      .where(and(eq(foods.id, data.id), eq(foods.userId, context.user.id)))
      .returning({ id: foods.id })

    if (removed.length === 0) {
      throw new Error('Food not found')
    }

    return removed[0]
  })
