// OshiHub 無料収集スクリプト（AI不使用）。
//
// 使い方:
//   node src/collect.mjs --dry          … 取得のみ（Firestore保存なし・標準出力）
//   node src/collect.mjs                … 取得してFirestoreに保存
//   node src/collect.mjs nogizaka46     … 特定グループだけ
//
// 認証（保存時）: FIREBASE_SERVICE_ACCOUNT（JSON文字列）または GOOGLE_APPLICATION_CREDENTIALS

import { SOURCES } from './sources.mjs'
import { collectNogizaka } from './parsers/nogizaka.mjs'
import { collectIyimei } from './parsers/iyimei.mjs'
import { collectAsobi } from './parsers/asobisystem.mjs'
import { collectSakurazaka } from './parsers/sakurazaka.mjs'
import { collectHinatazaka } from './parsers/hinatazaka.mjs'
import { collectLapone } from './parsers/lapone.mjs'
import { collectStardust } from './parsers/stardust.mjs'
import { collectTokisen } from './parsers/tokisen.mjs'
import { collectSkiyaki } from './parsers/skiyaki.mjs'
import { collectStarto } from './parsers/starto.mjs'

const PARSERS = {
  nogizaka: collectNogizaka,
  iyimei: collectIyimei,
  asobisystem: collectAsobi,
  sakurazaka: collectSakurazaka,
  hinatazaka: collectHinatazaka,
  lapone: collectLapone,
  stardust: collectStardust,
  tokisen: collectTokisen,
  skiyaki: collectSkiyaki,
  starto: collectStarto,
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const ids = args.filter((a) => !a.startsWith('--'))

  const targets = SOURCES.filter(
    (s) => s.status === 'ok' && (ids.length === 0 || ids.includes(s.id))
  )

  if (targets.length === 0) {
    console.log('対象グループがありません（status: ok のものだけ収集します）')
    return
  }

  let saveEvents = null
  if (!dry) ({ saveEvents } = await import('./firestore.mjs'))

  let total = 0
  for (const source of targets) {
    const parser = PARSERS[source.parser]
    if (!parser) continue
    try {
      const { events } = await parser(source)
      console.log(`\n=== ${source.name} (${source.id}): ${events.length}件 ===`)
      for (const e of events.slice(0, 8)) {
        console.log(`  ${e.startAt.slice(0, 16)}  [${e.category}] ${e.title}`)
      }
      if (events.length > 8) console.log(`  …ほか ${events.length - 8}件`)

      if (!dry) {
        const n = await saveEvents(source.id, events)
        console.log(`  → Firestore保存: ${n}件`)
        total += n
      }
    } catch (err) {
      console.error(`  [${source.id}] 失敗:`, err.message)
    }
  }

  const todo = SOURCES.filter((s) => s.status === 'todo').map((s) => s.name)
  console.log(`\n${dry ? '(dry run)' : `合計 ${total}件 保存`}。`)
  if (todo.length) console.log(`未対応(JS描画/API非公開): ${todo.join(', ')}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
