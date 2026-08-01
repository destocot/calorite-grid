import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db'
import { entries, foods } from '#/db/schema'
import { authMiddleware } from '#/lib/auth-middleware'
import { applyMultiplier, isMultiplier } from '#/lib/servings'

const localDate = z.iso.date()
const multiplier = z.number().refine(isMultiplier, 'Unsupported serving size')
const name = z.string().trim().min(1).max(40)
const calories = z.number().int().min(0).max(10000)

const ONE_OFF_EMOJI = '🍽️'

interface Extra {
  id: string
  name: string
  emoji: string
  calories: number
}

export const getGrid = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(z.object({ localDate }))
  .handler(async ({ data, context }) => {
    const [gridFoods, rows] = await Promise.all([
      db
        .select({
          id: foods.id,
          name: foods.name,
          emoji: foods.emoji,
          calories: foods.calories,
        })
        .from(foods)
        .where(
          and(eq(foods.userId, context.user.id), eq(foods.showOnGrid, true)),
        )
        .orderBy(asc(foods.sortOrder), asc(foods.createdAt)),
      db
        .select({
          id: entries.id,
          foodId: entries.foodId,
          foodName: entries.foodName,
          foodEmoji: entries.foodEmoji,
          calories: entries.calories,
          multiplier: entries.multiplier,
        })
        .from(entries)
        .where(
          and(
            eq(entries.userId, context.user.id),
            eq(entries.localDate, data.localDate),
          ),
        ),
    ])

    const logged: Record<string, number> = {}
    const extras: Array<Extra> = []
    let total = 0

    for (const row of rows) {
      const amount = applyMultiplier(row.calories, row.multiplier)
      total += amount

      if (row.foodId) {
        logged[row.foodId] = row.multiplier
      } else {
        extras.push({
          id: row.id,
          name: row.foodName,
          emoji: row.foodEmoji ?? ONE_OFF_EMOJI,
          calories: amount,
        })
      }
    }

    return { foods: gridFoods, logged, extras, total }
  })

export const toggleFood = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ foodId: z.uuid(), localDate }))
  .handler(async ({ data, context }) => {
    const [food] = await db
      .select({
        name: foods.name,
        emoji: foods.emoji,
        calories: foods.calories,
      })
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
      foodEmoji: food.emoji,
      calories: food.calories,
    })

    return { logged: true }
  })

export const addOneOff = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ localDate, name, calories }))
  .handler(async ({ data, context }) => {
    const [created] = await db
      .insert(entries)
      .values({
        userId: context.user.id,
        foodId: null,
        localDate: data.localDate,
        foodName: data.name,
        foodEmoji: ONE_OFF_EMOJI,
        calories: data.calories,
      })
      .returning({ id: entries.id })

    return created
  })

export const removeEntry = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.uuid(), localDate }))
  .handler(async ({ data, context }) => {
    const removed = await db
      .delete(entries)
      .where(
        and(
          eq(entries.id, data.id),
          eq(entries.userId, context.user.id),
          eq(entries.localDate, data.localDate),
        ),
      )
      .returning({ id: entries.id })

    if (removed.length === 0) {
      throw new Error('Entry not found')
    }

    return removed[0]
  })

export const setMultiplier = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ foodId: z.uuid(), localDate, multiplier }))
  .handler(async ({ data, context }) => {
    const updated = await db
      .update(entries)
      .set({ multiplier: data.multiplier })
      .where(
        and(
          eq(entries.userId, context.user.id),
          eq(entries.foodId, data.foodId),
          eq(entries.localDate, data.localDate),
        ),
      )
      .returning({ id: entries.id })

    if (updated.length === 0) {
      throw new Error('Entry not found')
    }

    return { ok: true }
  })
