import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '#/lib/auth-client'
import {
  createFood,
  deleteFood,
  listFoods,
  reorderFoods,
  updateFood,
} from '#/server/foods'

import type { DragEndEvent } from '@dnd-kit/core'
import type { FormEvent } from 'react'

export const Route = createFileRoute('/_authenticated/foods')({
  component: FoodsPage,
})

type Food = Awaited<ReturnType<typeof listFoods>>[number]

const fieldClass =
  'h-12 rounded-xl bg-neutral-900 px-4 outline-none placeholder:text-neutral-600 focus:ring-2 focus:ring-neutral-600'

function FoodRow({
  food,
  onToggle,
  onDelete,
}: {
  food: Food
  onToggle: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: food.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex touch-none items-center gap-3 rounded-xl bg-neutral-900 p-3 ${
        isDragging ? 'z-10 opacity-80 shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        aria-label={food.showOnGrid ? 'Remove from grid' : 'Show on grid'}
        onClick={onToggle}
        className={`size-6 shrink-0 rounded-full transition-colors ${
          food.showOnGrid ? 'bg-neutral-100' : 'bg-neutral-700'
        }`}
      />

      <span className="min-w-0 flex-1 truncate">{food.name}</span>
      <span className="tabular-nums text-neutral-500">{food.calories}</span>

      <button
        type="button"
        aria-label={`Delete ${food.name}`}
        onClick={onDelete}
        className="p-2 text-neutral-600"
      >
        &times;
      </button>
    </li>
  )
}

function FoodsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const queryKey = ['foods']

  const { data: foods } = useQuery({ queryKey, queryFn: () => listFoods() })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ['grid'] })
  }

  const create = useMutation({
    mutationFn: (input: { name: string; calories: number }) =>
      createFood({ data: { ...input, showOnGrid: true } }),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: (food: Food) => updateFood({ data: food }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteFood({ data: { id } }),
    onSuccess: invalidate,
  })

  const reorder = useMutation({
    mutationFn: (ids: Array<string>) => reorderFoods({ data: { ids } }),
    onSuccess: invalidate,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')

  function handleCreate(event: FormEvent) {
    event.preventDefault()

    const parsed = Number(calories)
    if (!name.trim() || !Number.isFinite(parsed)) return

    create.mutate({ name: name.trim(), calories: Math.round(parsed) })
    setName('')
    setCalories('')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !foods) return

    const from = foods.findIndex((food) => food.id === active.id)
    const to = foods.findIndex((food) => food.id === over.id)
    if (from === -1 || to === -1) return

    const next = arrayMove(foods, from, to)
    queryClient.setQueryData(queryKey, next)
    reorder.mutate(next.map((food) => food.id))
  }

  return (
    <main className="flex min-h-full flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <Link to="/" className="p-2 text-sm text-neutral-500">
          Back
        </Link>
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut()
            await router.invalidate()
            await router.navigate({ to: '/login', search: { redirect: '/' } })
          }}
          className="p-2 text-sm text-neutral-500"
        >
          Sign out
        </button>
      </header>

      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <input
          placeholder="food"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          required
          className={fieldClass}
        />
        <input
          placeholder="calories"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          required
          className={fieldClass}
        />
        <button
          type="submit"
          className="h-12 rounded-xl bg-neutral-100 font-medium text-neutral-950 active:opacity-60"
        >
          Add
        </button>
      </form>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={foods?.map((food) => food.id) ?? []}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {foods?.map((food) => (
              <FoodRow
                key={food.id}
                food={food}
                onToggle={() =>
                  update.mutate({ ...food, showOnGrid: !food.showOnGrid })
                }
                onDelete={() => remove.mutate(food.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </main>
  )
}
