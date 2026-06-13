// ============================================================
// OshiHub 共通型定義
// 後からランキング機能・推し活記録機能を追加しやすいよう、
// ドメインモデルをここに集約する。
// ============================================================

/** 取得したいイベントのカテゴリ */
export type EventCategory =
  | 'live' // ライブ
  | 'event' // 特典会
  | 'tv' // テレビ出演
  | 'radio' // ラジオ出演
  | 'youtube' // YouTube配信
  | 'tiktok' // TikTok LIVE
  | 'release' // リリース情報
  | 'goods' // グッズ発売情報

/** 情報ソースの種別 */
export type EventSource = 'official_site' | 'official_x' | 'youtube' | 'other'

/** アイドルグループ（β版対応グループ） */
export interface Group {
  id: string
  name: string
  /** テーマカラー（カードのアクセントに使用） */
  color: string
  /** カナ等の補足。検索や並びに利用 */
  reading?: string
}

/** AIが収集した1件のイベント */
export interface OshiEvent {
  id: string
  title: string // イベント名
  groupId: string // グループID
  category: EventCategory // カテゴリ
  /** ISO 8601 文字列（例: 2026-06-12T19:00:00+09:00） */
  startAt: string // 日付＋時間
  /** 終了時刻（任意） */
  endAt?: string
  source: EventSource // 情報ソース
  url?: string // 詳細URL（元ページ）
  description?: string
  /** AI収集メタ情報（収集元の信頼度など、将来拡張用） */
  collectedAt?: string
}

/** ユーザーの参戦記録（推し活Wrapped の集計元） */
export interface AttendanceRecord {
  eventId: string
  groupId: string
  category: EventCategory
  /** イベント開始日時（記録時点のスナップショット） */
  startAt: string
  title: string
  /** 記録した日時 */
  markedAt: string
}

/** 推しニュース（イベント以外の自由テキスト情報） */
export interface OshiNews {
  id: string
  groupId: string
  title: string
  summary: string
  url?: string
  publishedAt: string
}

/** 通知タイミング */
export type NotifyTiming = '1d' | '1h' | '30m' | '10m'

/** ユーザーごとの通知設定 */
export interface NotificationSettings {
  /** 通知を受け取るカテゴリ */
  categories: Record<EventCategory, boolean>
  /** 通知タイミング（複数選択可） */
  timings: Record<NotifyTiming, boolean>
  /** グループごとの通知 ON/OFF */
  groupEnabled: Record<string, boolean>
  /** 通知全体のマスタースイッチ */
  enabled: boolean
}

/** Firestore に保存するユーザードキュメント */
export interface UserProfile {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
  /** 推し登録したグループIDの配列 */
  oshiGroupIds: string[]
  notifications: NotificationSettings
  /** 初回オンボーディング完了フラグ */
  onboarded: boolean
  /** Web Push 用 FCM トークン（複数端末対応） */
  fcmTokens?: string[]
  createdAt?: string
  updatedAt?: string
}
