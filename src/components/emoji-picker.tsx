import { FOOD_EMOJI } from '#/lib/emoji'

interface EmojiPickerProps {
  value: string | null
  onChange: (emoji: string) => void
  onClose: () => void
}

export const EmojiPicker = ({
  value,
  onChange,
  onClose,
}: Readonly<EmojiPickerProps>) => {
  const choose = (emoji: string) => {
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

      <div className="bg-surface max-w-app mx-auto flex w-full flex-col gap-3 rounded-t-(--radius-card) p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Pick an emoji</span>
          <button type="button" onClick={onClose} className="nav-link -mr-2">
            Close
          </button>
        </div>

        <div className="no-scrollbar rule grid max-h-72 grid-cols-8 gap-1 overflow-x-hidden overflow-y-auto pt-3">
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
