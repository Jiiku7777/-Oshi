import { useNavigate } from 'react-router-dom'
import type { OshiEvent } from '@/types'
import { getGroup } from '@/data/groups'
import { CategoryBadge } from './CategoryBadge'
import { formatTime, formatDateShort } from '@/utils/date'

interface Props {
  event: OshiEvent
  /** 時刻だけ強調表示する（今日の予定用） */
  emphasizeTime?: boolean
  /** 日付も表示する（今週の予定用） */
  showDate?: boolean
}

export function EventCard({ event, emphasizeTime, showDate }: Props) {
  const navigate = useNavigate()
  const group = getGroup(event.groupId)

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className="group flex w-full items-center gap-3 rounded-card bg-white p-3.5 text-left shadow-soft transition active:scale-[0.98]"
    >
      {/* グループカラーの縦バー */}
      <span
        className="h-12 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: group?.color ?? '#FF8FB1' }}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <CategoryBadge category={event.category} />
          <span className="truncate text-xs text-oshi-sub">{group?.name}</span>
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
