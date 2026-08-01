import { useState } from 'react'

import type { SubmitEvent } from 'react'

export interface OneOffValues {
  name: string
  calories: number
}

interface OneOffSheetProps {
  onAdd: (values: OneOffValues) => void
  onClose: () => void
}

export const OneOffSheet = ({ onAdd, onClose }: Readonly<OneOffSheetProps>) => {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')

  const submit = (event: SubmitEvent) => {
    event.preventDefault()

    const parsed = Number(calories)
    if (!name.trim() || !Number.isFinite(parsed)) return

    onAdd({ name: name.trim(), calories: Math.round(parsed) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="bg-canvas/70 flex-1 backdrop-blur-[2px]"
      />

      <form
        onSubmit={submit}
        className="bg-surface max-w-app mx-auto flex w-full flex-col gap-3 rounded-t-(--radius-card) p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between">
          <span className="eyebrow">Just for today</span>
          <button type="button" onClick={onClose} className="nav-link -mr-2">
            Close
          </button>
        </div>

        <div className="rule flex flex-col gap-2.5 pt-3">
          <input
            placeholder="What did you eat?"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            required
            autoFocus
            className="control"
          />
          <div className="flex gap-2.5">
            <input
              placeholder="Calories"
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              required
              className="control numeral w-28 shrink-0 text-center"
            />
            <button type="submit" className="btn btn-primary flex-1">
              Add
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
