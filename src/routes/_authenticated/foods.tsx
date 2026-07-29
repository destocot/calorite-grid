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

import { EmojiPicker } from '#/components/emoji-picker'
import {
  createFood,
  deleteFood,
  listFoods,
  reorderFoods,
  updateFood,
} from '#/server/foods'

import type { DragEndEvent } from '@dnd-kit/core'
import type { SubmitEvent } from 'react'

type Food = Awaited<ReturnType<typeof listFoods>>[number]

const fieldClass = 'control'

interface FoodValues {
  name: string
  emoji: string
  calories: number
}

interface FoodRowProps {
  food: Food
  onToggle: () => void
  onDelete: () => void
  onSave: (values: FoodValues) => void
}

const FoodRow = ({
  food,
  onToggle,
  onDelete,
  onSave,
}: Readonly<FoodRowProps>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: food.id })

  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState(food.name)
  const [emoji, setEmoji] = useState(food.emoji)
  const [calories, setCalories] = useState(String(food.calories))

  const startEditing = () => {
    setName(food.name)
    setEmoji(food.emoji)
    setCalories(String(food.calories))
    setEditing(true)
  }

  const save = () => {
    const parsed = Number(calories)
    if (!name.trim() || !Number.isFinite(parsed)) return

    onSave({ name: name.trim(), emoji, calories: Math.round(parsed) })
    setEditing(false)
  }

  if (editing) {
    return (
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className="bg-raised flex items-center gap-2 rounded-(--radius-panel) p-2.5"
      >
        <button
          type="button"
          aria-label="Choose emoji"
          onClick={() => setPicking(true)}
          className="bg-surface size-10 shrink-0 rounded-[10px] text-xl"
        >
          {emoji}
        </button>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoFocus
          className="bg-surface h-10 min-w-0 flex-1 rounded-[10px] px-3 outline-none"
        />
        <input
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          className="numeral bg-surface h-10 w-14 rounded-[10px] px-2 text-center outline-none"
        />
        <button
          type="button"
          aria-label="Save"
          onClick={save}
          className="text-paper px-1.5 text-lg"
        >
          &#10003;
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => setEditing(false)}
          className="text-faint px-1.5 text-lg"
        >
          &times;
        </button>

        {picking && (
          <EmojiPicker
            value={emoji}
            onChange={setEmoji}
            onClose={() => setPicking(false)}
          />
        )}
      </li>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`panel flex touch-none items-center gap-3 p-3 transition-shadow ${
        isDragging ? 'z-10 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)]' : ''
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
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
          food.showOnGrid ? 'bg-paper' : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-1 size-4 rounded-full transition-all duration-200 ${
            food.showOnGrid ? 'left-5 bg-canvas' : 'left-1 bg-faint'
          }`}
        />
      </button>

      <button
        type="button"
        onClick={startEditing}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="text-lg">{food.emoji}</span>
        <span className="min-w-0 flex-1 truncate">{food.name}</span>
        <span className="numeral text-muted text-sm">{food.calories}</span>
      </button>

      <button
        type="button"
        aria-label={`Delete ${food.name}`}
        onClick={onDelete}
        className="text-faint hover:text-ember px-1 py-2 text-lg transition-colors"
      >
        &times;
      </button>
    </li>
  )
}

const FoodsPage = () => {
  const queryClient = useQueryClient()
  const queryKey = ['foods']

  const { data: foods } = useQuery({ queryKey, queryFn: () => listFoods() })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['grid'] })
  }

  const create = useMutation({
    mutationFn: (input: FoodValues) =>
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
  const [emoji, setEmoji] = useState<string | null>(null)
  const [calories, setCalories] = useState('')
  const [picking, setPicking] = useState(false)

  const handleCreate = (event: SubmitEvent) => {
    event.preventDefault()

    const parsed = Number(calories)
    if (!name.trim() || !emoji || !Number.isFinite(parsed)) return

    create.mutate({ name: name.trim(), emoji, calories: Math.round(parsed) })
    setName('')
    setEmoji(null)
    setCalories('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
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
    <main className="flex min-h-full flex-col px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="mb-5 flex shrink-0 items-center justify-between">
        <Link to="/" className="nav-link -ml-2">
          Back
        </Link>
        <p className="eyebrow">Foods</p>
      </header>

      <form onSubmit={handleCreate} className="mb-6 flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <button
            type="button"
            aria-label="Choose emoji"
            onClick={() => setPicking(true)}
            className={`bg-raised size-12 shrink-0 rounded-(--radius-control) text-xl ${
              emoji
                ? ''
                : 'text-faint shadow-[inset_0_0_0_1px_var(--color-line)]'
            }`}
          >
            {emoji ?? '+'}
          </button>
          <input
            placeholder="Food name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            required
            className={`${fieldClass} min-w-0 flex-1`}
          />
        </div>
        <input
          placeholder="Calories"
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          required
          className={`${fieldClass} numeral`}
        />
        <button type="submit" className="btn btn-primary">
          Add food
        </button>
      </form>

      {picking && (
        <EmojiPicker
          value={emoji}
          onChange={setEmoji}
          onClose={() => setPicking(false)}
        />
      )}

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

export const Route = createFileRoute('/_authenticated/foods')({
  component: FoodsPage,
})
