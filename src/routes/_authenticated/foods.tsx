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
import { useEffect, useState } from 'react'

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

interface FoodCardProps {
  food: Food
  onToggle: () => void
  onDelete: () => void
  onSave: (values: FoodValues) => void
}

const FoodCard = ({
  food,
  onToggle,
  onDelete,
  onSave,
}: Readonly<FoodCardProps>) => {
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [name, setName] = useState(food.name)
  const [emoji, setEmoji] = useState(food.emoji)
  const [calories, setCalories] = useState(String(food.calories))

  useEffect(() => {
    if (!confirming) return

    const timeout = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timeout)
  }, [confirming])

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
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Choose emoji"
          onClick={() => setPicking(true)}
          className="bg-surface grid size-10 shrink-0 place-items-center rounded-(--radius-control) text-xl"
        >
          {emoji}
        </button>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          autoFocus
          className="bg-surface h-10 min-w-0 flex-1 rounded-(--radius-control) px-3 outline-none"
        />
        <input
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          className="numeral bg-surface h-10 w-14 shrink-0 rounded-(--radius-control) px-2 text-center outline-none"
        />
        <button
          type="button"
          aria-label="Save"
          onClick={save}
          className="text-paper shrink-0 px-1.5 text-lg"
        >
          &#10003;
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={() => setEditing(false)}
          className="text-faint shrink-0 px-1.5 text-lg"
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
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={startEditing}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="bg-surface grid size-10 shrink-0 place-items-center rounded-(--radius-control) text-xl">
          {food.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">
            {food.name}
          </span>
          <span className="numeral text-muted block text-xs">
            {food.calories} cal
          </span>
        </span>
      </button>

      {confirming ? (
        <button
          type="button"
          onClick={onDelete}
          className="text-ember shrink-0 px-1 py-2 text-xs font-semibold tracking-wide uppercase"
        >
          Delete?
        </button>
      ) : (
        <>
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
            aria-label={`Delete ${food.name}`}
            onClick={() => setConfirming(true)}
            className="text-faint hover:text-ember shrink-0 px-1 py-2 text-lg transition-colors"
          >
            &times;
          </button>
        </>
      )}
    </div>
  )
}

const SortableFoodRow = (props: Readonly<FoodCardProps>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.food.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`panel touch-none p-2.5 transition-shadow ${
        isDragging ? 'z-10 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.8)]' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <FoodCard {...props} />
    </li>
  )
}

const FoodsPage = () => {
  const queryClient = useQueryClient()
  const queryKey = ['foods']

  const { data: foods } = useQuery({ queryKey, queryFn: () => listFoods() })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ['grid'] })
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

  const onGrid = foods?.filter((food) => food.showOnGrid) ?? []
  const hidden = foods?.filter((food) => !food.showOnGrid) ?? []

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
    if (!over || active.id === over.id) return

    const from = onGrid.findIndex((food) => food.id === active.id)
    const to = onGrid.findIndex((food) => food.id === over.id)
    if (from === -1 || to === -1) return

    const next = [...arrayMove(onGrid, from, to), ...hidden]
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

      <form onSubmit={handleCreate} className="mb-7 flex flex-col gap-2.5">
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
        <div className="flex gap-2.5">
          <input
            placeholder="Calories"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            inputMode="numeric"
            pattern="[0-9]*"
            required
            className={`${fieldClass} numeral w-28 shrink-0 text-center`}
          />
          <button type="submit" className="btn btn-primary flex-1">
            Add food
          </button>
        </div>
      </form>

      {picking && (
        <EmojiPicker
          value={emoji}
          onChange={setEmoji}
          onClose={() => setPicking(false)}
        />
      )}

      {onGrid.length > 0 && (
        <>
          <div className="rule mb-2.5 flex items-baseline justify-between pt-2">
            <p className="eyebrow">On grid</p>
            <span className="numeral text-faint text-xs">{onGrid.length}</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={onGrid.map((food) => food.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="flex flex-col gap-2">
                {onGrid.map((food) => (
                  <SortableFoodRow
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
        </>
      )}

      {hidden.length > 0 && (
        <>
          <div className="rule mt-7 mb-2.5 flex items-baseline justify-between pt-2">
            <p className="eyebrow">Hidden</p>
            <span className="numeral text-faint text-xs">{hidden.length}</span>
          </div>

          <ul className="flex flex-col gap-2">
            {hidden.map((food) => (
              <li key={food.id} className="panel p-2.5 opacity-55">
                <FoodCard
                  food={food}
                  onToggle={() =>
                    update.mutate({ ...food, showOnGrid: !food.showOnGrid })
                  }
                  onSave={(values) => update.mutate({ ...food, ...values })}
                  onDelete={() => remove.mutate(food.id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}

export const Route = createFileRoute('/_authenticated/foods')({
  component: FoodsPage,
})
