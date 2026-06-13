import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/config'
import type { WrappedStats } from '@/utils/wrapped'

// 公開ファンランキング。leaderboard/{uid}（誰でも読める / 本人のみ書ける）。
// ショート動画で「上位◯位だったwww」と自慢できるよう、名前入りで表示する。

export interface LeaderEntry {
  uid: string
  name: string
  score: number
  live: number
  event: number
  meet: number
  oshiDays: number
  updatedAt: string
}

const DEMO_SELF = 'oshihub_demo_leader_self'

// デモ用のダミー上位者（本番では実ユーザーが並ぶ）
const DEMO_SEED: LeaderEntry[] = [
  { uid: 's1', name: 'みれいP', score: 412, live: 38, event: 25, meet: 63, oshiDays: 520, updatedAt: '' },
  { uid: 's2', name: 'ゆめお', score: 268, live: 22, event: 14, meet: 36, oshiDays: 410, updatedAt: '' },
  { uid: 's3', name: 'さくら推し', score: 154, live: 11, event: 9, meet: 20, oshiDays: 300, updatedAt: '' },
  { uid: 's4', name: 'のぎ担A', score: 96, live: 6, event: 5, meet: 11, oshiDays: 220, updatedAt: '' },
  { uid: 's5', name: 'ひな', score: 54, live: 3, event: 2, meet: 5, oshiDays: 150, updatedAt: '' },
]

/** 自分のランキングエントリを更新（名前公開時のみ） */
export async function upsertLeaderboard(
  uid: string,
  name: string,
  stats: WrappedStats
): Promise<void> {
  const entry: LeaderEntry = {
    uid,
    name: name || 'ファン',
    score: Math.round(stats.score),
    live: stats.live,
    event: stats.event,
    meet: stats.meet,
    oshiDays: stats.oshiDays,
    updatedAt: new Date().toISOString(),
  }
  if (!isFirebaseConfigured || !db) {
    localStorage.setItem(DEMO_SELF, JSON.stringify(entry))
    return
  }
  await setDoc(doc(db, 'leaderboard', uid), entry)
}

/** ランキングから自分を削除（名前非公開にしたとき） */
export async function removeFromLeaderboard(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    localStorage.removeItem(DEMO_SELF)
    return
  }
  await deleteDoc(doc(db, 'leaderboard', uid))
}

/** 上位 n 件を取得（スコア降順） */
export async function fetchTopLeaders(n = 100): Promise<LeaderEntry[]> {
  if (!isFirebaseConfigured || !db) {
    const self = localStorage.getItem(DEMO_SELF)
    const list = [...DEMO_SEED]
    if (self) list.push(JSON.parse(self))
    return list.sort((a, b) => b.score - a.score).slice(0, n)
  }
  const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as LeaderEntry)
}
