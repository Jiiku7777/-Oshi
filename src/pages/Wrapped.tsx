import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAttendance } from '@/services/attendanceService'
import { computeWrapped, type WrappedStats } from '@/utils/wrapped'
import { Loading } from '@/components/Loading'
import { Seo } from '@/components/Seo'
import { nativeShare, shareToX } from '@/utils/share'
import { SITE } from '@/config/site'

/**
 * 推し活Wrapped（毎日更新の推し活サマリー）。
 * スクショ・ショート動画向けの映えるカード。上位X%を大きく表示。
 */
export function Wrapped() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let active = true
    fetchAttendance(profile.uid)
      .then((records) => {
        if (active) setStats(computeWrapped(records, profile.createdAt))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [profile])

  const shareText =
    stats &&
    `私の推し活、上位${stats.topPercent}%でした！🏆【${stats.tier}】\n` +
      `ライブ${stats.live}回／特典会${stats.event}回／推し活${stats.oshiDays}日\n#${SITE.name}`

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

            {/* 上位% ヘッドライン */}
            <div className="mt-5 rounded-card bg-white/15 px-5 py-6 text-center backdrop-blur">
              <p className="text-sm font-bold opacity-90">あなたは</p>
              <p className="my-1 text-5xl font-black drop-shadow">
                🏆 上位{stats.topPercent}%
              </p>
              <p className="text-lg font-extrabold">ファン</p>
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
