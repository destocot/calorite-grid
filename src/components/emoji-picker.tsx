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
        className="bg-canvas/70 flex-1 backdrop-blur-[2px]"
      />

      <div className="bg-surface mx-auto flex w-full max-w-sm flex-col gap-3 rounded-t-[var(--radius-card)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Pick an emoji</span>
          <button
            type="button"
            onClick={() => choose(null)}
            className="nav-link -mr-2"
          >
            None
          </button>
        </div>

        <div className="rule grid max-h-72 grid-cols-8 gap-1 overflow-y-auto pt-3">
          {FOOD_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => choose(emoji)}
              className={`aspect-square rounded-[10px] text-2xl transition-transform duration-150 active:scale-90 ${
                emoji === value ? 'bg-raised' : ''
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
