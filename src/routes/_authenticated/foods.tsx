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
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

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

interface FoodRowProps {
  food: Food
  onToggle: () => void
  onDelete: () => void
  onSave: (values: { name: string; calories: number }) => void
}

function FoodRow({ food, onToggle, onDelete, onSave }: FoodRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: food.id })

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(food.name)
  const [calories, setCalories] = useState(String(food.calories))

  function startEditing() {
    setName(food.name)
    setCalories(String(food.calories))
    setEditing(true)
  }

  function save() {
    const parsed = Number(calories)
    if (!name.trim() || !Number.isFinite(parsed)) return

    onSave({ name: name.trim(), calories: Math.round(parsed) })
    setEditing(false)
  }

  if (editing) {
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="flex items-center gap-2 rounded-xl bg-neutral-800 p-3"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoFocus
          className="h-10 min-w-0 flex-1 rounded-lg bg-neutral-900 px-3 outline-none"
        />
        <input
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-10 w-16 rounded-lg bg-neutral-900 px-2 text-center tabular-nums outline-none"
        />
        <button
          type="button"
          aria-label="Save"
          onClick={save}
          className="px-2 text-neutral-100"
        >
          &#10003;
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => setEditing(false)}
          className="px-2 text-neutral-500"
        >
          &times;
        </button>
      </li>
    )
  }

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
        role="switch"
        aria-checked={food.showOnGrid}
        aria-label={`Show ${food.name} on grid`}
        onClick={onToggle}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          food.showOnGrid ? 'bg-neutral-100' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full transition-all ${
            food.showOnGrid ? 'left-5 bg-neutral-950' : 'left-1 bg-neutral-400'
          }`}
        />
      </button>

      <button
        type="button"
        onClick={startEditing}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1 truncate">{food.name}</span>
        <span className="tabular-nums text-neutral-500">{food.calories}</span>
      </button>

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
        <Link to="/history" className="p-2 text-sm text-neutral-500">
          History
        </Link>
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
                onSave={(values) => update.mutate({ ...food, ...values })}
                onDelete={() => remove.mutate(food.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </main>
  )
}
