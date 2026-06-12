// バックエンドが書き込むドキュメントの型（フロントの src/types/index.ts と整合させる）

export type EventCategory =
  | 'live'
  | 'event'
  | 'tv'
  | 'radio'
  | 'youtube'
  | 'tiktok'
  | 'release'
  | 'goods'

export type EventSource = 'official_site' | 'official_x' | 'youtube' | 'other'

export interface OshiEvent {
  title: string
  groupId: string
  category: EventCategory
  /** ISO 8601（例 2026-06-12T19:00:00+09:00）。時刻不明なら日付のみ +00:00 等で可 */
  startAt: string
  endAt?: string
  source: EventSource
  url?: string
  description?: string
  collectedAt: string
}

export interface OshiNews {
  groupId: string
  title: string
  summary: string
  url?: string
  publishedAt: string
}

/** Claude の抽出ツールが返す生データ（groupId は呼び出し側で付与） */
export interface ExtractedEvent {
  title: string
  category: EventCategory
  startAt: string
  endAt?: string
  source: EventSource
  url?: string
  description?: string
}

export interface ExtractedNews {
  title: string
  summary: string
  url?: string
  publishedAt: string
}

export interface ExtractionResult {
  events: ExtractedEvent[]
  news: ExtractedNews[]
}
