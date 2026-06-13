import { useEffect, useState } from 'react'
import { fetchMonthlyTop, SAMPLE_TOP5, type LeaderEntry } from '@/services/leaderboardService'
import { prevMonthKey } from '@/utils/wrapped'
import { RecapReveal } from './RecapReveal'

const SEEN_KEY = 'oshihub_recap_seen'

/**
 * 月初に一度だけ「先月のTOP5」を自動でポップアップ表示する。
 * 閉じると当月分は二度と自動表示しない（= 1か月に1回）。
 * 見返したい時は /ranking の「📣 先月の結果を見る」からいつでも再生できる。
 */
export function MonthlyRecapAuto() {
  const [recap, setRecap] = useState<{ entries: LeaderEntry[]; sample: boolean } | null>(null)
  const lastMonth = prevMonthKey()

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_KEY)
    if (seen === lastMonth) return // 今月分はもう見た

    let active = true
    fetchMonthlyTop(lastMonth, 'all', 5)
      .then((real) => {
        if (!active) return
        const sample = real.length < 3
        setRecap({ entries: sample ? SAMPLE_TOP5 : real, sample })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [lastMonth])

  if (!recap) return null

  return (
    <RecapReveal
      monthKey={lastMonth}
      scopeLabel="総合"
      entries={recap.entries}
      sample={recap.sample}
      onClose={() => {
        localStorage.setItem(SEEN_KEY, lastMonth)
        setRecap(null)
      }}
    />
  )
}
