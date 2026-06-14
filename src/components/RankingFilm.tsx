import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Avatar } from './Avatar'
import { monthLabel } from '@/utils/wrapped'
import { FilmAudio } from '@/utils/filmAudio'
import { SAMPLE_TOP5, type LeaderEntry } from '@/services/leaderboardService'

/**
 * 月間ランキング発表ムービー（アイドル視点のシネマティック演出＋合成BGM）。
 * 4幕: 豪華アリーナ(TOP30) → 別会場(TOP15) → 家でSNSエゴサ(TOP5) → 特典会(No.1)。
 * 設定済みアイコンを使い、フルスクリーンで自動再生。画面収録でショート動画に。
 */

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
    out.push({
      uid: `filler_${i}`,
      name: FILLER_NAMES[i % FILLER_NAMES.length],
      score: Math.max(2, 60 - out.length * 2),
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

const rnd = (i: number, salt: number) => {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const PEN_COLORS = ['#FF8FB1', '#B79CED', '#8FD3FF', '#FFFFFF', '#9CE0D6', '#FFD36E', '#FF6FA3']

type Scene =
  | 'intro' | 'dome' | 'day2' | 'venue' | 'dark2' | 'sns' | 'black' | 'booth' | 'hand' | 'reveal' | 'final'

const ORDER: { scene: Scene; ms: number }[] = [
  { scene: 'intro', ms: 2200 },
  { scene: 'dome', ms: 8500 },
  { scene: 'day2', ms: 2200 },
  { scene: 'venue', ms: 8200 },
  { scene: 'dark2', ms: 1600 },
  { scene: 'sns', ms: 12500 },
  { scene: 'black', ms: 1500 },
  { scene: 'booth', ms: 4600 },
  { scene: 'hand', ms: 4000 },
  { scene: 'reveal', ms: 2800 },
  { scene: 'final', ms: 0 },
]

// 行レイアウト（アイコンを見やすく並べる）
function rowLayout(
  count: number,
  rows: number,
  cfg: { left0: number; left1: number; topBack: number; topFront: number; scaleBack: number; scaleFront: number }
) {
  const perRow = Math.ceil(count / rows)
  const items: { left: number; top: number; scale: number; delay: number; z: number }[] = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow)
    const idx = i % perRow
    const countInRow = Math.min(perRow, count - row * perRow)
    const t = (idx + 0.5) / countInRow
    const depth = rows === 1 ? 1 : row / (rows - 1) // 0=奥 .. 1=手前
    items.push({
      left: cfg.left0 + (cfg.left1 - cfg.left0) * t + (rnd(i, 7) - 0.5) * 2.5,
      top: cfg.topBack + (cfg.topFront - cfg.topBack) * depth + (rnd(i, 8) - 0.5) * 2,
      scale: cfg.scaleBack + (cfg.scaleFront - cfg.scaleBack) * depth,
      delay: (rows - 1 - row) * 0.16 + rnd(i, 9) * 0.22,
      z: row,
    })
  }
  return items
}

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
  const [muted, setMuted] = useState(false)
  const finalRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<FilmAudio | null>(null)
  if (!audioRef.current) audioRef.current = new FilmAudio()
  const scene = ORDER[step].scene

  // 自動進行
  useEffect(() => {
    const ms = ORDER[step].ms
    if (ms <= 0) return
    const t = setTimeout(() => setStep((s) => Math.min(ORDER.length - 1, s + 1)), ms)
    return () => clearTimeout(t)
  }, [step])

  // 音の演出（シーン連動）
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    let imp: number | undefined
    switch (scene) {
      case 'intro': a.start(); a.intensity(0); a.chord('base'); a.beat(0); a.sparkle(); break
      case 'dome': a.start(); a.chord('bright'); a.intensity(2); a.beat(0.4); a.cheer(true); break
      case 'day2': a.cheer(false); a.beat(0); a.intensity(0); break
      case 'venue': a.chord('bright'); a.intensity(2); a.beat(0.45); a.cheer(true); a.sparkle(); break
      case 'dark2': a.cheer(false); a.beat(0); a.intensity(0); break
      case 'sns': a.cheer(false); a.beat(0.12); a.chord('base'); a.intensity(1); break
      case 'black': a.beat(0); a.intensity(0); break
      case 'booth': a.cheer(false); a.beat(0); a.chord('tension'); a.intensity(1); break
      case 'hand': a.chord('tension'); a.intensity(2); a.riser(3.4); break // ガチャの期待ライザー
      case 'reveal': a.sparkle(); a.chimeUp(); imp = window.setTimeout(() => a.impact(), 850); break
      case 'final': a.impact(); a.triumph(); a.cheer(true); break
    }
    return () => { if (imp) window.clearTimeout(imp) }
  }, [scene])

  // アンマウントで停止
  useEffect(() => () => audioRef.current?.stop(), [])

  const advance = () => {
    audioRef.current?.start() // ユーザー操作で音声を解禁
    setStep((s) => Math.min(ORDER.length - 1, s + 1))
  }
  const replay = () => setStep(0)
  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    audioRef.current?.setMuted(m)
  }

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
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black">
    <div
      className="relative mx-auto h-full w-full max-w-[460px] overflow-hidden text-white"
      onClick={scene === 'final' ? undefined : advance}
    >
      {/* ミュート */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute() }}
        className="absolute left-4 top-7 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base backdrop-blur active:scale-90"
        aria-label="音オン/オフ"
      >
        {muted ? '🔇' : '🔊'}
      </button>
      {/* 閉じる */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute right-4 top-7 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur active:scale-90"
        aria-label="閉じる"
      >
        ✕
      </button>

      {scene !== 'final' && (
        <button
          onClick={(e) => { e.stopPropagation(); advance() }}
          className="absolute bottom-5 right-5 z-50 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold backdrop-blur active:scale-95"
        >
          スキップ ▶
        </button>
      )}

      {scene === 'intro' && <IntroScene monthKey={monthKey} />}
      {scene === 'dome' && <DomeScene key="dome" fans={fans.slice(0, 30)} />}
      {scene === 'day2' && <LabelScene text="別日──" sub="会場を移して" />}
      {scene === 'venue' && <VenueScene key="venue" fans={fans.slice(0, 15)} />}
      {scene === 'dark2' && <LabelScene text="そして" sub="ある夜のこと" />}
      {scene === 'sns' && <SnsScene top5={top5} />}
      {scene === 'black' && <div className="h-full w-full bg-black" />}
      {scene === 'booth' && <BoothScene showHand={false} />}
      {scene === 'hand' && <BoothScene showHand />}
      {scene === 'reveal' && <RevealScene />}
      {scene === 'final' && (
        <FinalScene no1={no1} monthKey={monthKey} finalRef={finalRef} onSave={saveImage} onReplay={replay} onClose={onClose} />
      )}

      {scene !== 'final' && (
        <div className="absolute left-0 top-0 z-40 flex w-full gap-1 p-2">
          {ORDER.slice(0, -1).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-white/90' : 'bg-white/25'}`} />
          ))}
        </div>
      )}
    </div>
    </div>
  )
}

