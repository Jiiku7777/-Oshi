// OshiHub リマインド通知 送信ジョブ（GitHub Actions から定期実行）。
//
// 仕組み:
//  - ログインユーザー（fcmTokens を持つ）に対してのみ送信。
//  - 各ユーザーの通知設定（タイミング/カテゴリ/グループ別）を尊重。
//  - 「リマインド時刻」が直近に到来したものだけ送る。
//  - reminderLog の決定的IDで重複防止（同じ予定×タイミングは一度だけ）。
//
// 認証: FIREBASE_SERVICE_ACCOUNT（JSON文字列）または GOOGLE_APPLICATION_CREDENTIALS。

import { getMessaging } from 'firebase-admin/messaging'
import { FieldValue } from 'firebase-admin/firestore'
import { initFirestore } from './firestore.mjs'

const TIMINGS = { '1d': 1440, '1h': 60, '30m': 30, '10m': 10 }
const TIMING_LABEL = { '1d': '明日', '1h': '1時間後', '30m': '30分後', '10m': 'まもなく' }
const CATEGORY_LABEL = {
  live: 'ライブ', event: '特典会', tv: 'テレビ', radio: 'ラジオ',
  youtube: 'YouTube配信', tiktok: 'TikTok LIVE', release: 'リリース', goods: 'グッズ',
}
const SITE_URL = 'https://oshilink-b8fab.web.app'
const MAX_LATE_MS = 20 * 60 * 1000 // 遅延・実行間隔のゆらぎを吸収（最大20分の取りこぼし防止）

async function main() {
  const db = initFirestore()
  const messaging = getMessaging()
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const maxIso = new Date(now + 25 * 60 * 60 * 1000).toISOString() // 今後25時間分

  // 直近〜25時間以内に始まる予定だけ取得
  const evSnap = await db
    .collection('events')
    .where('startAt', '>=', nowIso)
    .where('startAt', '<=', maxIso)
    .get()
  const events = evSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (events.length === 0) {
    console.log('対象予定なし')
    return
  }

  // ユーザー（β規模なので全件取得して絞り込み）
  const userSnap = await db.collection('users').get()
  const users = userSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => u.notifications?.enabled && Array.isArray(u.fcmTokens) && u.fcmTokens.length)

  if (users.length === 0) {
    console.log('通知対象ユーザーなし')
    return
  }

  let sent = 0
  for (const user of users) {
    const n = user.notifications
    for (const ev of events) {
      if (!n.categories?.[ev.category]) continue
      if (!n.groupEnabled?.[ev.groupId]) continue
      const start = Date.parse(ev.startAt)
      if (Number.isNaN(start)) continue

      for (const [timing, offMin] of Object.entries(TIMINGS)) {
        if (!n.timings?.[timing]) continue
        const remindAt = start - offMin * 60000
        // 「ちょうど到来した」ものだけ（過去20分以内）
        if (remindAt > now || remindAt <= now - MAX_LATE_MS) continue

        const markerId = `${user.uid}_${ev.id}_${timing}`
        const ref = db.collection('reminderLog').doc(markerId)
        try {
          await ref.create({ uid: user.uid, eventId: ev.id, timing, sentAt: FieldValue.serverTimestamp() })
        } catch {
          continue // 既に送信済み
        }

        const time = String(ev.startAt).slice(11, 16)
        const cat = CATEGORY_LABEL[ev.category] ?? '予定'
        const title = `${TIMING_LABEL[timing]}：${cat}`
        const body = `${time} ${ev.title}`
        const link = ev.url || SITE_URL

        const res = await messaging.sendEachForMulticast({
          tokens: user.fcmTokens,
          notification: { title, body },
          webpush: { fcmOptions: { link }, notification: { icon: '/favicon.svg' } },
        })
        sent += res.successCount

        // 無効トークンを掃除
        const invalid = []
        res.responses.forEach((r, i) => {
          if (
            r.error &&
            ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(
              r.error.code
            )
          ) {
            invalid.push(user.fcmTokens[i])
          }
        })
        if (invalid.length) {
          await db.collection('users').doc(user.uid).update({
            fcmTokens: FieldValue.arrayRemove(...invalid),
          })
        }
      }
    }
  }

  console.log(`送信完了: ${sent}件`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
