import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAttendance } from '@/services/attendanceService'
import {
  removeFromLeaderboard,
  removeGroupRankings,
  removeMonthly,
  upsertGroupRankings,
  upsertLeaderboard,
  upsertMonthly,
} from '@/services/leaderboardService'
import {
  computeGroupStats,
  computeMonthlyStats,
  computeWrapped,
  currentMonthKey,
  percentileFromScore,
  type GroupStat,
  type WrappedStats,
} from '@/utils/wrapped'
import { Loading } from '@/components/Loading'
import { Seo } from '@/components/Seo'
import { Avatar } from '@/components/Avatar'
import { getGroupName } from '@/data/groups'
import { nativeShare, shareToX } from '@/utils/share'
import { fileToAvatarDataUrl } from '@/utils/avatar'
import { SITE } from '@/config/site'

export function Wrapped() {
  const { profile, updateProfile } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [groupStats, setGroupStats] = useState<GroupStat[]>([])
  const [scope, setScope] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  const rankPublic = profile?.rankPublic !== false
  const displayName = profile?.rankName || profile?.displayName?.split(' ')[0] || 'ファン'
  const oshiIds = profile?.oshiGroupIds ?? []
  const avatar = profile?.avatar
  const [avatarBusy, setAvatarBusy] = useState(false)

  // 参戦記録 → 集計
  useEffect(() => {
    if (!profile) return
    let active = true
    fetchAttendance(profile.uid)
      .then((records) => {
        if (!active) return
        setStats(computeWrapped(records, profile.createdAt))
        setGroupStats(computeGroupStats(records))
        // 月別の保存（当月）も同時に
        const monthly = computeMonthlyStats(records, currentMonthKey())
        if (profile.rankPublic !== false) {
          upsertMonthly(profile.uid, displayName, currentMonthKey(), monthly, profile.oshiGroupIds ?? [], profile.avatar)
        }
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  // 全期間ランキングへの反映（名前公開時）
  useEffect(() => {
    if (!stats || !profile) return
    if (rankPublic) {
      upsertLeaderboard(profile.uid, displayName, stats, oshiIds, avatar)
      upsertGroupRankings(profile.uid, displayName, groupStats, oshiIds, stats.oshiDays, avatar)
    } else {
      removeFromLeaderboard(profile.uid)
      removeGroupRankings(profile.uid, groupStats.map((g) => g.groupId))
      removeMonthly(profile.uid, currentMonthKey(), groupStats.map((g) => g.groupId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, groupStats, rankPublic, displayName, avatar])

  const activeGroup = scope === 'all' ? null : groupStats.find((g) => g.groupId === scope)
  const view = stats && {
    live: scope === 'all' ? stats.live : activeGroup?.live ?? 0,
    event: scope === 'all' ? stats.event : activeGroup?.event ?? 0,
    meet: scope === 'all' ? stats.meet : activeGroup?.meet ?? 0,
    percent: scope === 'all' ? stats.topPercent : percentileFromScore(activeGroup?.score ?? 0),
  }
  const scopeLabel = scope === 'all' ? '総合' : getGroupName(scope)

  const shareText =
    stats && view && `私の推し活、上位${view.percent}%！🏆【${stats.tier}】\n` +
      `ライブ${view.live}回／特典会${view.event}回／推し活${stats.oshiDays}日\n#${SITE.name}`

  const handleShare = () => {
    if (!shareText) return
    nativeShare({ title: '私の推し活Wrapped', text: shareText, url: SITE.url }).then(
      (ok) => !ok && shareToX(shareText, SITE.url)
    )
  }

  const handleSaveImage = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#B79CED' })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `oshihub-${scope}.png`
      a.click()
    } catch (e) {
      console.error('画像保存に失敗', e)
    }
  }

  const saveName = () => {
    const v = nameDraft.trim().slice(0, 20)
    if (v) updateProfile({ rankName: v })
    setEditing(false)
  }

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じ画像を選び直せるようにリセット
    if (!file) return
    setAvatarBusy(true)
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      await updateProfile({ avatar: dataUrl })
    } catch (err) {
      console.error('アイコンの設定に失敗', err)
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = () => updateProfile({ avatar: '' })

  return (
    <div className="min-h-dvh bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue">
      <Seo title="推し活Wrapped" path="/wrapped" noindex />
      <div className="mx-auto min-h-dvh max-w-md px-5 pt-8 pb-28">
        {loading || !stats || !view ? (
          <div className="text-white">
            <Loading label="集計中…" />
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* スコープ切替 */}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              <ScopeTab label="総合" active={scope === 'all'} onClick={() => setScope('all')} />
              {oshiIds.map((id) => (
                <ScopeTab key={id} label={getGroupName(id)} active={scope === id} onClick={() => setScope(id)} />
              ))}
            </div>

            {/* 画像保存対象カード */}
            <div
              ref={cardRef}
              className="rounded-3xl bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue p-5 text-white"
            >
              <p className="text-center text-sm font-bold tracking-widest opacity-90">
                ✨ 推し活Wrapped（{scopeLabel}）✨
              </p>
              <div className="mt-3 rounded-2xl bg-white/15 px-5 py-5 text-center">
                <div className="mb-2 flex justify-center">
                  <Avatar src={avatar} name={displayName} size={64} ring />
                </div>
                <p className="text-sm font-bold opacity-90">{displayName} は</p>
                <p className="my-1 text-5xl font-black drop-shadow">🏆 上位{view.percent}%</p>
                <span className="mt-1 inline-block rounded-full bg-white/25 px-4 py-1 text-sm font-bold">
                  称号：{stats.tier}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat emoji="🎤" label="ライブ" value={view.live} />
                <MiniStat emoji="🤝" label="特典会" value={view.event} />
                <MiniStat emoji="💞" label="会った回数" value={view.meet} />
                <MiniStat emoji="📅" label="推し活日数" value={stats.oshiDays} />
              </div>
              <p className="mt-3 text-center text-xs font-bold opacity-80">
                #{SITE.name} ・ {SITE.url.replace('https://', '')}
              </p>
            </div>

            {/* ランキングを見る */}
            <Link
              to="/ranking"
              className="mt-4 flex items-center justify-between rounded-card bg-white p-4 text-oshi-text shadow-card active:scale-[0.98]"
            >
              <span>
                <span className="block text-sm font-extrabold">🏆 ファンランキングを見る</span>
                <span className="block text-xs text-oshi-sub">今月／全期間・グループ別の順位</span>
              </span>
              <span className="text-xl text-oshi-pink">›</span>
            </Link>

            {/* 操作 */}
            <div className="mt-3 space-y-2.5 text-white">
              {/* アイコン設定 */}
              <div className="flex items-center justify-between rounded-card bg-white/15 px-4 py-3 backdrop-blur">
                <div className="flex items-center gap-3">
                  <Avatar src={avatar} name={displayName} size={40} ring />
                  <span className="text-sm font-bold">アイコン</span>
                </div>
                <div className="flex items-center gap-2">
                  {avatar && (
                    <button
                      onClick={removeAvatar}
                      className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold"
                    >
                      削除
                    </button>
                  )}
                  <label className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-bold text-oshi-pink">
                    {avatarBusy ? '設定中…' : avatar ? '変更' : '画像を選ぶ'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={avatarBusy}
                      onChange={handleAvatarPick}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-card bg-white/15 px-4 py-3 backdrop-blur">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={20}
                      placeholder="表示名"
                      className="min-w-0 flex-1 rounded-full px-3 py-1.5 text-sm font-bold text-oshi-text"
                    />
                    <button onClick={saveName} className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-oshi-pink">
                      保存
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">表示名：{displayName}</span>
                    <button
                      onClick={() => {
                        setNameDraft(displayName)
                        setEditing(true)
                      }}
                      className="rounded-full bg-white/25 px-3 py-1 text-xs font-bold"
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-card bg-white/15 px-4 py-3 backdrop-blur">
                <span className="text-sm font-bold">ランキングに名前を出す</span>
                <button
                  onClick={() => updateProfile({ rankPublic: !rankPublic })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${rankPublic ? 'bg-white' : 'bg-white/30'}`}
                  aria-label="名前公開切替"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${
                      rankPublic ? 'left-[1.375rem] bg-oshi-pink' : 'left-0.5 bg-white'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={handleSaveImage} className="rounded-full bg-white py-3 font-extrabold text-oshi-purple shadow-card active:scale-[0.98]">
                  📸 画像を保存
                </button>
                <button onClick={handleShare} className="rounded-full bg-white py-3 font-extrabold text-oshi-pink shadow-card active:scale-[0.98]">
                  📲 シェア
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ScopeTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
        active ? 'bg-white text-oshi-pink' : 'bg-white/20 text-white'
      }`}
    >
      {label}
    </button>
  )
}

function MiniStat({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-2.5 text-center">
      <p className="text-xs font-bold opacity-90">
        {emoji} {label}
      </p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  )
}