/* ===== ペンライトの海 ===== */
function PenlightSea({ count = 70, top0 = 38, top1 = 94 }: { count?: number; top0?: number; top1?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }).map((_, i) => {
        const left = rnd(i, 1) * 100
        const depth = rnd(i, 2)
        const top = top0 + depth * (top1 - top0)
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
            <div className="mx-auto h-5 w-[3px] rounded-full bg-white/30" />
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

/** アイコン＋ペンライト（応援する1人） */
function FanIcon({ f, size, i }: { f: LeaderEntry; size: number; i: number }) {
  const penColor = PEN_COLORS[Math.floor(rnd(i, 13) * PEN_COLORS.length)]
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="absolute -right-2 -top-4 h-7 w-[5px] origin-bottom rounded-full"
        style={{ background: penColor, boxShadow: `0 0 8px 2px ${penColor}`, animation: `film-pen-swing 1.3s ease-in-out ${rnd(i, 15)}s infinite` }}
      />
      {/* 暗い縁取りで明るいアイコンも見やすく */}
      <div className="rounded-full p-[2px]" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.55)' }}>
        <Avatar src={f.avatar} name={f.name} size={size} ring />
      </div>
      <span className="mt-0.5 max-w-[68px] truncate rounded-full bg-black/40 px-1.5 text-[9px] font-bold leading-4">
        {f.name}
      </span>
    </div>
  )
}

