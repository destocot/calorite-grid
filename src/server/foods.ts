import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { entries, foods } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'
import { isValidEmoji } from '#/lib/emoji'

const foodInput = z.object({
  name: z.string().trim().min(1).max(40),
  emoji: z
    .string()
    .trim()
    .min(1, 'Pick an emoji')
    .max(16)
    .refine(isValidEmoji, 'Must be a single emoji'),
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
        emoji: foods.emoji,
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

export const reorderFoods = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ ids: z.array(z.uuid()).min(1).max(200) }))
  .handler(async ({ data, context }) => {
    await db.transaction(async (tx) => {
      for (const [index, id] of data.ids.entries()) {
        await tx
          .update(foods)
          .set({ sortOrder: index })
          .where(and(eq(foods.id, id), eq(foods.userId, context.user.id)))
      }
    })

    return { ok: true }
  })

export const deleteFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.uuid(), localDate: z.iso.date() }))
  .handler(async ({ data, context }) =>
    // Today's entry goes with the food; earlier days keep theirs, so the
    // foodId there just falls to null and the snapshot survives.
    db.transaction(async (tx) => {
      await tx
        .delete(entries)
        .where(
          and(
            eq(entries.userId, context.user.id),
            eq(entries.foodId, data.id),
            eq(entries.localDate, data.localDate),
          ),
        )

      const removed = await tx
        .delete(foods)
        .where(and(eq(foods.id, data.id), eq(foods.userId, context.user.id)))
        .returning({ id: foods.id })

      if (removed.length === 0) {
        throw new Error('Food not found')
      }

      return removed[0]
    }),
  )
