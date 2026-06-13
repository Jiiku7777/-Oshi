import { getGroupName } from '@/data/groups'
import type { LeaderEntry } from '@/services/leaderboardService'

/** ランカーの公開プロフィール（推しグループ・参戦数） */
export function FanDetailModal({ entry, onClose }: { entry: LeaderEntry; onClose: () => void }) {
  const groups = entry.groups ?? []
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-card bg-white p-5 text-oshi-text shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-lg font-extrabold">{entry.name}</p>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-oshi-bg text-oshi-sub"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <p className="mb-1 text-xs font-bold text-oshi-sub">推しているグループ</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {groups.length ? (
            groups.map((g) => (
              <span
                key={g}
                className="rounded-full bg-oshi-pinkLight px-2.5 py-1 text-xs font-bold text-oshi-pink"
              >
                {getGroupName(g)}
              </span>
            ))
          ) : (
            <span className="text-sm text-oshi-sub">非公開</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FanStat emoji="🎤" label="ライブ" value={entry.live} />
          <FanStat emoji="🤝" label="特典会" value={entry.event} />
          <FanStat emoji="💞" label="会った回数" value={entry.meet} />
          <FanStat emoji="📅" label="推し活日数" value={entry.oshiDays} />
        </div>
      </div>
    </div>
  )
}

function FanStat({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-oshi-bg px-3 py-2.5 text-center">
      <p className="text-xs font-bold text-oshi-sub">
        {emoji} {label}
      </p>
      <p className="text-2xl font-black text-oshi-text">{value}</p>
    </div>
  )
}
