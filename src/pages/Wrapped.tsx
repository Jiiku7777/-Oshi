import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAttendance } from '@/services/attendanceService'
import {
  fetchTopLeaders,
  removeFromLeaderboard,
  upsertLeaderboard,
  type LeaderEntry,
} from '@/services/leaderboardService'
import { computeWrapped, type WrappedStats } from '@/utils/wrapped'
import { Loading } from '@/components/Loading'
import { Seo } from '@/components/Seo'
import { nativeShare, shareToX } from '@/utils/share'
import { SITE } from '@/config/site'

export function Wrapped() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)

  const rankPublic = profile?.rankPublic !== false // 既定で公開
  const defaultName = profile?.rankName || profile?.displayName?.split(' ')[0] || 'ファン'

  // 参戦記録 → 集計
  useEffect(() => {
    if (!profile) return
    let active = true
    fetchAttendance(profile.uid)
      .then((records) => active && setStats(computeWrapped(records, profile.createdAt)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [profile])

  // ランキングへの反映＆取得
  useEffect(() => {
    if (!stats || !profile) return
    let active = true
    const sync = async () => {
      if (rankPublic) await upsertLeaderboard(profile.uid, defaultName, stats)
      else await removeFromLeaderboard(profile.uid)
      const top = await fetchTopLeaders(100)
      if (active) setLeaders(top)
    }
    sync()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, rankPublic, defaultName])

  const myRank = useMemo(() => {
    if (!profile) return null
    const idx = leaders.findIndex((l) => l.uid === profile.uid)
    return idx >= 0 ? idx + 1 : null
  }, [leaders, profile])

  const shareText =
    stats &&
    (myRank
      ? `推し活ランキング ${myRank}位！🏆【${stats.tier}】\nライブ${stats.live}回／特典会${stats.event}回／推し活${stats.oshiDays}日\n#${SITE.name}`
      : `私の推し活、上位${stats.topPercent}%！🏆【${stats.tier}】\nライブ${stats.live}回／特典会${stats.event}回\n#${SITE.name}`)

  const handleShare = () => {
    if (!shareText) return
    nativeShare({ title: '私の推し活Wrapped', text: shareText, url: SITE.url }).then(
      (ok) => !ok && shareToX(shareText, SITE.url)
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue">
      <Seo title="推し活Wrapped" path="/wrapped" noindex />
      <div className="mx-auto min-h-dvh max-w-md px-5 py-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-lg text-white backdrop-blur active:scale-95"
          aria-label="戻る"
        >
          ‹
        </button>

        {loading || !stats ? (
          <div className="text-white">
            <Loading label="集計中…" />
          </div>
        ) : (
          <div className="animate-fade-in text-white">
            <p className="text-center text-sm font-bold tracking-widest opacity-90">
              ✨ あなたの推し活レベル ✨
            </p>

            {/* ヘッドライン：順位 or 上位% */}
            <div className="mt-4 rounded-card bg-white/15 px-5 py-6 text-center backdrop-blur">
              <p className="text-sm font-bold opacity-90">あなたは</p>
              {myRank ? (
                <>
                  <p className="my-1 text-5xl font-black drop-shadow">🏆 {myRank}位</p>
                  <p className="text-sm font-bold opacity-90">
                    全{leaders.length}人中 ・ 上位{stats.topPercent}%
                  </p>
                </>
              ) : (
                <>
                  <p className="my-1 text-5xl font-black drop-shadow">🏆 上位{stats.topPercent}%</p>
                  <p className="text-lg font-extrabold">ファン</p>
                </>
              )}
              <span className="mt-2 inline-block rounded-full bg-white/25 px-4 py-1 text-sm font-bold">
                称号：{stats.tier}
              </span>
            </div>

            {/* 統計 */}
            <div className="mt-5 space-y-2.5">
              <StatRow emoji="🎤" label="ライブ参加" value={`${stats.live}回`} />
              <StatRow emoji="🤝" label="特典会参加" value={`${stats.event}回`} />
              <StatRow emoji="💞" label="推しに会った回数" value={`${stats.meet}回`} highlight />
              <StatRow emoji="📅" label="推し活日数" value={`${stats.oshiDays}日`} />
            </div>

            {/* ランキング */}
            <section className="mt-6">
              <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold">
                🏆 ファンランキング
              </h2>
              <div className="space-y-1.5 rounded-card bg-white/15 p-3 backdrop-blur">
                {leaders.slice(0, 10).map((l, i) => (
                  <LeaderRow
                    key={l.uid}
                    rank={i + 1}
                    entry={l}
                    me={l.uid === profile?.uid}
                  />
                ))}
                {myRank && myRank > 10 && (
                  <>
                    <p className="py-1 text-center text-xs opacity-70">…</p>
                    <LeaderRow
                      rank={myRank}
                      entry={leaders[myRank - 1]}
                      me
                    />
                  </>
                )}
                {leaders.length === 0 && (
                  <p className="py-4 text-center text-sm opacity-80">
                    まだ誰もいません。最初のランカーになろう！
                  </p>
                )}
              </div>
            </section>

            {/* 名前公開トグル */}
            <div className="mt-4 flex items-center justify-between rounded-card bg-white/15 px-4 py-3 backdrop-blur">
              <div>
                <p className="text-sm font-bold">ランキングに名前を出す</p>
                <p className="text-[11px] opacity-80">
                  {rankPublic ? `表示名：${defaultName}` : '今は非公開です'}
                </p>
              </div>
              <button
                onClick={() => updateProfile({ rankPublic: !rankPublic })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  rankPublic ? 'bg-white' : 'bg-white/30'
                }`}
                aria-label="名前公開切替"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${
                    rankPublic ? 'left-[1.375rem] bg-oshi-pink' : 'left-0.5 bg-white'
                  }`}
                />
              </button>
            </div>

            {/* シェア */}
            <button
              onClick={handleShare}
              className="mt-6 w-full rounded-full bg-white py-3.5 font-extrabold text-oshi-pink shadow-card transition active:scale-[0.98]"
            >
              📲 シェアする（自慢する）
            </button>
            <p className="mt-2 text-center text-[11px] opacity-80">
              スクショしてストーリーやショート動画にも使えます
            </p>

            <p className="mt-6 text-center text-xs font-bold opacity-80">
              #{SITE.name} ・ {SITE.url.replace('https://', '')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaderRow({ rank, entry, me }: { rank: number; entry: LeaderEntry; me?: boolean }) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
        me ? 'bg-white text-oshi-pink' : ''
      }`}
    >
      <span className={`w-7 shrink-0 text-center text-sm font-black ${me ? '' : 'opacity-90'}`}>
        {medal}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">
        {entry.name}
        {me && ' (あなた)'}
      </span>
      <span className="shrink-0 text-xs font-bold opacity-90">
        会った{entry.meet}回
      </span>
    </div>
  )
}

function StatRow({
  emoji,
  label,
  value,
  highlight,
}: {
  emoji: string
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-card px-4 py-3 backdrop-blur ${
        highlight ? 'bg-white/30' : 'bg-white/15'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <span className="text-lg">{emoji}</span>
        {label}
      </span>
      <span className="text-xl font-black">{value}</span>
    </div>
  )
}
