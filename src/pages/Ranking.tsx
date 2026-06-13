import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchGroupTop,
  fetchLeader,
  fetchMonthlyTop,
  fetchTopLeaders,
  SAMPLE_TOP5,
  type LeaderEntry,
} from '@/services/leaderboardService'
import { currentMonthKey, monthLabel, prevMonthKey } from '@/utils/wrapped'
import { getGroupName } from '@/data/groups'
import { Loading } from '@/components/Loading'
import { Seo } from '@/components/Seo'
import { Avatar } from '@/components/Avatar'
import { FanDetailModal } from '@/components/FanDetailModal'
import { RecapReveal } from '@/components/RecapReveal'

type Period = 'month' | 'all'

export function Ranking() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const oshiIds = profile?.oshiGroupIds ?? []

  const [period, setPeriod] = useState<Period>('month')
  const [scope, setScope] = useState<string>('all') // 'all' | groupId
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LeaderEntry | null>(null)
  const [recap, setRecap] = useState<{ entries: LeaderEntry[]; label: string; sample: boolean } | null>(null)

  const thisMonth = currentMonthKey()
  const lastMonth = prevMonthKey()

  useEffect(() => {
    let active = true
    setLoading(true)
    const load = async () => {
      let list: LeaderEntry[]
      if (period === 'all') {
        list = scope === 'all' ? await fetchTopLeaders(100) : await fetchGroupTop(scope, 100)
      } else {
        list = await fetchMonthlyTop(thisMonth, scope, 100)
      }
      if (active) setLeaders(list)
    }
    load().finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, scope])

  const myRank = useMemo(() => {
    if (!profile) return null
    const idx = leaders.findIndex((l) => l.uid === profile.uid)
    return idx >= 0 ? idx + 1 : null
  }, [leaders, profile])

  const openFan = async (entry: LeaderEntry) => {
    setSelected(entry)
    const full = await fetchLeader(entry.uid)
    if (full) setSelected({ ...entry, ...full })
  }

  const showRecap = async () => {
    const real = await fetchMonthlyTop(lastMonth, scope, 5)
    // 実データが少ない間は演出体験用サンプルで発表（実データ3人以上で自動的に本物へ）
    const sample = real.length < 3
    setRecap({
      entries: sample ? SAMPLE_TOP5 : real,
      label: scope === 'all' ? '総合' : getGroupName(scope),
      sample,
    })
  }

  const scopeLabel = scope === 'all' ? '総合' : getGroupName(scope)

  return (
    <div className="animate-fade-in pb-4">
      <Seo title="ファンランキング" path="/ranking" noindex />
      <header className="bg-gradient-to-br from-oshi-purple to-oshi-pink px-5 pb-5 pt-8 text-white">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-lg active:scale-95"
          aria-label="戻る"
        >
          ‹
        </button>
        <h1 className="text-xl font-extrabold">🏆 ファンランキング</h1>

        {/* 期間タブ */}
        <div className="mt-3 flex gap-2">
          <PeriodTab label="今月" active={period === 'month'} onClick={() => setPeriod('month')} />
          <PeriodTab label="全期間" active={period === 'all'} onClick={() => setPeriod('all')} />
        </div>
      </header>

      {/* スコープ（総合 / グループ別） */}
      <div className="flex gap-2 overflow-x-auto px-5 py-3">
        <ScopeChip label="総合" active={scope === 'all'} onClick={() => setScope('all')} />
        {oshiIds.map((id) => (
          <ScopeChip key={id} label={getGroupName(id)} active={scope === id} onClick={() => setScope(id)} />
        ))}
      </div>

      {/* 先月の結果を見る */}
      <div className="px-5">
        <button
          onClick={showRecap}
          className="flex w-full items-center justify-between rounded-card bg-gradient-to-r from-oshi-pink to-oshi-purple p-4 text-white shadow-card active:scale-[0.98]"
        >
          <span>
            <span className="block text-sm font-extrabold">📣 先月の結果を見る</span>
            <span className="block text-xs opacity-90">
              {monthLabel(lastMonth)}・{scopeLabel} のTOP5を発表
            </span>
          </span>
          <span className="text-2xl">▶</span>
        </button>
      </div>

      {/* ランキング本体 */}
      <div className="px-5 py-4">
        <p className="mb-2 text-xs font-bold text-oshi-sub">
          {period === 'month' ? `${monthLabel(thisMonth)}（今月）` : '全期間'}・{scopeLabel}
          {myRank ? ` ・ あなたは ${myRank}位` : ''}
        </p>
        {loading ? (
          <Loading />
        ) : leaders.length === 0 ? (
          <div className="rounded-card bg-white/60 px-4 py-10 text-center text-sm text-oshi-sub">
            まだランキングがありません。予定を「参戦✓」して最初のランカーに！
          </div>
        ) : (
          <div className="space-y-2">
            {leaders.map((l, i) => (
              <button
                key={l.uid}
                onClick={() => openFan(l)}
                className={`flex w-full items-center gap-3 rounded-card p-3 text-left shadow-soft transition active:scale-[0.98] ${
                  l.uid === profile?.uid ? 'bg-oshi-pink text-white' : 'bg-white text-oshi-text'
                }`}
              >
                <span className="w-8 shrink-0 text-center text-lg font-black">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <Avatar src={l.avatar} name={l.name} size={36} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">
                  {l.name}
                  {l.uid === profile?.uid && ' (あなた)'}
                </span>
                <span
                  className={`shrink-0 text-xs font-bold ${
                    l.uid === profile?.uid ? 'opacity-90' : 'text-oshi-sub'
                  }`}
                >
                  💞{l.meet}回
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <FanDetailModal entry={selected} onClose={() => setSelected(null)} />}
      {recap && (
        <RecapReveal
          monthKey={lastMonth}
          scopeLabel={recap.label}
          entries={recap.entries}
          sample={recap.sample}
          onClose={() => setRecap(null)}
        />
      )}
    </div>
  )
}

function PeriodTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
        active ? 'bg-white text-oshi-pink' : 'bg-white/20 text-white'
      }`}
    >
      {label}
    </button>
  )
}

function ScopeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
        active ? 'bg-oshi-pink text-white' : 'bg-white text-oshi-sub shadow-soft'
      }`}
    >
      {label}
    </button>
  )
}
