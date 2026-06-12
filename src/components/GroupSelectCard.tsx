import type { Group } from '@/types'

interface Props {
  group: Group
  selected: boolean
  onToggle: (id: string) => void
}

/** 推し選択用のトグルカード（オンボーディング / 設定で共用） */
export function GroupSelectCard({ group, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={() => onToggle(group.id)}
      aria-pressed={selected}
      className={`relative flex items-center gap-3 rounded-card border-2 bg-white p-3.5 text-left transition active:scale-[0.98] ${
        selected
          ? 'border-oshi-pink shadow-card'
          : 'border-transparent shadow-soft'
      }`}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
        style={{ backgroundColor: group.color }}
        aria-hidden
      >
        {group.name.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-oshi-text">{group.name}</p>
        {group.reading && (
          <p className="truncate text-[11px] text-oshi-sub">{group.reading}</p>
        )}
      </div>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
          selected
            ? 'border-oshi-pink bg-oshi-pink text-white'
            : 'border-oshi-pinkLight text-transparent'
        }`}
      >
        ✓
      </span>
    </button>
  )
}