/* ===== 豪華アリーナ（TOP30・2階席あり／1階にTOP30） ===== */
function DomeScene({ fans }: { fans: LeaderEntry[] }) {
  const layout = rowLayout(30, 5, { left0: 9, left1: 91, topBack: 47, topFront: 80, scaleBack: 0.62, scaleFront: 1.05 })
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 背景：豪華なアリーナ */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 90% at 50% 118%, #FF8FB155 0%, #2a1640 48%, #0a0618 100%)' }} />
      {/* ステージのスポット光 */}
      <div className="absolute left-1/2 top-0 h-full w-[80%] -translate-x-1/2 bg-gradient-to-b from-white/15 via-transparent to-transparent blur-2xl" />
      <div className="absolute left-[18%] top-0 h-[70%] w-24 -translate-x-1/2 rotate-12 bg-gradient-to-b from-amber-200/25 to-transparent blur-xl" />
      <div className="absolute left-[82%] top-0 h-[70%] w-24 -translate-x-1/2 -rotate-12 bg-gradient-to-b from-sky-200/25 to-transparent blur-xl" />

      {/* 2階席（バルコニー）＋手すり */}
      <div className="absolute inset-x-0 top-[14%] h-[20%]">
        <PenlightSea count={42} top0={0} top1={70} />
        <div className="absolute bottom-0 h-3 w-full bg-gradient-to-b from-white/25 to-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
        <span className="absolute bottom-1 right-3 rounded bg-black/30 px-2 text-[10px] font-bold tracking-widest">2F STAND</span>
      </div>

      {/* 1階席のペンライト */}
      <PenlightSea count={46} top0={42} top1={92} />

      {/* 1階席：TOP30 のアイコン */}
      <div className="absolute inset-0">
        {fans.map((f, i) => (
          <div
            key={f.uid}
            className="absolute"
            style={{ left: `${layout[i].left}%`, top: `${layout[i].top}%`, transform: `translateX(-50%) scale(${layout[i].scale})`, zIndex: 10 + layout[i].z }}
          >
            <div style={{ animation: `film-avatar-pop 0.5s ease-out ${layout[i].delay}s both` }}>
              <FanIcon f={f} size={48} i={i} />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 top-[4%] text-center" style={{ animation: 'film-rise 0.7s ease-out both' }}>
        <p className="text-xs font-bold tracking-widest opacity-90 drop-shadow">月間ファンランキング</p>
        <p className="mt-1 text-6xl font-black drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">TOP 30</p>
        <p className="mt-1 text-xs font-bold opacity-90 drop-shadow">満員のアリーナ・ペンライトの海</p>
      </div>
    </div>
  )
}

/* ===== 別会場（TOP15・1回目より豪華／2F・3F＋レーザー＋ピロ＋大型スクリーン） ===== */
function VenueScene({ fans }: { fans: LeaderEntry[] }) {
  const layout = rowLayout(15, 3, { left0: 13, left1: 87, topBack: 48, topFront: 82, scaleBack: 0.84, scaleFront: 1.3 })
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 背景：金×マゼンタ×紫の最大級ステージ */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(135% 95% at 50% 122%, #FFD36E55 0%, #FF6FA34d 26%, #4a1d6e 60%, #07040f 100%)' }} />
      {/* 大型スクリーン（ステージ奥） */}
      <div
        className="absolute left-1/2 top-[9%] h-[20%] w-[64%] -translate-x-1/2 rounded-xl border border-white/20 bg-gradient-to-br from-oshi-pink/40 via-oshi-purple/40 to-oshi-blue/40"
        style={{ animation: 'film-screen-pulse 1.8s ease-in-out infinite', boxShadow: '0 0 40px 6px rgba(255,143,177,0.35)' }}
      >
        <div className="flex h-full items-center justify-center text-4xl font-black tracking-widest opacity-90 drop-shadow">♡ TOP 15</div>
      </div>

      {/* レーザー（上隅から左右に走査） */}
      <Lasers />
      {/* 中央スポット光 */}
      <div className="absolute left-1/2 top-0 h-full w-[72%] -translate-x-1/2 bg-gradient-to-b from-white/18 via-transparent to-transparent blur-2xl" />

      {/* 3F / 2F スタンド（ぐるりと囲む観客） */}
      <div className="absolute inset-x-0 top-[30%] h-[12%]">
        <PenlightSea count={48} top0={0} top1={70} />
        <div className="absolute bottom-0 h-2.5 w-full bg-gradient-to-b from-white/25 to-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
        <span className="absolute bottom-0.5 right-3 rounded bg-black/30 px-2 text-[10px] font-bold tracking-widest">3F</span>
      </div>
      <div className="absolute inset-x-0 top-[42%] h-[12%]">
        <PenlightSea count={54} top0={0} top1={70} />
        <div className="absolute bottom-0 h-2.5 w-full bg-gradient-to-b from-white/25 to-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
        <span className="absolute bottom-0.5 right-3 rounded bg-black/30 px-2 text-[10px] font-bold tracking-widest">2F</span>
      </div>
      {/* 左右のサイドスタンド（バウル状の囲み感） */}
      <div className="absolute left-0 top-[30%] h-[40%] w-10 bg-gradient-to-r from-white/10 to-transparent" />
      <div className="absolute right-0 top-[30%] h-[40%] w-10 bg-gradient-to-l from-white/10 to-transparent" />

      {/* 1F アリーナのペンライト */}
      <PenlightSea count={66} top0={56} top1={94} />

      {/* ステージ前のピロ（火花の噴水） */}
      <SparkFountain side="left" />
      <SparkFountain side="right" />

      {/* 金の紙吹雪 */}
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="pointer-events-none absolute top-0 h-3 w-1.5 rounded-sm"
          style={{ left: `${4 + rnd(i, 41) * 92}%`, background: i % 2 ? '#FFD36E' : '#FFF1B8', opacity: 0.85, animation: `film-tape-fall ${2.6 + rnd(i, 42) * 1.8}s linear ${rnd(i, 43) * 1.5}s infinite` }}
        />
      ))}

      {/* 1F：TOP15 のアイコン */}
      <div className="absolute inset-0">
        {fans.map((f, i) => (
          <div
            key={f.uid}
            className="absolute"
            style={{ left: `${layout[i].left}%`, top: `${layout[i].top}%`, transform: `translateX(-50%) scale(${layout[i].scale})`, zIndex: 20 + layout[i].z }}
          >
            <div style={{ animation: `film-avatar-pop 0.5s ease-out ${layout[i].delay}s both` }}>
              <FanIcon f={f} size={58} i={i} />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 top-[2%] text-center" style={{ animation: 'film-rise 0.7s ease-out both' }}>
        <p className="text-xs font-bold tracking-[0.3em] text-amber-200 drop-shadow">別会場・最大級のステージ</p>
        <p
          className="mt-0.5 text-6xl font-black drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
          style={{ background: 'linear-gradient(180deg,#FFF1B8,#FFD36E)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
        >
          TOP 15
        </p>
      </div>
    </div>
  )
}

/* レーザー光（上隅から走査） */
function Lasers() {
  const beams = [
    { left: '12%', color: '#8FD3FF' },
    { left: '32%', color: '#FF6FA3' },
    { left: '68%', color: '#B79CED' },
    { left: '88%', color: '#9CE0D6' },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {beams.map((b, i) => (
        <div
          key={i}
          className="absolute top-0 h-[85%] w-[3px] origin-top"
          style={{
            left: b.left,
            background: `linear-gradient(180deg, ${b.color}, transparent)`,
            boxShadow: `0 0 12px 2px ${b.color}`,
            animation: `film-laser ${2.4 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ステージ前のピロ（火花の噴水） */
function SparkFountain({ side }: { side: 'left' | 'right' }) {
  return (
    <div className="pointer-events-none absolute bottom-[14%]" style={{ [side]: '20%' } as React.CSSProperties}>
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute bottom-0 h-1.5 w-1.5 rounded-full"
          style={{
            left: `${(rnd(i, 51) - 0.5) * 40}px`,
            background: i % 2 ? '#FFD36E' : '#FFFFFF',
            boxShadow: '0 0 8px 2px #FFD36E',
            animation: `film-spark-up ${0.9 + rnd(i, 52) * 0.7}s ease-out ${rnd(i, 53) * 1.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/* ===== 場面転換ラベル ===== */
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

/* ===== SNSエゴサ（アイドルの家でスマホ・TOP5・上位3にハート長め） ===== */
function SnsScene({ top5 }: { top5: LeaderEntry[] }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <HomeRoom />
      <div className="relative flex h-full w-full items-center justify-center px-4">
        <div className="relative w-full max-w-[300px]" style={{ animation: 'film-rise 0.7s ease-out both' }}>
          <p className="mb-2 text-center text-xs font-bold tracking-widest opacity-70">― おうちでエゴサ中 ―</p>
          <div className="rounded-[2rem] border-4 border-white/15 bg-[#0c0a14] p-3 shadow-2xl">
            <p className="mb-2 px-1 text-[13px] font-bold text-sky-300">🔍 推しの名前で検索…</p>
            <div className="space-y-2">
              {top5.map((f, i) => (
                <div
                  key={f.uid}
                  className="flex items-start gap-2 rounded-2xl bg-white/[0.06] p-2.5"
                  style={{ animation: `film-rise 0.5s ease-out ${0.3 + i * 0.4}s both` }}
                >
                  <Avatar src={f.avatar} name={f.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">
                      {f.name} <span className="font-normal opacity-50">@fan{i + 1}</span>
                    </p>
                    <p className="text-[11px] leading-snug opacity-90">{TWEETS[i % TWEETS.length]}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] opacity-70">
                      <span className="relative inline-flex h-4 w-4 items-center justify-center">
                        <span>🤍</span>
                        {i < 3 && (
                          <span className="absolute inset-0 flex items-center justify-center" style={{ animation: `film-heart-pop 0.6s ease-out ${3 + i * 1.4}s both` }}>
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
          {/* リアルな指（下からタップ） */}
          <div className="absolute -bottom-6 right-2" style={{ animation: 'film-float-y 1.6s ease-in-out infinite' }}>
            <TapHand />
          </div>
        </div>
      </div>
      <p className="absolute bottom-5 left-0 right-0 text-center text-xs font-bold opacity-80">上位3名に、推しが「いいね」した…！</p>
    </div>
  )
}

/* アイドルの家（夜の部屋）の背景 — できるだけかわいく */
function HomeRoom() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 壁（やさしいパステル・モーヴ） */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#6a5279 0%,#54416a 50%,#3a2c4d 100%)' }} />
      {/* 壁紙のハート柄（うっすら） */}
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={`w${i}`} className="absolute text-sm opacity-[0.08]" style={{ left: `${(i % 4) * 26 + 6}%`, top: `${Math.floor(i / 4) * 16 + 8}%` }}>♥</span>
      ))}
      {/* ランプの暖かい光 */}
      <div className="absolute -right-10 top-2 h-44 w-44 rounded-full bg-pink-200/25 blur-3xl" />
      <div className="absolute -left-8 top-1/3 h-36 w-36 rounded-full bg-amber-200/20 blur-3xl" />

      {/* ハートのガーランド（上部） */}
      <div className="absolute inset-x-0 top-1 flex justify-around px-2">
        {Array.from({ length: 11 }).map((_, i) => (
          <span key={`g${i}`} className="text-xs" style={{ color: ['#ff9ec7', '#ffd6e6', '#c9b6ff', '#ffe0a3'][i % 4], transform: `translateY(${i % 2 ? 4 : 0}px) rotate(${i % 2 ? 8 : -8}deg)`, filter: 'drop-shadow(0 0 3px rgba(255,158,199,0.6))', animation: `film-twinkle ${1.4 + rnd(i, 95)}s ease-in-out ${rnd(i, 96)}s infinite` }}>♥</span>
        ))}
      </div>

      {/* 窓（夜空＋月＋星）＋ピンクのカーテン */}
      <div className="absolute left-4 top-8 h-28 w-24 overflow-hidden rounded-xl border-4 border-[#caa6e0]" style={{ background: 'linear-gradient(180deg,#27407a,#14224a)' }}>
        <div className="absolute right-2 top-2 h-7 w-7 rounded-full bg-[#fff3c4]" style={{ boxShadow: '0 0 10px 3px #fff3c4aa' }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={`st${i}`} className="absolute text-[8px] text-white" style={{ left: `${10 + rnd(i, 91) * 70}%`, top: `${28 + rnd(i, 92) * 60}%`, animation: `film-twinkle ${1 + rnd(i, 93)}s ease-in-out ${rnd(i, 94)}s infinite` }}>✦</span>
        ))}
      </div>
      <div className="absolute left-2 top-7 h-28 w-5 rounded-b-full bg-[#ff9ec7]/70" />
      <div className="absolute left-[104px] top-7 h-28 w-5 rounded-b-full bg-[#ff9ec7]/70" />

      {/* ネオンのハート看板 */}
      <div className="absolute left-1/2 top-5 -translate-x-1/2 text-2xl" style={{ color: '#ff8fc8', filter: 'drop-shadow(0 0 8px #ff6fb0)', animation: 'film-glow-pulse 2.2s ease-in-out infinite' }}>♡</div>

      {/* 推しのポスター（パステル） */}
      <div className="absolute right-4 top-10 flex h-24 w-16 items-center justify-center rounded-md border-2 border-white/40 text-xl" style={{ background: 'linear-gradient(180deg,#b79cff,#ff9ec7)' }}>♡</div>
      <div className="absolute right-[88px] top-12 flex h-14 w-11 items-center justify-center rounded-md border-2 border-white/30 text-[9px] text-[#5b3f6e]" style={{ background: 'linear-gradient(180deg,#bff0e4,#a3d8ff)' }}>LIVE♪</div>

      {/* ドレッサー（丸い鏡） */}
      <div className="absolute left-4 top-[44%]">
        <div className="h-12 w-12 rounded-full border-4 border-[#ffd6e6]" style={{ background: 'radial-gradient(circle at 35% 30%, #ffffff66, #c9b6ff44)' }} />
        <div className="mt-1 h-5 w-16 rounded-md bg-[#7a5d8c]" />
        <div className="absolute left-2 top-9 text-sm">🌸</div>
      </div>

      {/* 観葉植物 */}
      <div className="absolute right-3 top-[46%] text-2xl">🪴</div>

      {/* ふわふわラグ */}
      <div className="absolute bottom-[24%] left-1/2 h-8 w-44 -translate-x-1/2 rounded-[50%] bg-[#ffc7de]/40 blur-[1px]" />

      {/* ベッド（パステルの掛け布団＋枕＋ぬいぐるみ＋ハートクッション＋ペンライト） */}
      <div className="absolute bottom-0 left-0 h-[26%] w-full" style={{ background: 'linear-gradient(180deg,#ffb3d9,#e98fc0)' }}>
        <div className="absolute -top-2 left-0 h-3 w-full rounded-t-2xl bg-[#fff0f7]" />
        <div className="absolute top-3 left-5 h-9 w-16 rounded-2xl bg-[#fff0f7]" />
        <div className="absolute right-5 top-0 text-3xl">🧸</div>
        <div className="absolute right-[68px] top-1 text-2xl">🐰</div>
        <div className="absolute right-[120px] top-3 text-xl">💗</div>
        <div className="absolute right-[150px] top-2 h-7 w-2 rotate-12 rounded-full" style={{ background: '#8FD3FF', boxShadow: '0 0 8px 2px #8FD3FF' }} />
      </div>

      {/* 漂うハート＆キラキラ */}
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={`f${i}`} className="absolute text-sm" style={{ left: `${10 + rnd(i, 81) * 80}%`, top: `${30 + rnd(i, 82) * 45}%`, color: '#ffd6e6', animation: `film-shimmer ${2 + rnd(i, 83) * 1.5}s ease-out ${rnd(i, 84) * 2.5}s infinite` }}>{i % 2 ? '✨' : '💕'}</span>
      ))}
    </div>
  )
}

/* ===== 特典会ブース（“いつもありがとう”と手を差し伸べる／1位はシルエット） ===== */
function BoothScene({ showHand }: { showHand: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#2a1840] to-[#0a0613]">
      {/* 特典会の看板（握手会と明示） */}
      <div className="absolute inset-x-0 top-6 text-center">
        <span className="rounded-full bg-white/12 px-4 py-1 text-sm font-black tracking-widest shadow">🎫 特典会・握手会</span>
      </div>

      {/* 場面説明（何のシーンか分かるように） */}
      <div className="absolute inset-x-0 top-[14%] text-center" style={{ animation: 'film-rise 0.7s ease-out both' }}>
        <p className="text-xs font-bold tracking-widest text-amber-200">
          {showHand ? '推しが、両手で「ありがとう」を伝えにきた──' : '今月いちばん応援してくれた“No.1 FAN”との特典会'}
        </p>
      </div>

      {/* ブースの仕切り（パーテーション） */}
      <div className="absolute left-3 top-[24%] h-[50%] w-1.5 rounded bg-white/15" />
      <div className="absolute right-3 top-[24%] h-[50%] w-1.5 rounded bg-white/15" />
      {/* ぼかした客席 */}
      <div className="absolute inset-0 opacity-25 blur-md">
        <PenlightSea count={22} top0={22} top1={52} />
      </div>

      {/* 1位＝黒い人型シルエット（机の向こうで推しと向き合う／正体は伏せる） */}
      <div className="absolute left-1/2 top-[26%] -translate-x-1/2 text-center">
        <div style={{ animation: 'film-rise 0.8s ease-out both' }}>
          <Silhouette size={146} />
          <p className="mt-2 text-sm font-black tracking-widest text-white/90">No.1 FAN</p>
          <p className="text-[11px] opacity-60">（？？？）</p>
        </div>
      </div>

      {/* 机（テーブルクロス）＝特典会ブースの机 */}
      <div className="absolute bottom-0 left-0 h-[24%] w-full bg-gradient-to-b from-[#4a2e63] to-[#1a0f2a]">
        <div className="h-2 w-full bg-white/15" />
        <div className="absolute -top-3 left-1/2 h-3 w-44 -translate-x-1/2 rounded-t-md bg-white/10" />
      </div>

      {/* “いつもありがとう”と差し伸べる手 */}
      {showHand && (
        <>
          {/* セリフ吹き出し（推しの感謝） */}
          <div
            className="absolute left-1/2 top-[52%] z-20 -translate-x-1/2"
            style={{ animation: 'film-rise 0.6s ease-out 0.5s both' }}
          >
            <div className="relative rounded-2xl bg-white px-5 py-2.5 text-center text-[#3a1d4f] shadow-card">
              <p className="text-base font-black">いつも応援、ありがとう<span className="text-oshi-pink">♡</span></p>
              {/* 吹き出しのしっぽ */}
              <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white" />
            </div>
          </div>

          {/* 温かい光 */}
          <div className="pointer-events-none absolute bottom-[2%] left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-200/25 blur-2xl" />

          {/* 下から両手で差し伸べる（握手直前で停止） */}
          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2">
            <div style={{ animation: 'film-hand-rise 1.6s cubic-bezier(0.2,0.8,0.2,1) both' }}>
              <TwoHandReach />
            </div>
          </div>

          {/* ふわっと舞うハート */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="pointer-events-none absolute text-lg"
              style={{ left: `${40 + i * 5}%`, top: `${60 + rnd(i, 81) * 10}%`, animation: `film-shimmer ${1.6 + rnd(i, 82)}s ease-out ${0.8 + i * 0.25}s infinite` }}
            >
              💕
            </span>
          ))}
        </>
      )}
    </div>
  )
}

/* ===== ほわほわ→だーん→No.1 FAN（クライマックス・最大級） ===== */
function RevealScene() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
      {/* 放射状の光線（回転）＋インパクトで広がる光の輪 */}
      <Sunburst className="left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-60" delay={0.9} />
      <div
        className="absolute left-1/2 top-1/2 h-[60vmax] w-[60vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,211,110,0.5) 0%, transparent 60%)', animation: 'film-burst 1s ease-out 0.85s both' }}
      />
      {/* 白フラッシュ（だーんの瞬間） */}
      <div className="pointer-events-none absolute inset-0 bg-white" style={{ animation: 'film-flash 0.9s ease-out 0.85s both' }} />

      {/* ほわほわ */}
      {Array.from({ length: 26 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-2xl"
          style={{ left: `${6 + rnd(i, 21) * 88}%`, top: `${14 + rnd(i, 22) * 72}%`, animation: `film-shimmer 1.2s ease-out ${rnd(i, 23) * 0.85}s both` }}
        >
          ✨
        </span>
      ))}

      {/* だーん */}
      <div className="relative text-center" style={{ animation: 'film-slam 0.9s cubic-bezier(0.2,1.4,0.3,1) 0.9s both' }}>
        <p className="text-4xl font-black tracking-widest drop-shadow">👑</p>
        <p
          className="text-7xl font-black tracking-tighter drop-shadow-[0_3px_22px_rgba(255,211,110,0.9)]"
          style={{ background: 'linear-gradient(180deg,#FFF1B8,#FFD36E,#FF8FB1)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
        >
          No.1 FAN
        </p>
      </div>
    </div>
  )
}

/* 放射状サンバースト（回転する光線） */
function Sunburst({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={{
        background:
          'repeating-conic-gradient(from 0deg, rgba(255,211,110,0.22) 0deg 7deg, transparent 7deg 15deg)',
        WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 62%)',
        maskImage: 'radial-gradient(circle, #000 12%, transparent 62%)',
        animation: `film-spin 16s linear infinite, film-rise 0.8s ease-out ${delay}s both`,
      }}
    />
  )
}

/* ===== 最終：No.1 アップ紹介（テープ＆保存） ===== */
function FinalScene({
  no1, monthKey, finalRef, onSave, onReplay, onClose,
}: {
  no1: LeaderEntry
  monthKey: string
  finalRef: React.RefObject<HTMLDivElement>
  onSave: () => void
  onReplay: () => void
  onClose: () => void
}) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-5">
      {/* 全画面の祝祭バックドロップ（最大級の盛り上がり） */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, #4a1d6e 0%, #1a0f2a 55%, #050309 100%)' }} />
      <Sunburst className="left-1/2 top-[34%] h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-40" />
      {/* 客席のペンライト（歓声の callback） */}
      <div className="absolute bottom-0 left-0 h-[34%] w-full opacity-80">
        <PenlightSea count={40} top0={20} top1={92} />
      </div>
      {/* 全画面テープ＆金紙吹雪＆花火スパーク */}
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={`t${i}`}
          className="pointer-events-none absolute top-0 h-3 w-1.5 rounded-sm"
          style={{ left: `${3 + rnd(i, 61) * 94}%`, background: PEN_COLORS[i % PEN_COLORS.length], opacity: 0.85, animation: `film-tape-fall ${2.6 + rnd(i, 62) * 2}s linear ${rnd(i, 63) * 1.6}s infinite` }}
        />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={`s${i}`}
          className="pointer-events-none absolute text-lg"
          style={{ left: `${6 + rnd(i, 71) * 88}%`, top: `${10 + rnd(i, 72) * 70}%`, animation: `film-shimmer ${1.4 + rnd(i, 73)}s ease-out ${rnd(i, 74) * 2}s infinite` }}
        >
          ✨
        </span>
      ))}

      {/* 撮影対象カード */}
      <div
        ref={finalRef}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-200/30 bg-gradient-to-br from-[#2a1640] via-[#3a1d4f] to-[#1a0f2a] p-6 text-center shadow-[0_0_50px_8px_rgba(255,211,110,0.25)]"
        style={{ animation: 'film-slam 0.8s cubic-bezier(0.2,1.3,0.3,1) both' }}
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute top-0 h-[140%] w-1.5 rounded-full"
            style={{ left: `${5 + rnd(i, 31) * 90}%`, background: PEN_COLORS[i % PEN_COLORS.length], opacity: 0.8, animation: `film-tape-fall ${2.4 + rnd(i, 32) * 1.6}s linear ${rnd(i, 33) * 1.2}s infinite` }}
          />
        ))}
        <p className="relative text-sm font-bold tracking-widest text-amber-200">👑 {monthLabel(monthKey)}</p>
        <div className="relative mx-auto mt-3 inline-block rounded-full" style={{ animation: 'film-glow-pulse 2s ease-in-out infinite' }}>
          <Avatar src={no1.avatar} name={no1.name} size={148} ring />
        </div>
        <p className="relative mt-4 text-4xl font-black drop-shadow">{no1.name}</p>
        <span
          className="relative mt-2 inline-block rounded-full px-5 py-1 text-base font-black text-[#3a1d4f]"
          style={{ background: 'linear-gradient(180deg,#FFF1B8,#FFD36E)' }}
        >
          No.1 FAN
        </span>
        <div className="relative mt-4 flex justify-center gap-4 text-sm font-bold">
          <span>🎤 {no1.live}</span>
          <span>🤝 {no1.event}</span>
          <span>💞 {no1.meet}回</span>
        </div>
        <p className="relative mt-4 text-[11px] font-bold opacity-70">#OshiHub ・ oshilink-b8fab.web.app</p>
      </div>

      <div className="relative mt-5 grid w-full max-w-sm grid-cols-3 gap-2">
        <button onClick={onReplay} className="rounded-full bg-white/15 py-3 text-sm font-extrabold backdrop-blur active:scale-95">🔁 もう一度</button>
        <button onClick={onSave} className="rounded-full bg-white py-3 text-sm font-extrabold text-oshi-purple active:scale-95">📸 画像保存</button>
        <button onClick={onClose} className="rounded-full bg-white/15 py-3 text-sm font-extrabold backdrop-blur active:scale-95">閉じる</button>
      </div>
      <p className="relative mt-3 text-center text-[11px] opacity-70">画面収録すればショート動画に！来月は君が主役かも🔥</p>
    </div>
  )
}

