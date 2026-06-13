import { Link } from 'react-router-dom'
import { useCountdowns, removeCountdown, type CountdownItem } from '@/services/countdownService'
import { getGroup } from '@/data/groups'
import { CATEGORY_META } from '@/utils/category'
import { daysUntil, formatDateShort } from '@/utils/date'
import type { EventCategory } from '@/types'

/** ホーム画面のカウントダウン。ピン留めしたイベントまで「あと何日」をかわいく表示。 */
export function CountdownSection() {
  const items = useCountdowns()
  // 過去になったものは自動で隠す（データは残すが当日0時を過ぎた翌日から非表示）
  const upcoming = items.filter((c) => daysUntil(new Date(c.startAt)) >= 0)
  if (upcoming.length === 0) return null

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-oshi-text">
        <span aria-hidden>⏰</span>カウントダウン
      </h2>
      <div className="space-y-2.5">
        {upcoming.map((c) => (
          <CountdownCard key={c.id} item={c} />
        ))}
      </div>
    </section>
  )
}

function CountdownCard({ item }: { item: CountdownItem }) {
  const group = getGroup(item.groupId)
  const meta = CATEGORY_META[item.category as EventCategory] ?? CATEGORY_META.live
  const d = daysUntil(new Date(item.startAt))
  const accent = group?.color ?? '#FF8FB1'

  return (
    <div
      className="relative overflow-hidden rounded-card p-4 text-white shadow-card"
      style={{ background: `linear-gradient(135deg, ${accent}, #B79CED)` }}
    >
      {/* 削除 */}
      <button
        onClick={() => removeCountdown(item.id)}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-sm active:scale-90"
        aria-label="カウントダウンを削除"
      >
        ✕
      </button>

      <Link to={`/event/${item.id}`} className="block active:scale-[0.99]">
        <p className="text-xs font-bold opacity-90">
          {meta.emoji} {group?.name ?? ''}・{meta.label}
        </p>
        <p className="mt-0.5 line-clamp-1 pr-7 text-sm font-bold opacity-95">{item.title}</p>

        <div className="mt-2 flex items-end gap-2">
          {d === 0 ? (
            <span className="text-4xl font-black drop-shadow">本日開催！🎉</span>
          ) : (
            <>
              <span className="text-sm font-bold opacity-90">あと</span>
              <span className="text-5xl font-black leading-none drop-shadow">{d}</span>
              <span className="mb-0.5 text-lg font-extrabold">日</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs font-bold opacity-90">{formatDateShort(item.startAt)}</p>
      </Link>
    </div>
  )
}
