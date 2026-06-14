import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Avatar } from './Avatar'
import { monthLabel } from '@/utils/wrapped'
import { SAMPLE_TOP5, type LeaderEntry } from '@/services/leaderboardService'

/**
 * 月間ランキング発表ムービー（アイドル視点のシネマティック演出）。
 * 4幕構成: ドーム(TOP30) → 別会場(TOP15) → SNSエゴサ(TOP5) → 特典会(No.1)。
 * 設定済みアイコンを使い、フルスクリーンで自動再生。タップで次の場面へ。
 * 画面収録でそのままショート動画に。アプリ内で何度でも見返せる。
 */

// 演出の都合で群衆を30人に満たすための「埋め」ファン名（実データが少ない時のみ使用）
const FILLER_NAMES = [
  'ゆい', 'はる', 'みお', 'りこ', 'そら', 'あおい', 'つむぎ', 'ねね', 'まこ', 'ゆず',
  'こはる', 'りん', 'さき', 'ののか', 'みう', 'あん', 'ことね', 'せな', 'るな', 'ひなた',
  'もも', 'なぎ', 'ちひろ', 'れい', 'ゆあ',
]

const TWEETS = [
  '今日のライブ最高すぎた…生きててよかった🥹',
  '推しが尊い。語彙力が消えました',
  '特典会、目が合った気がする(確信)',
  '電池切れるまで応援した🔋ペンラ振りすぎ',
  '今月も全通した自分をちょっと褒めたい',
]

function buildEntries(real: LeaderEntry[]): LeaderEntry[] {
  const base = real.length >= 3 ? real : SAMPLE_TOP5
  const out = [...base]
  let i = 0
  while (out.length < 30) {
    const name = FILLER_NAMES[i % FILLER_NAMES.length]
    const score = Math.max(2, 60 - out.length * 2)
    out.push({
      uid: `filler_${i}`,
      name,
      score,
      live: Math.max(0, 8 - Math.floor(out.length / 4)),
      event: Math.max(0, 6 - Math.floor(out.length / 5)),
      meet: Math.max(1, 12 - Math.floor(out.length / 3)),
      oshiDays: 0,
      updatedAt: '',
    })
    i++
  }
  return out.slice(0, 30)
}

// 安定した擬似乱数（インデックス＋ソルトから 0..1）
const rnd = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PEN_COLORS = ['#FF8FB1', '#B79CED', '#8FD3FF', '#FFFFFF', '#9CE0D6', '#FFD36E', '#FF6FA3']

type Scene = 'intro' | 'dome' | 'day2' | 'venue' | 'dark2' | 'sns' | 'black' | 'booth' | 'hand' | 'reveal' | 'final'

const ORDER: { scene: Scene; ms: number }[] = [
  { scene: 'intro', ms: 2000 },
  { scene: 'dome', ms: 8000 },
  { scene: 'day2', ms: 2200 },
  { scene: 'venue', ms: 6500 },
  { scene: 'dark2', ms: 1600 },
  { scene: 'sns', ms: 8200 },
  { scene: 'black', ms: 1500 },
  { scene: 'booth', ms: 4200 },
  { scene: 'hand', ms: 2800 },
  { scene: 'reveal', ms: 2600 },
  { scene: 'final', ms: 0 }, // 0 = 自動で進まない（保持）
]

