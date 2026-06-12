import { initializeApp } from 'firebase-admin/app'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { GROUP_SOURCES } from './groups.js'
import { collectGroup } from './collector.js'
import { saveExtraction } from './firestore.js'

initializeApp()

// Anthropic API キーは Secret Manager で管理（デプロイ時に設定）
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

const REGION = 'asia-northeast1'

/** 全グループを順番に収集して Firestore に保存。結果サマリを返す。 */
async function runCollection(): Promise<Record<string, { events: number; news: number }>> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
  const todayISO = new Date().toISOString()
  const summary: Record<string, { events: number; news: number }> = {}

  for (const group of GROUP_SOURCES) {
    try {
      const result = await collectGroup(client, group, todayISO)
      const saved = await saveExtraction(group.id, result.events, result.news)
      summary[group.id] = saved
      console.log(`[${group.id}] saved events=${saved.events} news=${saved.news}`)
    } catch (err) {
      console.error(`[${group.id}] collection failed:`, err)
      summary[group.id] = { events: 0, news: 0 }
    }
  }
  return summary
}

/** 定期実行：6時間ごと（JST）。タイムアウト・メモリは収集の重さに合わせて確保。 */
export const scheduledCollect = onSchedule(
  {
    schedule: 'every 6 hours',
    timeZone: 'Asia/Tokyo',
    region: REGION,
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: [ANTHROPIC_API_KEY],
  },
  async () => {
    console.log('scheduledCollect: start')
    const summary = await runCollection()
    console.log('scheduledCollect: done', JSON.stringify(summary))
  }
)

/**
 * 手動トリガー（動作確認・初回投入用）。
 * デプロイ後 `curl https://<region>-<project>.cloudfunctions.net/manualCollect` で実行。
 * 本番では認証を付けるか、デプロイ後に無効化することを推奨。
 */
export const manualCollect = onRequest(
  {
    region: REGION,
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: [ANTHROPIC_API_KEY],
  },
  async (_req, res) => {
    console.log('manualCollect: start')
    const summary = await runCollection()
    res.json({ ok: true, summary })
  }
)
