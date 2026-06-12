import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/config'
import type { NotificationSettings, UserProfile } from '@/types'
import { CATEGORY_ORDER, TIMING_ORDER } from '@/utils/category'
import { GROUPS } from '@/data/groups'

const DEMO_KEY = 'oshihub_demo_profile'

/** 通知設定の初期値（全 ON ベースで、ユーザーが絞り込む想定） */
export function defaultNotificationSettings(oshiGroupIds: string[] = []): NotificationSettings {
  const categories = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, true])
  ) as NotificationSettings['categories']
  const timings = Object.fromEntries(
    TIMING_ORDER.map((t) => [t, t === '1h']) // 既定は「1時間前」のみ ON
  ) as NotificationSettings['timings']
  const groupEnabled = Object.fromEntries(
    GROUPS.map((g) => [g.id, oshiGroupIds.includes(g.id)])
  ) as Record<string, boolean>
  return { enabled: true, categories, timings, groupEnabled }
}

export function newUserProfile(params: {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}): UserProfile {
  const now = new Date().toISOString()
  return {
    ...params,
    oshiGroupIds: [],
    notifications: defaultNotificationSettings(),
    onboarded: false,
    createdAt: now,
    updatedAt: now,
  }
}

// ---- デモモード（localStorage 永続化） ----
function readDemo(): UserProfile | null {
  const raw = localStorage.getItem(DEMO_KEY)
  return raw ? (JSON.parse(raw) as UserProfile) : null
}
function writeDemo(profile: UserProfile) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(profile))
}

/** プロフィール取得。無ければ作成して返す。 */
export async function fetchOrCreateProfile(base: {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}): Promise<UserProfile> {
  if (!isFirebaseConfigured || !db) {
    const existing = readDemo()
    if (existing) return existing
    const created = newUserProfile(base)
    writeDemo(created)
    return created
  }

  const ref = doc(db, 'users', base.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return snap.data() as UserProfile
  }
  const created = newUserProfile(base)
  await setDoc(ref, created)
  return created
}

/** プロフィールの部分更新 */
export async function updateProfile(
  uid: string,
  patch: Partial<UserProfile>
): Promise<void> {
  const updatedAt = new Date().toISOString()
  if (!isFirebaseConfigured || !db) {
    const current = readDemo()
    if (current) writeDemo({ ...current, ...patch, updatedAt })
    return
  }
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, { ...patch, updatedAt })
}

export function clearDemoProfile() {
  localStorage.removeItem(DEMO_KEY)
}
