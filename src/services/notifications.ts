import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db, initMessaging, isFirebaseConfigured } from '@/firebase/config'

// Web Push（FCM）のトークン取得・保存。ログインユーザーのみが対象。
// VAPID公開鍵は Firebase コンソール > Cloud Messaging > ウェブ構成 で発行し .env に設定。

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

// 「この端末で通知ON」の意思 & 端末トークンを localStorage に保持（端末ごとの設定）。
// これにより、画面を開き直しても状態が保たれ、毎回の再登録は不要になる。
const onKey = (uid: string) => `oshihub_push_on_${uid}`
const tokenKey = (uid: string) => `oshihub_fcm_token_${uid}`

/** この端末で通知をONにしているか（ユーザーの意思） */
export function isPushOn(uid: string): boolean {
  try {
    return localStorage.getItem(onKey(uid)) === '1'
  } catch {
    return false
  }
}

export type EnableResult =
  | { ok: true }
  | {
      ok: false
      reason: 'demo' | 'unsupported' | 'no-vapid' | 'denied' | 'no-token' | 'error'
      detail?: string
    }

/** 端末の通知許可状態 */
export function currentPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_KEY)
}

/** 通知を有効化：許可を求め、FCMトークンをユーザードキュメントに保存 */
export async function enableNotifications(uid: string): Promise<EnableResult> {
  if (!isFirebaseConfigured || !db) return { ok: false, reason: 'demo' }
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator))
    return { ok: false, reason: 'unsupported' }
  if (!VAPID_KEY) return { ok: false, reason: 'no-vapid' }

  const messaging = await initMessaging()
  if (!messaging) return { ok: false, reason: 'unsupported' }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    await navigator.serviceWorker.ready

    // 既存のプッシュ購読が別の鍵だと "push service error" になるので作り直す
    try {
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
    } catch {
      /* noop */
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: 'no-token' }

    await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) })
    try {
      localStorage.setItem(onKey(uid), '1')
      localStorage.setItem(tokenKey(uid), token)
    } catch {
      /* noop */
    }
    return { ok: true }
  } catch (e) {
    console.error('enableNotifications failed', e)
    const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
    return { ok: false, reason: 'error', detail }
  }
}

/** この端末の通知をOFFにする：意思フラグを消し、保存したトークンをユーザーから外す。 */
export async function disableNotifications(uid: string): Promise<void> {
  let token: string | null = null
  try {
    token = localStorage.getItem(tokenKey(uid))
    localStorage.removeItem(onKey(uid))
    localStorage.removeItem(tokenKey(uid))
  } catch {
    /* noop */
  }
  if (isFirebaseConfigured && db && token) {
    try {
      await updateDoc(doc(db, 'users', uid), { fcmTokens: arrayRemove(token) })
    } catch {
      /* トークン除去に失敗してもローカルのOFFは維持 */
    }
  }
}

/** アプリ前面表示中にプッシュを受けたら簡易通知を出す */
export async function listenForegroundMessages(): Promise<void> {
  const messaging = await initMessaging()
  if (!messaging) return
  onMessage(messaging, (payload) => {
    const n = payload.notification
    if (n && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(n.title ?? 'OshiHub', { body: n.body, icon: '/favicon.svg' })
    }
  })
}
