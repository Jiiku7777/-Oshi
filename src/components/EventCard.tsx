import { useNavigate } from 'react-router-dom'
import type { OshiEvent } from '@/types'
import { getGroup, getGroupEmoji } from '@/data/groups'
import { CategoryBadge } from './CategoryBadge'
import { formatTime, formatDateShort } from '@/utils/date'

interface Props {
  event: OshiEvent
  /** 時刻だけ強調表示する（今日の予定用） */
  emphasizeTime?: boolean
  /** 日付も表示する（今週の予定用） */
  showDate?: boolean
}

/** hex を暗くした rgb を返す（薄い色でも白文字が読めるように） */
function darken(hex: string, f = 0.42): string {
  const m = hex.replace('#', '')
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m
  const n = parseInt(full, 16)
  const r = Math.round(((n >> 16) & 255) * (1 - f))
  const g = Math.round(((n >> 8) & 255) * (1 - f))
  const b = Math.round((n & 255) * (1 - f))
  return `rgb(${r}, ${g}, ${b})`
}

export function EventCard({ event, emphasizeTime, showDate }: Props) {
  const navigate = useNavigate()
  const group = getGroup(event.groupId)
  const color = group?.color ?? '#FF8FB1'
  const chipBg = darken(color)

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className="group flex w-full items-center gap-3 overflow-hidden rounded-card bg-white p-3.5 text-left shadow-soft transition active:scale-[0.98]"
      style={{ borderLeft: `6px solid ${color}`, backgroundColor: `${color}12` }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          {/* グループ固有の絵文字＋カラー名前チップ（色が似ていても見分けられる） */}
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white"
            style={{ backgroundColor: chipBg }}
          >
            <span aria-hidden>{getGroupEmoji(event.groupId)}</span>
            {group?.name}
          </span>
          <CategoryBadge category={event.category} />
        </div>
        <p className="truncate text-sm font-bold text-oshi-text">{event.title}</p>
      </div>

      <div className="shrink-0 text-right">
        {showDate && (
          <p className="text-xs text-oshi-sub">{formatDateShort(event.startAt)}</p>
        )}
        <p
          className={
            emphasizeTime
              ? 'text-lg font-extrabold text-oshi-pink'
              : 'text-sm font-bold text-oshi-text'
          }
        >
          {formatTime(event.startAt)}
        </p>
      </div>
    </button>
  )
}
