import { useState } from 'react'

import {
  MAX_MULTIPLIER,
  applyMultiplier,
  formatMultiplier,
  isMultiplier,
  roundMultiplier,
} from '#/lib/servings'

import type { SubmitEvent } from 'react'

interface ServingSheetProps {
  name: string
  calories: number
  multiplier: number
  onApply: (multiplier: number) => void
  onClose: () => void
}

export const ServingSheet = ({
  name,
  calories,
  multiplier,
  onApply,
  onClose,
}: Readonly<ServingSheetProps>) => {
  const [value, setValue] = useState(formatMultiplier(multiplier))

  const parsed = roundMultiplier(Number(value.trim()))
  const valid = value.trim() !== '' && isMultiplier(parsed)

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    if (!valid) return

    onApply(parsed)
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
          <span className="eyebrow">Servings</span>
          <button type="button" onClick={onClose} className="nav-link -mr-2">
            Close
          </button>
        </div>

        <div className="rule flex flex-col gap-2.5 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="min-w-0 truncate text-sm font-medium">{name}</span>
            <span className="numeral text-muted shrink-0 text-sm">
              {valid ? applyMultiplier(calories, parsed) : '—'} cal
            </span>
          </div>

          <div className="flex gap-2.5">
            <input
              placeholder="1.5"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              inputMode="decimal"
              autoFocus
              onFocus={(event) => event.target.select()}
              aria-label={`Servings of ${name}, up to ${MAX_MULTIPLIER}`}
              className="control numeral w-28 shrink-0 text-center"
            />
            <button
              type="submit"
              disabled={!valid}
              className="btn btn-primary flex-1"
            >
              Apply
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
