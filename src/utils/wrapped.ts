import type { AttendanceRecord } from '@/types'

// 推し活Wrapped の集計とランキング（上位X%）算出。
// ランキングは「活動量スコア → パーセンタイル」の計算式で出す（ユーザー数に依存せず常に成立）。

export interface WrappedStats {
  live: number // ライブ参加
  event: number // 特典会参加
  meet: number // 推しに会った回数（ライブ＋特典会）
  other: number // その他の参戦（テレビ観覧・配信視聴など記録分）
  total: number // 参戦総数
  oshiDays: number // 推し活日数（登録からの日数）
  score: number
  topPercent: number // 上位X%
  tier: string // 称号
}

/** 上位%から称号を決める */
function tierName(topPercent: number): string {
  if (topPercent <= 1) return '神推しレベル'
  if (topPercent <= 3) return '超ガチ勢'
  if (topPercent <= 10) return 'ガチ勢'
  if (topPercent <= 30) return '熱心なファン'
  if (topPercent <= 60) return '成長中ファン'
  return 'かけだしファン'
}

/**
 * 参戦記録と登録日から Wrapped 統計を計算。
 * スコア = ライブ*8 + 特典会*4 + その他*2 + 推し活日数*0.3
 * 上位% = 99 * exp(-スコア/50)（1〜99にクランプ）
 */
export function computeWrapped(
  records: AttendanceRecord[],
  createdAt?: string
): WrappedStats {
  const live = records.filter((r) => r.category === 'live').length
  const event = records.filter((r) => r.category === 'event').length
  const meet = live + event
  const total = records.length
  const other = total - meet

  const start = createdAt ? new Date(createdAt).getTime() : Date.now()
  const oshiDays = Math.max(1, Math.floor((Date.now() - start) / 86_400_000) + 1)

  const score = live * 8 + event * 4 + other * 2 + oshiDays * 0.3
  const topPercent = Math.min(99, Math.max(1, Math.round(99 * Math.exp(-score / 50))))

  return { live, event, meet, other, total, oshiDays, score, topPercent, tier: tierName(topPercent) }
}
