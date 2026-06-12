import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/config'
import type { OshiEvent, OshiNews } from '@/types'
import { MOCK_EVENTS } from '@/data/mockEvents'
import { MOCK_NEWS } from '@/data/mockNews'

// ============================================================
// イベント / ニュースのデータ取得層。
// 本番では AI 収集バックエンドが Firestore に書き込んだものを読む。
// デモモードではモックを返す。UI はこの関数経由でのみアクセスする。
// ============================================================

/** 推しグループのイベントを取得（時刻昇順） */
export async function fetchEvents(oshiGroupIds: string[]): Promise<OshiEvent[]> {
  if (oshiGroupIds.length === 0) return []

  if (!isFirebaseConfigured || !db) {
    return MOCK_EVENTS.filter((e) => oshiGroupIds.includes(e.groupId)).sort(
      (a, b) => a.startAt.localeCompare(b.startAt)
    )
  }

  // Firestore の `in` は最大10件まで。β版の対応グループ数なら1クエリで足りる。
  const q = query(
    collection(db, 'events'),
    where('groupId', 'in', oshiGroupIds.slice(0, 10)),
    orderBy('startAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OshiEvent, 'id'>) }))
}

/** 単一グループのイベントを取得（公開ページ用・未ログインでも可・時刻昇順） */
export async function fetchEventsByGroup(groupId: string): Promise<OshiEvent[]> {
  if (!isFirebaseConfigured || !db) {
    return MOCK_EVENTS.filter((e) => e.groupId === groupId).sort((a, b) =>
      a.startAt.localeCompare(b.startAt)
    )
  }
  const q = query(
    collection(db, 'events'),
    where('groupId', '==', groupId),
    orderBy('startAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OshiEvent, 'id'>) }))
}

/** 推しグループのニュースを取得（新着順） */
export async function fetchNews(oshiGroupIds: string[]): Promise<OshiNews[]> {
  if (oshiGroupIds.length === 0) return []

  if (!isFirebaseConfigured || !db) {
    return MOCK_NEWS.filter((n) => oshiGroupIds.includes(n.groupId)).sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt)
    )
  }

  const q = query(
    collection(db, 'news'),
    where('groupId', 'in', oshiGroupIds.slice(0, 10)),
    orderBy('publishedAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OshiNews, 'id'>) }))
}