/* ===== イントロ ===== */
function IntroScene({ monthKey }: { monthKey: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a1030] to-black">
      <div className="text-center" style={{ animation: 'film-rise 1s ease-out both' }}>
        <p className="text-sm font-bold tracking-[0.3em] opacity-80">OSHIHUB PRESENTS</p>
        <p className="mt-3 text-3xl font-black drop-shadow">{monthLabel(monthKey)}</p>
        <p className="mt-1 text-xl font-extrabold text-oshi-pink">月間ファンランキング 発表</p>
        <p className="mt-6 animate-pulse text-xs font-bold opacity-70">🔊 タップで進む ▶</p>
      </div>
    </div>
  )
}

/* ===== 手（SVG・なめらかな形） ===== */
function ReachHand() {
  // 下から差し伸べる開いた手（指は細め・長さに変化・爪と陰影で自然に）
  return (
    <svg width="186" height="250" viewBox="0 0 200 270" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAD7B8" />
          <stop offset="1" stopColor="#E0A57B" />
        </linearGradient>
        <linearGradient id="nail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE6D6" />
          <stop offset="1" stopColor="#F2CDB0" />
        </linearGradient>
      </defs>
      {/* 袖（ニット）＋前腕 */}
      <rect x="60" y="214" width="84" height="56" rx="18" fill="#6d5bd0" />
      <rect x="60" y="214" width="84" height="9" rx="4" fill="#7d6de0" />
      <rect x="80" y="150" width="40" height="78" rx="20" fill="url(#skin)" />

      {/* 指4本（手のひらの後ろに配置して付け根を自然に隠す） */}
      <g>
        <rect x="70" y="46" width="18" height="88" rx="9" fill="url(#skin)" transform="rotate(-7 79 128)" />
        <rect x="91" y="32" width="19" height="100" rx="9.5" fill="url(#skin)" />
        <rect x="112" y="44" width="18" height="90" rx="9" fill="url(#skin)" transform="rotate(6 121 128)" />
        <rect x="132" y="64" width="15" height="72" rx="7.5" fill="url(#skin)" transform="rotate(14 139 128)" />
      </g>
      {/* 爪 */}
      <rect x="74" y="50" width="11" height="13" rx="5" fill="url(#nail)" transform="rotate(-7 79 56)" />
      <rect x="95" y="37" width="12" height="14" rx="6" fill="url(#nail)" />
      <rect x="116" y="49" width="11" height="13" rx="5" fill="url(#nail)" transform="rotate(6 121 55)" />
      <rect x="134" y="69" width="10" height="11" rx="5" fill="url(#nail)" transform="rotate(14 139 74)" />

      {/* 手のひら（指の上に重ねてナックルを作る） */}
      <path d="M58 142c0-18 12-28 42-28s42 10 42 28l-4 40c-2 18-18 28-38 28s-36-10-38-28l-4-40z" fill="url(#skin)" />
      {/* 親指（手前・横から） */}
      <rect x="40" y="150" width="20" height="56" rx="10" fill="url(#skin)" transform="rotate(-50 60 162)" />
      <rect x="44" y="152" width="12" height="13" rx="6" fill="url(#nail)" transform="rotate(-50 56 158)" />

      {/* 指の境目＆手のひらの陰影 */}
      <g stroke="#00000018" strokeWidth="2" strokeLinecap="round">
        <path d="M90 126l1 16" />
        <path d="M110 124l0 16" />
        <path d="M130 127l-1 15" />
      </g>
      <path d="M62 166c10 7 24 11 38 11s28-4 38-11l-3 18c-2 16-17 25-35 25s-33-9-35-25l-3-18z" fill="#0000000f" />
    </svg>
  )
}

