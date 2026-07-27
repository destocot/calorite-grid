import { FOOD_EMOJI } from '#/lib/emoji'

interface EmojiPickerProps {
  value: string | null
  onChange: (emoji: string | null) => void
  onClose: () => void
}

export function EmojiPicker({ value, onChange, onClose }: EmojiPickerProps) {
  function choose(emoji: string | null) {
    onChange(emoji)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-black/60"
      />

      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 rounded-t-3xl bg-neutral-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Pick an emoji</span>
          <button
            type="button"
            onClick={() => choose(null)}
            className="text-sm text-neutral-500"
          >
            None
          </button>
        </div>

        <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto">
          {FOOD_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => choose(emoji)}
              className={`aspect-square rounded-lg text-2xl active:scale-90 ${
                emoji === value ? 'bg-neutral-700' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
