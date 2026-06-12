/**
 * ローカルで1回だけ収集を実行するスクリプト（デプロイ不要の動作確認用）。
 *
 * 事前準備:
 *   1. Firebase サービスアカウント鍵を取得し、環境変数を設定
 *      $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccount.json"
 *   2. Anthropic API キーを設定
 *      $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   3. 実行
 *      npm run collect:once
 *
 * 特定グループだけ収集したい場合は引数で id を渡す:
 *   node lib/runOnce.js fruits-zipper equal-love
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import Anthropic from '@anthropic-ai/sdk'
import { GROUP_SOURCES } from './groups.js'
import { collectGroup } from './collector.js'
import { saveExtraction } from './firestore.js'

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('環境変数 ANTHROPIC_API_KEY が未設定です。')
  }
  initializeApp({ credential: applicationDefault() })

  const filter = process.argv.slice(2)
  const groups = filter.length
    ? GROUP_SOURCES.filter((g) => filter.includes(g.id))
    : GROUP_SOURCES

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const todayISO = new Date().toISOString()

  for (const group of groups) {
    console.log(`\n=== ${group.name} (${group.id}) ===`)
    const result = await collectGroup(client, group, todayISO)
    console.log(`  抽出: events=${result.events.length} news=${result.news.length}`)
    for (const e of result.events) {
      console.log(`   - ${e.startAt}  [${e.category}] ${e.title}`)
    }
    const saved = await saveExtraction(group.id, result.events, result.news)
    console.log(`  Firestore保存: events=${saved.events} news=${saved.news}`)
  }
  console.log('\n完了')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