/* 両手で差し伸べる（握手するように左右の手をそろえて出す） */
function TwoHandReach() {
  return (
    <div className="relative" style={{ width: 296, height: 250 }}>
      <div className="absolute bottom-0 left-0 origin-bottom" style={{ transform: 'rotate(12deg)' }}>
        <div className="origin-bottom scale-[0.84]">
          <ReachHand />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 origin-bottom" style={{ transform: 'scaleX(-1) rotate(12deg)' }}>
        <div className="origin-bottom scale-[0.84]">
          <ReachHand />
        </div>
      </div>
    </div>
  )
}

function TapHand() {
  // 人差し指を立ててタップする手（こぶし＋立てた指）
  return (
    <svg width="96" height="128" viewBox="0 0 110 150" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="skin2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAD7B8" />
          <stop offset="1" stopColor="#E0A57B" />
        </linearGradient>
      </defs>
      <rect x="26" y="116" width="56" height="34" rx="14" fill="#6d5bd0" />
      {/* こぶし */}
      <rect x="26" y="66" width="58" height="58" rx="22" fill="url(#skin2)" />
      {/* 折った指のふくらみ */}
      <g fill="#00000012">
        <rect x="32" y="70" width="46" height="3" rx="1.5" />
        <rect x="32" y="84" width="46" height="3" rx="1.5" />
      </g>
      {/* 立てた人差し指 */}
      <rect x="44" y="12" width="18" height="66" rx="9" fill="url(#skin2)" />
      <rect x="48" y="16" width="11" height="12" rx="5" fill="#FBE6D6" />
      {/* 親指 */}
      <rect x="20" y="80" width="16" height="34" rx="8" fill="url(#skin2)" transform="rotate(-32 28 92)" />
    </svg>
  )
}

/* ===== 黒い人型シルエット（1位・正体を伏せる） ===== */
function Silhouette({ size }: { size: number }) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />
      <svg width={size} height={size} viewBox="0 0 120 120" className="relative">
        <defs>
          <linearGradient id="silh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b1b22" />
            <stop offset="1" stopColor="#000000" />
          </linearGradient>
        </defs>
        {/* 肩 */}
        <path d="M16 120c0-26 20-44 44-44s44 18 44 44H16z" fill="url(#silh)" />
        {/* 頭 */}
        <circle cx="60" cy="42" r="26" fill="url(#silh)" />
        {/* リムライト */}
        <path d="M86 30a26 26 0 01-2 36" stroke="#ffffff40" strokeWidth="2" fill="none" />
        <path d="M100 118c-2-20-14-34-30-40" stroke="#ffffff25" strokeWidth="2" fill="none" />
      </svg>
    </div>
  )
}
