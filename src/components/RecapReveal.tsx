import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { monthLabel } from '@/utils/wrapped'
import { getGroupName } from '@/data/groups'
import type { LeaderEntry } from '@/services/leaderboardService'

/**
 * 先月のTOP5を「5位→1位」へ演出付きで発表するフルスクリーン。
 * タップで次の順位へ。1位で祝福演出。ショート動画/ストーリー向け。
 */
export function RecapReveal({
  monthKey,
  scopeLabel,
  entries,
  sample,
  onClose,
}: {
  monthKey: string
  scopeLabel: string
  entries: LeaderEntry[]
  sample?: boolean
  onClose: () => void
}) {
  const top = entries.slice(0, 5)
  const total = top.length
  const [step, setStep] = useState(0) // 0=イントロ, 1..total=発表, total+1=まとめ
  const summaryRef = useRef<HTMLDivElement>(null)

  if (total === 0) {
    return (
      <Overlay onClick={onClose}>
        <div className="text-center text-white">
          <p className="text-lg font-bold">先月のランキングデータがまだありません。</p>
          <button onClick={onClose} className="mt-4 rounded-full bg-white px-6 py-2 font-bold text-oshi-pink">
            閉じる
          </button>
        </div>
      </Overlay>
    )
  }

  const next = () => setStep((s) => Math.min(total + 1, s + 1))

  // 発表中の順位（5位→1位）
  const rank = step >= 1 && step <= total ? total - step + 1 : 0
  const cur = rank ? top[rank - 1] : null
  const isFirst = rank === 1

  const saveSummary = async () => {
    if (!summaryRef.current) return
    try {
      const url = await toPng(summaryRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#B79CED' })
      const a = document.createElement('a')
      a.href = url
      a.download = `oshihub-${monthKey}-top5.png`
      a.click()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Overlay onClick={step <= total ? next : undefined}>
      {/* 閉じる */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-lg text-white"
        aria-label="閉じる"
      >
        ✕
      </button>

      {/* イントロ */}
      {step === 0 && (
        <div className="animate-fade-in text-center text-white">
          {sample && (
            <span className="mb-3 inline-block rounded-full bg-white/25 px-3 py-1 text-xs font-bold">
              サンプル（来月から本物のランキングに）
            </span>
          )}
          <p className="text-sm font-bold tracking-widest opacity-90">📣 月間ファンランキング発表</p>
          <p className="mt-3 text-4xl font-black drop-shadow">{monthLabel(monthKey)}</p>
          <p className="mt-1 text-lg font-extrabold">{scopeLabel} TOP{total}</p>
          <p className="mt-8 animate-pulse text-base font-bold">タップで第{total}位から発表 ▶</p>
        </div>
      )}

      {/* 発表（1順位ずつ） */}
      {cur && (
        <div key={step} className="animate-fade-in w-full max-w-md text-center text-white">
          {isFirst && <div className="mb-2 text-5xl">🎉✨🎉</div>}
          <p className="text-xl font-bold opacity-90">第</p>
          <p className={`font-black drop-shadow ${isFirst ? 'text-8xl' : 'text-7xl'}`}>
            {rank}
            <span className="text-3xl">位</span>
          </p>
          <p className="mt-1 text-3xl">
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🎖️'}
          </p>
          <div
            className={`mx-auto mt-4 rounded-card bg-white/20 px-6 py-5 backdrop-blur ${
              isFirst ? 'ring-4 ring-white/60' : ''
            }`}
          >
            <p className="text-3xl font-black">{cur.name}</p>
            <div className="mt-2 flex justify-center gap-4 text-sm font-bold">
              <span>🎤 {cur.live}</span>
              <span>🤝 {cur.event}</span>
              <span>💞 {cur.meet}回</span>
            </div>
            {(cur.groups?.length ?? 0) > 0 && (
              <p className="mt-2 text-xs opacity-90">推し: {cur.groups!.map(getGroupName).join('・')}</p>
            )}
          </div>
          <p className="mt-8 text-sm font-bold opacity-80">
            {rank === 1 ? 'タップでまとめへ ▶' : 'タップで次の順位 ▶'}
          </p>
        </div>
      )}

      {/* まとめ */}
      {step === total + 1 && (
        <div className="w-full max-w-md text-white">
          <div
            ref={summaryRef}
            className="rounded-3xl bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue p-5"
          >
            <p className="text-center text-sm font-bold tracking-widest opacity-90">🏆 月間ファンランキング</p>
            <p className="text-center text-2xl font-black">
              {monthLabel(monthKey)}・{scopeLabel}
            </p>
            <div className="mt-3 space-y-1.5">
              {top.map((l, i) => (
                <div
                  key={l.uid}
                  className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2"
                >
                  <span className="w-7 text-center text-lg font-black">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-extrabold">{l.name}</span>
                  <span className="shrink-0 text-xs font-bold opacity-90">💞{l.meet}回</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs font-bold opacity-80">#OshiHub ・ oshilink-b8fab.web.app</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={saveSummary}
              className="rounded-full bg-white py-3 font-extrabold text-oshi-purple shadow-card active:scale-95"
            >
              📸 画像を保存
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-white/25 py-3 font-extrabold text-white active:scale-95"
            >
              閉じる
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] opacity-80">今月もランクインを目指そう！</p>
        </div>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue p-6"
    >
      {children}
    </div>
  )
}
