import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useAuth } from '@/contexts/AuthContext'
import { fetchAttendance } from '@/services/attendanceService'
import {
  fetchGroupTop,
  fetchLeader,
  fetchTopLeaders,
  removeFromLeaderboard,
  removeGroupRankings,
  upsertGroupRankings,
  upsertLeaderboard,
  type LeaderEntry,
} from '@/services/leaderboardService'
import {
  computeGroupStats,
  computeWrapped,
  percentileFromScore,
  type GroupStat,
  type WrappedStats,
} from '@/utils/wrapped'
import { Loading } from '@/components/Loading'
import { Seo } from '@/components/Seo'
import { getGroupName } from '@/data/groups'
import { nativeShare, shareToX } from '@/utils/share'
import { SITE } from '@/config/site'

export function Wrapped() {
  const { profile, updateProfile } = useAuth()
  const cardRef = useRef<HTMLDivElement>(null)

  const [stats, setStats] = useState<WrappedStats | null>(null)
  const [groupStats, setGroupStats] = useState<GroupStat[]>([])
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [scope, setScope] = useState<string>('all') // 'all' | groupId
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [selected, setSelected] = useState<LeaderEntry | null>(null)

  // ランキングの名前タップ → 公開プロフィール表示
  const openFan = async (entry: LeaderEntry) => {
    setSelected(entry) // まず手元の情報で即表示
    const full = await fetchLeader(entry.uid) // 総合プロフィールで上書き（推しグループ・日数）
    if (full) setSelected({ ...entry, ...full })
  }

  const rankPublic = profile?.rankPublic !== false
  const displayName = profile?.rankName || profile?.displayName?.split(' ')[0] || 'ファン'
  const oshiIds = profile?.oshiGroupIds ?? []

  // 参戦記録 → 集計
  useEffect(() => {
    if (!profile) return
    let active = true
    fetchAttendance(profile.uid)
      .then((records) => {
        if (!active) return
        setStats(computeWrapped(records, profile.createdAt))
        setGroupStats(computeGroupStats(records))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [profile])

  // ランキング反映＆取得（名前/公開/スコープ変更で再実行）
  useEffect(() => {
    if (!stats || !profile) return
    let active = true
    const run = async () => {
      if (rankPublic) {
        await upsertLeaderboard(profile.uid, displayName, stats, oshiIds)
        await upsertGroupRankings(profile.uid, displayName, groupStats, oshiIds, stats.oshiDays)
      } else {
        await removeFromLeaderboard(profile.uid)
        await removeGroupRankings(profile.uid, groupStats.map((g) => g.groupId))
      }
      const list = scope === 'all' ? await fetchTopLeaders(100) : await fetchGroupTop(scope, 100)
      if (active) setLeaders(list)
    }
    run()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, groupStats, rankPublic, displayName, scope])

  const myRank = useMemo(() => {
    if (!profile) return null
    const idx = leaders.findIndex((l) => l.uid === profile.uid)
    return idx >= 0 ? idx + 1 : null
  }, [leaders, profile])

  // 表示する数値（スコープに応じて総合 or グループ）
  const activeGroup = scope === 'all' ? null : groupStats.find((g) => g.groupId === scope)
  const view = stats && {
    live: scope === 'all' ? stats.live : activeGroup?.live ?? 0,
    event: scope === 'all' ? stats.event : activeGroup?.event ?? 0,
    meet: scope === 'all' ? stats.meet : activeGroup?.meet ?? 0,
    percent: scope === 'all' ? stats.topPercent : percentileFromScore(activeGroup?.score ?? 0),
  }
  const scopeLabel = scope === 'all' ? '総合' : getGroupName(scope)

  const shareText =
    stats &&
    (myRank
      ? `${scopeLabel}ランキング ${myRank}位！🏆\nライブ${view!.live}回／特典会${view!.event}回／推し活${stats.oshiDays}日\n#${SITE.name}`
      : `私の推し活、上位${view!.percent}%！🏆\n#${SITE.name}`)

  const handleShare = () => {
    if (!shareText) return
    nativeShare({ title: '私の推し活Wrapped', text: shareText, url: SITE.url }).then(
      (ok) => !ok && shareToX(shareText, SITE.url)
    )
  }

  const handleSaveImage = async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#B79CED',
      })
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
            {/* スコープ切替（総合 / グループ別） */}
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              <ScopeTab label="総合" active={scope === 'all'} onClick={() => setScope('all')} />
              {oshiIds.map((id) => (
                <ScopeTab
                  key={id}
                  label={getGroupName(id)}
                  active={scope === id}
                  onClick={() => setScope(id)}
                />
              ))}
            </div>

            {/* ===== 画像保存対象カード ===== */}
            <div
              ref={cardRef}
              className="rounded-3xl bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue p-5 text-white"
            >
              <p className="text-center text-sm font-bold tracking-widest opacity-90">
                ✨ 推し活Wrapped（{scopeLabel}）✨
              </p>

              <div className="mt-3 rounded-2xl bg-white/15 px-5 py-5 text-center">
                <p className="text-sm font-bold opacity-90">{displayName} は</p>
                {myRank ? (
                  <>
                    <p className="my-1 text-5xl font-black drop-shadow">🏆 {myRank}位</p>
                    <p className="text-sm font-bold opacity-90">
                      全{leaders.length}人中 ・ 上位{view.percent}%
                    </p>
                  </>
                ) : (
                  <p className="my-1 text-4xl font-black drop-shadow">🏆 上位{view.percent}%</p>
                )}
                <span className="mt-2 inline-block rounded-full bg-white/25 px-4 py-1 text-sm font-bold">
                  称号：{stats.tier}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat emoji="🎤" label="ライブ" value={view.live} />
                <MiniStat emoji="🤝" label="特典会" value={view.event} />
                <MiniStat emoji="💞" label="会った回数" value={view.meet} />
                <MiniStat emoji="📅" label="推し活日数" value={stats.oshiDays} />
              </div>

              {/* ランキング */}
              <div className="mt-4 rounded-2xl bg-white/15 p-3">
                <p className="mb-1 text-sm font-extrabold">🏆 {scopeLabel}ファンランキング TOP10</p>
                <p className="mb-2 text-[11px] opacity-80">名前をタップでプロフィール表示</p>
                <div className="space-y-1.5">
                  {leaders.slice(0, 10).map((l, i) => (
                    <LeaderRow
                      key={l.uid}
                      rank={i + 1}
                      entry={l}
                      me={l.uid === profile?.uid}
                      onTap={() => openFan(l)}
                    />
                  ))}
                  {myRank && myRank > 10 && (
                    <>
                      <p className="py-1 text-center text-xs opacity-70">…</p>
                      <LeaderRow rank={myRank} entry={leaders[myRank - 1]} me onTap={() => openFan(leaders[myRank - 1])} />
                    </>
                  )}
                  {leaders.length === 0 && (
                    <p className="py-3 text-center text-sm opacity-80">
                      まだ誰もいません。最初のランカーに！
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-3 text-center text-xs font-bold opacity-80">
                #{SITE.name} ・ {SITE.url.replace('https://', '')}
              </p>
            </div>
            {/* ===== /カード ===== */}

            {/* 操作（画像には写らない） */}
            <div className="mt-4 space-y-2.5 text-white">
              {/* 表示名編集 */}
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
                    <button
                      onClick={saveName}
                      className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-oshi-pink"
                    >
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

              {/* 名前公開トグル */}
              <div className="flex items-center justify-between rounded-card bg-white/15 px-4 py-3 backdrop-blur">
                <span className="text-sm font-bold">ランキングに名前を出す</span>
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

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleSaveImage}
                  className="rounded-full bg-white py-3 font-extrabold text-oshi-purple shadow-card active:scale-[0.98]"
                >
                  📸 画像を保存
                </button>
                <button
                  onClick={handleShare}
                  className="rounded-full bg-white py-3 font-extrabold text-oshi-pink shadow-card active:scale-[0.98]"
                >
                  📲 シェア
                </button>
              </div>
              <p className="text-center text-[11px] opacity-80">
                画像を保存して、ストーリーやショート動画で自慢しよう
              </p>
            </div>
          </div>
        )}
      </div>

      {selected && <FanDetailModal entry={selected} onClose={() => setSelected(null)} />}
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

function LeaderRow({
  rank,
  entry,
  me,
  onTap,
}: {
  rank: number
  entry: LeaderEntry
  me?: boolean
  onTap?: () => void
}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
  return (
    <button
      onClick={onTap}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition active:scale-[0.98] ${
        me ? 'bg-white text-oshi-pink' : 'hover:bg-white/10'
      }`}
    >
      <span className="w-7 shrink-0 text-center text-sm font-black">{medal}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold underline-offset-2">
        {entry.name}
        {me && ' (あなた)'}
      </span>
      <span className="shrink-0 text-xs font-bold opacity-90">会った{entry.meet}回</span>
    </button>
  )
}

/** ランカーの公開プロフィール（モーダル） */
function FanDetailModal({ entry, onClose }: { entry: LeaderEntry; onClose: () => void }) {
  const groups = entry.groups ?? []
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
      onClick={onClose}
    >
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