export function RankingFilm({
  monthKey,
  entries: real,
  onClose,
}: {
  monthKey: string
  entries: LeaderEntry[]
  onClose: () => void
}) {
  const fans = useMemo(() => buildEntries(real), [real])
  const [step, setStep] = useState(0)
  const finalRef = useRef<HTMLDivElement>(null)
  const scene = ORDER[step].scene

  // 自動進行（最終シーンは保持）
  useEffect(() => {
    const ms = ORDER[step].ms
    if (ms <= 0) return
    const t = setTimeout(() => setStep((s) => Math.min(ORDER.length - 1, s + 1)), ms)
    return () => clearTimeout(t)
  }, [step])

  const next = () => setStep((s) => Math.min(ORDER.length - 1, s + 1))
  const replay = () => setStep(0)

  const no1 = fans[0]
  const top5 = fans.slice(0, 5)

  const saveImage = async () => {
    if (!finalRef.current) return
    try {
      const url = await toPng(finalRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#1a1030' })
      const a = document.createElement('a')
      a.href = url
      a.download = `oshihub-${monthKey}-no1fan.png`
      a.click()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-black text-white"
      onClick={scene === 'final' ? undefined : next}
    >
      {/* 閉じる */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur active:scale-90"
        aria-label="閉じる"
      >
        ✕
      </button>

      {/* スキップ（最終以外） */}
      {scene !== 'final' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            next()
          }}
          className="absolute bottom-5 right-5 z-50 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold backdrop-blur active:scale-95"
        >
          スキップ ▶
        </button>
      )}

      {scene === 'intro' && <IntroScene monthKey={monthKey} />}
      {scene === 'dome' && <CrowdScene key="dome" fans={fans.slice(0, 30)} title="TOP 30" subtitle="満員のドーム、ペンライトの海" big={false} />}
      {scene === 'day2' && <LabelScene text="別日──" sub="会場を移して" />}
      {scene === 'venue' && <CrowdScene key="venue" fans={fans.slice(0, 15)} title="TOP 15" subtitle="歓声が近づく" big accent="#7E5BFF" />}
      {scene === 'dark2' && <LabelScene text="そして" sub="ある夜のこと" />}
      {scene === 'sns' && <SnsScene top5={top5} />}
      {scene === 'black' && <div className="h-full w-full bg-black" />}
      {scene === 'booth' && <BoothScene no1={no1} showHand={false} />}
      {scene === 'hand' && <BoothScene no1={no1} showHand />}
      {scene === 'reveal' && <RevealScene />}
      {scene === 'final' && (
        <FinalScene no1={no1} monthKey={monthKey} finalRef={finalRef} onSave={saveImage} onReplay={replay} onClose={onClose} />
      )}

      {/* 進行インジケータ */}
      {scene !== 'final' && (
        <div className="absolute left-0 top-0 z-50 flex w-full gap-1 p-2">
          {ORDER.slice(0, -1).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white/90' : 'bg-white/25'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- ペンライトの海（満員感） ---------- */
function PenlightSea({ count = 70 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const left = rnd(i, 1) * 100
        const depth = rnd(i, 2) // 0=奥(上/小) .. 1=手前(下/大)
        const top = 38 + depth * 56
        const scale = 0.4 + depth * 0.9
        const color = PEN_COLORS[Math.floor(rnd(i, 3) * PEN_COLORS.length)]
        const delay = rnd(i, 4) * 1.6
        return (
          <div
            key={i}
            className="absolute origin-bottom"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: `scale(${scale})`,
              animation: `film-pen-swing ${1.4 + rnd(i, 5)}s ease-in-out ${delay}s infinite`,
            }}
          >
            {/* 持ち手 */}
            <div className="mx-auto h-5 w-[3px] rounded-full bg-white/30" />
            {/* 発光部 */}
            <div
              className="mx-auto -mt-7 h-7 w-[6px] rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 10px 3px ${color}`,
                animation: `film-twinkle ${1 + rnd(i, 6)}s ease-in-out ${delay}s infinite`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ---------- 群衆シーン（TOP30 / TOP15） ---------- */
function CrowdScene({
  fans,
  title,
  subtitle,
  big,
  accent = '#FF8FB1',
}: {
  fans: LeaderEntry[]
  title: string
  subtitle: string
  big: boolean
  accent?: string
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* ステージ→客席のグラデ背景 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 120%, ${accent}55 0%, #1a1030 55%, #0a0618 100%)`,
        }}
      />
      {/* スポットライト */}
      <div className="absolute left-1/2 top-0 h-full w-[70%] -translate-x-1/2 bg-gradient-to-b from-white/15 to-transparent blur-2xl" />

      <PenlightSea count={big ? 55 : 75} />

      {/* ファンのアイコン（ペンライトを持って応援） */}
      <div className="absolute inset-0">
        {fans.map((f, i) => {
          const left = 6 + rnd(i, 11) * 88
          const depth = rnd(i, 12)
          const top = 32 + depth * 50
          const scale = (big ? 0.8 : 0.55) + depth * (big ? 0.7 : 0.6)
          const size = big ? 56 : 44
          const penColor = PEN_COLORS[Math.floor(rnd(i, 13) * PEN_COLORS.length)]
          return (
            <div
              key={f.uid}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translateX(-50%) scale(${scale})`,
                zIndex: Math.floor(depth * 100),
              }}
            >
              <div
                className="relative flex flex-col items-center"
                style={{ animation: `film-avatar-pop 0.5s ease-out ${rnd(i, 14) * (big ? 1.3 : 2.2)}s both` }}
              >
                {/* ペンライト */}
                <div
                  className="absolute -right-3 -top-4 h-7 w-[5px] origin-bottom rounded-full"
                  style={{
                    background: penColor,
                    boxShadow: `0 0 8px 2px ${penColor}`,
                    animation: `film-pen-swing 1.3s ease-in-out ${rnd(i, 15)}s infinite`,
                  }}
                />
                <Avatar src={f.avatar} name={f.name} size={size} ring />
              </div>
            </div>
          )
        })}
      </div>

      {/* タイトル */}
      <div className="absolute inset-x-0 top-[7%] text-center" style={{ animation: 'film-rise 0.7s ease-out both' }}>
        <p className="text-sm font-bold tracking-widest opacity-90 drop-shadow">月間ファンランキング</p>
        <p className="mt-1 text-6xl font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">{title}</p>
        <p className="mt-1 text-sm font-bold opacity-90 drop-shadow">{subtitle}</p>
      </div>
    </div>
  )
}

/* ---------- 場面転換ラベル（別日 など） ---------- */
function LabelScene({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="text-center" style={{ animation: 'film-rise 0.9s ease-out both' }}>
        <p className="text-5xl font-black tracking-widest drop-shadow">{text}</p>
        {sub && <p className="mt-2 text-sm font-bold tracking-widest opacity-70">{sub}</p>}
      </div>
    </div>
  )
}

/* ---------- SNSエゴサ（TOP5 のツイート＋上位3にハート） ---------- */
function SnsScene({ top5 }: { top5: LeaderEntry[] }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-b from-[#12101c] to-[#06040c] px-4">
      {/* スマホ筐体（アイドルがエゴサしている手元） */}
      <div className="relative w-full max-w-[320px]" style={{ animation: 'film-rise 0.7s ease-out both' }}>
        <p className="mb-2 text-center text-xs font-bold tracking-widest opacity-70">― エゴサ中 ―</p>
        <div className="rounded-[2rem] border-4 border-white/15 bg-[#0c0a14] p-3 shadow-2xl">
          <p className="mb-2 px-1 text-[13px] font-bold text-sky-300">🔍 推しの名前で検索…</p>
          <div className="space-y-2">
            {top5.map((f, i) => (
              <div
                key={f.uid}
                className="flex items-start gap-2 rounded-2xl bg-white/[0.06] p-2.5"
                style={{ animation: `film-rise 0.5s ease-out ${0.3 + i * 0.35}s both` }}
              >
                <Avatar src={f.avatar} name={f.name} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">
                    {f.name} <span className="font-normal opacity-50">@fan{i + 1}</span>
                  </p>
                  <p className="text-[11px] leading-snug opacity-90">{TWEETS[i % TWEETS.length]}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] opacity-70">
                    {/* ハート（上位3はアイドルがいいね） */}
                    <span className="relative inline-flex h-4 w-4 items-center justify-center">
                      <span>🤍</span>
                      {i < 3 && (
                        <span
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ animation: `film-heart-pop 0.5s ease-out ${1.6 + i * 0.5}s both` }}
                        >
                          ❤️
                        </span>
                      )}
                    </span>
                    <span>♻ {3 + i}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* いいねする指 */}
        <div
          className="absolute -bottom-2 right-6 text-3xl"
          style={{ animation: 'film-float-y 1.4s ease-in-out infinite' }}
        >
          👆
        </div>
      </div>
      <p className="absolute bottom-6 left-0 right-0 text-center text-xs font-bold opacity-80">
        上位3名に、推しが「いいね」した…！
      </p>
    </div>
  )
}

/* ---------- 特典会ブース（No.1 と握手直前） ---------- */
function BoothScene({ no1, showHand }: { no1: LeaderEntry; showHand: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#241433] to-[#0a0613]">
      {/* ぼかした客席 */}
      <div className="absolute inset-0 opacity-40 blur-md">
        <PenlightSea count={28} />
      </div>

      {/* No.1 のアイコン（机の向こう） */}
      <div className="absolute left-1/2 top-[26%] -translate-x-1/2 text-center">
        <div style={{ animation: 'film-rise 0.8s ease-out both' }}>
          <Avatar src={no1.avatar} name={no1.name} size={132} ring />
          <p className="mt-3 text-lg font-bold drop-shadow">{no1.name}</p>
          <p className="text-xs opacity-70">特典会ブース</p>
        </div>
      </div>

      {/* 机 */}
      <div className="absolute bottom-0 left-0 h-[26%] w-full bg-gradient-to-b from-[#3a2350] to-[#1a0f2a]">
        <div className="h-1.5 w-full bg-white/10" />
      </div>

      {/* 下から出てくる手（握手直前で停止） */}
      {showHand && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <div
            className="text-[120px] leading-none"
            style={{ animation: 'film-hand-rise 1.6s cubic-bezier(0.2,0.8,0.2,1) both' }}
          >
            🤚
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- ほわほわ→だーん→No.1 FAN ---------- */
function RevealScene() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-black">
      {/* ほわほわ（シマー） */}
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={{
            left: `${10 + rnd(i, 21) * 80}%`,
            top: `${20 + rnd(i, 22) * 60}%`,
            animation: `film-shimmer 1.2s ease-out ${rnd(i, 23) * 0.8}s both`,
          }}
        >
          ✨
        </span>
      ))}
      {/* だーん */}
      <div className="text-center" style={{ animation: 'film-slam 0.9s cubic-bezier(0.2,1.4,0.3,1) 0.9s both' }}>
        <p className="text-2xl font-black tracking-widest text-oshi-pink">👑</p>
        <p className="text-7xl font-black tracking-tighter drop-shadow-[0_3px_18px_rgba(255,143,177,0.8)]">No.1 FAN</p>
      </div>
    </div>
  )
}

/* ---------- 最終: No.1 アップ紹介（テープ＆保存） ---------- */
function FinalScene({
  no1,
  monthKey,
  finalRef,
  onSave,
  onReplay,
  onClose,
}: {
  no1: LeaderEntry
  monthKey: string
  finalRef: React.RefObject<HTMLDivElement>
  onSave: () => void
  onReplay: () => void
  onClose: () => void
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-5">
      {/* 撮影対象カード */}
      <div
        ref={finalRef}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a1640] via-[#3a1d4f] to-[#1a0f2a] p-6 text-center"
        style={{ animation: 'film-rise 0.8s ease-out both' }}
      >
        {/* テープ（飛ぶ） */}
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute top-0 h-[140%] w-1.5 rounded-full"
            style={{
              left: `${5 + rnd(i, 31) * 90}%`,
              background: PEN_COLORS[i % PEN_COLORS.length],
              opacity: 0.8,
              animation: `film-tape-fall ${2.4 + rnd(i, 32) * 1.6}s linear ${rnd(i, 33) * 1.2}s infinite`,
            }}
          />
        ))}

        <p className="relative text-sm font-bold tracking-widest text-oshi-pink">👑 {monthLabel(monthKey)}</p>
        <div className="relative mx-auto mt-3 inline-block rounded-full" style={{ animation: 'film-glow-pulse 2s ease-in-out infinite' }}>
          <Avatar src={no1.avatar} name={no1.name} size={140} ring />
        </div>
        <p className="relative mt-4 text-4xl font-black drop-shadow">{no1.name}</p>
        <span className="relative mt-2 inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-extrabold">
          No.1 FAN
        </span>
        <div className="relative mt-4 flex justify-center gap-4 text-sm font-bold">
          <span>🎤 {no1.live}</span>
          <span>🤝 {no1.event}</span>
          <span>💞 {no1.meet}回</span>
        </div>
        <p className="relative mt-4 text-[11px] font-bold opacity-70">#OshiHub ・ oshilink-b8fab.web.app</p>
      </div>

      {/* 操作 */}
      <div className="mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
        <button onClick={onReplay} className="rounded-full bg-white/15 py-3 text-sm font-extrabold backdrop-blur active:scale-95">
          🔁 もう一度
        </button>
        <button onClick={onSave} className="rounded-full bg-white py-3 text-sm font-extrabold text-oshi-purple active:scale-95">
          📸 画像保存
        </button>
        <button onClick={onClose} className="rounded-full bg-white/15 py-3 text-sm font-extrabold backdrop-blur active:scale-95">
          閉じる
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] opacity-70">画面収録すればショート動画に！来月は君が主役かも🔥</p>
    </div>
  )
}

/* ---------- イントロ ---------- */
function IntroScene({ monthKey }: { monthKey: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1030] to-black">
      <div className="text-center" style={{ animation: 'film-rise 1s ease-out both' }}>
        <p className="text-sm font-bold tracking-[0.3em] opacity-80">OSHIHUB PRESENTS</p>
        <p className="mt-3 text-3xl font-black drop-shadow">{monthLabel(monthKey)}</p>
        <p className="mt-1 text-xl font-extrabold text-oshi-pink">月間ファンランキング 発表</p>
        <p className="mt-6 animate-pulse text-xs font-bold opacity-70">タップで進む ▶</p>
      </div>
    </div>
  )
}
