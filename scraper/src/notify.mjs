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
// 各タイミングごとの「遅れて送ってもよい猶予（分）」。
// GitHub Actions の無料 cron は間引かれて毎回は動かないため、実行が飛んでも
// 取りこぼさないよう猶予を広めに取る（予定時刻を過ぎていれば送らない）。
const CATCHUP_MIN = { '1d': 360, '1h': 50, '30m': 25, '10m': 12 }
const CATEGORY_LABEL = {
  live: 'ライブ', event: '特典会', tv: 'テレビ', radio: 'ラジオ',
  youtube: 'YouTube配信', tiktok: 'TikTok LIVE', release: 'リリース', goods: 'グッズ',
}
const SITE_URL = 'https://oshilink-b8fab.web.app'

/** テスト送信: トークンを持つ全ユーザーに1通だけ通知を送る（動作確認用） */
async function sendTest(db, messaging) {
  const userSnap = await db.collection('users').get()
  const users = userSnap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => Array.isArray(u.fcmTokens) && u.fcmTokens.length)
  let ok = 0
  for (const user of users) {
    const res = await messaging.sendEachForMulticast({
      tokens: user.fcmTokens,
      notification: { title: 'OshiHub 🔔', body: 'テスト通知です。これが届けば設定完了！' },
      webpush: { fcmOptions: { link: 'https://oshilink-b8fab.web.app' } },
    })
    ok += res.successCount
  }
  console.log(`テスト送信: ${users.length}ユーザー / 成功${ok}件`)
}

async function main() {
  const db = initFirestore()
  const messaging = getMessaging()

  if (process.argv.includes('--test')) {
    await sendTest(db, messaging)
    return
  }

  const now = Date.now()
  // 保存される startAt は JST(+09:00) 形式。クエリ境界も同じ +09:00 形式に揃えないと
  // 文字列比較がズレて深夜帯の予定を取りこぼす/過去予定を拾う。同形式なら辞書順=時系列順。
  const jstIso = (ms) => new Date(ms + 9 * 60 * 60 * 1000).toISOString().replace('Z', '+09:00')
  const nowIso = jstIso(now)
  const maxIso = jstIso(now + 25 * 60 * 60 * 1000) // 今後25時間分

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

      // 既に開催時刻を過ぎた予定は通知しない（「1時間後」が開始後に届くのを防ぐ）
      if (start <= now) continue

      for (const [timing, offMin] of Object.entries(TIMINGS)) {
        if (!n.timings?.[timing]) continue
        const remindAt = start - offMin * 60000
        const catchupMs = (CATCHUP_MIN[timing] ?? 15) * 60000
        // リマインド時刻を過ぎ、かつ猶予内（=実行が飛んでも遅れて拾える）。未来分は送らない。
        if (remindAt > now || now - remindAt > catchupMs) continue

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
