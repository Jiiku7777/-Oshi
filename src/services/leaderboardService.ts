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
import { where } from 'firebase/firestore'
import type { GroupStat, WrappedStats } from '@/utils/wrapped'

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

// ===== グループ別ランキング（groupRanking/{groupId__uid}） =====

const gKey = (groupId: string, uid: string) => `${groupId}__${uid}`

const DEMO_GROUP_SELF = 'oshihub_demo_group_self'
function demoGroupSeed(groupId: string): LeaderEntry[] {
  return [
    { uid: `${groupId}_a`, name: 'ガチ勢A', score: 180, live: 14, event: 8, meet: 22, oshiDays: 0, updatedAt: '' },
    { uid: `${groupId}_b`, name: '現場の主', score: 92, live: 7, event: 4, meet: 11, oshiDays: 0, updatedAt: '' },
    { uid: `${groupId}_c`, name: 'にわか卒業', score: 40, live: 3, event: 1, meet: 4, oshiDays: 0, updatedAt: '' },
  ]
}

/** 各グループの自分のスコアを更新 */
export async function upsertGroupRankings(
  uid: string,
  name: string,
  groupStats: GroupStat[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const self = Object.fromEntries(
      groupStats.map((g) => [
        g.groupId,
        { uid, name: name || 'ファン', score: g.score, live: g.live, event: g.event, meet: g.meet, oshiDays: 0, updatedAt: '' },
      ])
    )
    localStorage.setItem(DEMO_GROUP_SELF, JSON.stringify(self))
    return
  }
  await Promise.all(
    groupStats.map((g) =>
      setDoc(doc(db!, 'groupRanking', gKey(g.groupId, uid)), {
        groupId: g.groupId,
        uid,
        name: name || 'ファン',
        score: g.score,
        live: g.live,
        event: g.event,
        meet: g.meet,
        oshiDays: 0,
        updatedAt: new Date().toISOString(),
      })
    )
  )
}

/** 指定グループでの自分のエントリを削除（名前非公開時） */
export async function removeGroupRankings(uid: string, groupIds: string[]): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    localStorage.removeItem(DEMO_GROUP_SELF)
    return
  }
  await Promise.all(groupIds.map((gid) => deleteDoc(doc(db!, 'groupRanking', gKey(gid, uid)))))
}

/** グループ別 上位 n 件 */
export async function fetchGroupTop(groupId: string, n = 100): Promise<LeaderEntry[]> {
  if (!isFirebaseConfigured || !db) {
    const list = demoGroupSeed(groupId)
    const selfRaw = localStorage.getItem(DEMO_GROUP_SELF)
    if (selfRaw) {
      const self = JSON.parse(selfRaw)[groupId]
      if (self) list.push(self)
    }
    return list.sort((a, b) => b.score - a.score).slice(0, n)
  }
  const q = query(
    collection(db, 'groupRanking'),
    where('groupId', '==', groupId),
    orderBy('score', 'desc'),
    limit(n)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as LeaderEntry)
}
