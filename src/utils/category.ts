import type { EventCategory, EventSource, NotifyTiming } from '@/types'

interface CategoryMeta {
  label: string
  emoji: string
  /** バッジの Tailwind クラス（背景＋文字色） */
  badgeClass: string
  /** カレンダーのドット色 */
  dotColor: string
}

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  live: { label: 'ライブ', emoji: '🎤', badgeClass: 'bg-oshi-pink/15 text-oshi-pink', dotColor: '#FF8FB1' },
  event: { label: '特典会', emoji: '🤝', badgeClass: 'bg-oshi-purple/15 text-oshi-purple', dotColor: '#B79CED' },
  tv: { label: 'テレビ', emoji: '📺', badgeClass: 'bg-oshi-blue/20 text-sky-500', dotColor: '#8FD3FF' },
  radio: { label: 'ラジオ', emoji: '📻', badgeClass: 'bg-amber-100 text-amber-600', dotColor: '#FBBF24' },
  youtube: { label: 'YouTube', emoji: '▶️', badgeClass: 'bg-red-100 text-red-500', dotColor: '#EF4444' },
  tiktok: { label: 'TikTok LIVE', emoji: '🎵', badgeClass: 'bg-slate-800/10 text-slate-700', dotColor: '#334155' },
  release: { label: 'リリース', emoji: '💿', badgeClass: 'bg-emerald-100 text-emerald-600', dotColor: '#10B981' },
  goods: { label: 'グッズ', emoji: '🛍️', badgeClass: 'bg-rose-100 text-rose-500', dotColor: '#FB7185' },
}

/** 通知設定 / フィルタで使う全カテゴリの並び順 */
export const CATEGORY_ORDER: EventCategory[] = [
  'live',
  'event',
  'tv',
  'radio',
  'youtube',
  'tiktok',
  'release',
  'goods',
]

export function categoryLabel(c: EventCategory): string {
  return CATEGORY_META[c].label
}

export const SOURCE_LABEL: Record<EventSource, string> = {
  official_site: '公式サイト',
  official_x: '公式X',
  youtube: 'YouTube',
  other: 'その他',
}

export const TIMING_LABEL: Record<NotifyTiming, string> = {
  '1d': '1日前',
  '1h': '1時間前',
  '30m': '30分前',
  '10m': '10分前',
}

export const TIMING_ORDER: NotifyTiming[] = ['1d', '1h', '30m', '10m']
