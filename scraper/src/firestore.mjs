import { createHash } from 'node:crypto'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let db = null

/**
 * Firestore を初期化。認証は次の優先順:
 *  1) 環境変数 FIREBASE_SERVICE_ACCOUNT にサービスアカウントJSON（GitHub Actions Secret向け）
 *  2) GOOGLE_APPLICATION_CREDENTIALS（鍵ファイルパス）
 */
export function initFirestore() {
  if (db) return db
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    initializeApp({ credential: cert(JSON.parse(raw)) })
  } else {
    initializeApp({ credential: applicationDefault() })
  }
  db = getFirestore()
  return db
}

function eventId(groupId, startAt, title) {
  const day = startAt.slice(0, 10)
  const norm = title.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha1').update(`${groupId}|${day}|${norm}`).digest('hex').slice(0, 24)
}

/** イベント配列を upsert（merge）。書き込み件数を返す。 */
export async function saveEvents(groupId, events) {
  if (events.length === 0) return 0
  const fs = initFirestore()
  const collectedAt = new Date().toISOString()
  // バッチ上限(500)を考慮して分割
  let written = 0
  for (let i = 0; i < events.length; i += 400) {
    const batch = fs.batch()
    for (const e of events.slice(i, i + 400)) {
      if (!e.title || !e.startAt) continue
      const ref = fs.collection('events').doc(eventId(groupId, e.startAt, e.title))
      batch.set(ref, {
        title: e.title,
        groupId,
        category: e.category,
        startAt: e.startAt,
        ...(e.endAt ? { endAt: e.endAt } : {}),
        source: e.source || 'official_site',
        ...(e.url ? { url: e.url } : {}),
        ...(e.description ? { description: e.description } : {}),
        collectedAt,
      }, { merge: true })
      written++
    }
    await batch.commit()
  }
  return written
}
