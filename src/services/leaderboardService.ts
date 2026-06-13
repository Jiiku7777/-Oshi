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
import { getDoc, where } from 'firebase/firestore'
import type { GroupStat, MonthlyStats, WrappedStats } from '@/utils/wrapped'

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
  /** 推しグループID（公開プロフィール用） */
  groups?: string[]
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
  stats: WrappedStats,
  groups: string[] = []
): Promise<void> {
  const entry: LeaderEntry = {
    uid,
    name: name || 'ファン',
    score: Math.round(stats.score),
    live: stats.live,
    event: stats.event,
    meet: stats.meet,
    oshiDays: stats.oshiDays,
    groups,
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

/** 単一ユーザーの公開プロフィール（総合エントリ）を取得 */
export async function fetchLeader(uid: string): Promise<LeaderEntry | null> {
  if (!isFirebaseConfigured || !db) {
    const list = [...DEMO_SEED]
    const self = localStorage.getItem(DEMO_SELF)
    if (self) list.push(JSON.parse(self))
    return list.find((l) => l.uid === uid) ?? null
  }
  const snap = await getDoc(doc(db, 'leaderboard', uid))
  return snap.exists() ? (snap.data() as LeaderEntry) : null
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
  groupStats: GroupStat[],
  groups: string[] = [],
  oshiDays = 0
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    const self = Object.fromEntries(
      groupStats.map((g) => [
        g.groupId,
        { uid, name: name || 'ファン', score: g.score, live: g.live, event: g.event, meet: g.meet, oshiDays, groups, updatedAt: '' },
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
        oshiDays,
        groups,
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

// ===== 月別ランキング（monthlyRanking/{month__group__uid}）。group は 'all' or groupId =====

const mKey = (month: string, group: string, uid: string) => `${month}__${group}__${uid}`
const DEMO_MONTHLY_SELF = 'oshihub_demo_monthly_self'

function demoMonthlySeed(month: string, group: string): LeaderEntry[] {
  // 先月キーには「確定済み」の見栄えするダミーを入れて演出を試せるようにする
  const base =
    group === 'all'
      ? [
          { uid: 'm1', name: 'みれいP', score: 96, live: 8, event: 6, meet: 14, oshiDays: 0, groups: ['fruits-zipper', 'cutie-street'], updatedAt: '' },
          { uid: 'm2', name: 'ゆめお', score: 72, live: 6, event: 4, meet: 10, oshiDays: 0, groups: ['nogizaka46'], updatedAt: '' },
          { uid: 'm3', name: 'さくら推し', score: 52, live: 4, event: 3, meet: 7, oshiDays: 0, groups: ['sakurazaka46'], updatedAt: '' },
          { uid: 'm4', name: 'のぎ担A', score: 36, live: 3, event: 1, meet: 4, oshiDays: 0, groups: ['nogizaka46'], updatedAt: '' },
          { uid: 'm5', name: 'ひな', score: 20, live: 1, event: 2, meet: 3, oshiDays: 0, groups: ['hinatazaka46'], updatedAt: '' },
          { uid: 'm6', name: 'こはく', score: 8, live: 1, event: 0, meet: 1, oshiDays: 0, groups: ['candy-tune'], updatedAt: '' },
        ]
      : demoGroupSeed(group)
  void month
  return base
}

/** 当月の自分のスコアを保存（総合＋グループ別） */
export async function upsertMonthly(
  uid: string,
  name: string,
  monthKey: string,
  monthly: MonthlyStats,
  groups: string[] = []
): Promise<void> {
  const rows: { group: string; score: number; live: number; event: number; meet: number }[] = [
    { group: 'all', score: monthly.score, live: monthly.live, event: monthly.event, meet: monthly.meet },
    ...monthly.groups.map((g) => ({
      group: g.groupId,
      score: g.score,
      live: g.live,
      event: g.event,
      meet: g.meet,
    })),
  ]

  if (!isFirebaseConfigured || !db) {
    const store = JSON.parse(localStorage.getItem(DEMO_MONTHLY_SELF) || '{}')
    for (const r of rows) {
      store[`${monthKey}__${r.group}`] = { uid, name: name || 'ファン', ...r, oshiDays: 0, groups, updatedAt: '' }
    }
    localStorage.setItem(DEMO_MONTHLY_SELF, JSON.stringify(store))
    return
  }
  await Promise.all(
    rows.map((r) =>
      setDoc(doc(db!, 'monthlyRanking', mKey(monthKey, r.group, uid)), {
        month: monthKey,
        group: r.group,
        uid,
        name: name || 'ファン',
        score: r.score,
        live: r.live,
        event: r.event,
        meet: r.meet,
        groups,
        updatedAt: new Date().toISOString(),
      })
    )
  )
}

/** 当月の自分の月別エントリを削除（名前非公開時） */
export async function removeMonthly(
  uid: string,
  monthKey: string,
  groupIds: string[]
): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    localStorage.removeItem(DEMO_MONTHLY_SELF)
    return
  }
  const groups = ['all', ...groupIds]
  await Promise.all(groups.map((g) => deleteDoc(doc(db!, 'monthlyRanking', mKey(monthKey, g, uid)))))
}

/** 月別 上位 n 件（group: 'all' or groupId） */
export async function fetchMonthlyTop(
  monthKey: string,
  group = 'all',
  n = 100
): Promise<LeaderEntry[]> {
  if (!isFirebaseConfigured || !db) {
    const list = demoMonthlySeed(monthKey, group)
    const store = JSON.parse(localStorage.getItem(DEMO_MONTHLY_SELF) || '{}')
    const self = store[`${monthKey}__${group}`]
    if (self) list.push(self)
    return list.sort((a, b) => b.score - a.score).slice(0, n)
  }
  const q = query(
    collection(db, 'monthlyRanking'),
    where('month', '==', monthKey),
    where('group', '==', group),
    orderBy('score', 'desc'),
    limit(n)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as LeaderEntry)
}
