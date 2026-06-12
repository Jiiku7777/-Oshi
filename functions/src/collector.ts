import Anthropic from '@anthropic-ai/sdk'
import type { GroupSource } from './groups.js'
import type { ExtractionResult } from './types.js'

const MODEL = 'claude-opus-4-8'

// 抽出結果を受け取る strict カスタムツール。
// web_search / web_fetch で集めた情報をこの形に整形させ、構造化出力として受け取る。
const SAVE_TOOL: Anthropic.Tool = {
  name: 'save_schedule',
  description:
    '収集・整形した予定とニュースを保存する。すべての調査が終わったら必ずこのツールを1回呼び出すこと。',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      events: {
        type: 'array',
        description: '今日以降の予定。過去の予定は含めない。',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string', description: 'イベント名・番組名' },
            category: {
              type: 'string',
              enum: ['live', 'event', 'tv', 'radio', 'youtube', 'tiktok', 'release', 'goods'],
              description:
                'live=ライブ, event=特典会, tv=テレビ出演, radio=ラジオ出演, youtube=YouTube配信, tiktok=TikTok LIVE, release=リリース, goods=グッズ発売',
            },
            startAt: {
              type: 'string',
              description: 'ISO 8601 / JST(+09:00)。時刻不明なら T00:00:00+09:00。',
            },
            endAt: { type: 'string', description: '終了時刻（不明なら省略）' },
            source: {
              type: 'string',
              enum: ['official_site', 'official_x', 'youtube', 'other'],
            },
            url: { type: 'string', description: '詳細・元ページのURL' },
            description: { type: 'string', description: '会場や補足（任意）' },
          },
          required: ['title', 'category', 'startAt', 'source'],
        },
      },
      news: {
        type: 'array',
        description: '直近の告知・ニュース（最大5件）',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            url: { type: 'string' },
            publishedAt: { type: 'string', description: 'ISO 8601。不明なら本日。' },
          },
          required: ['title', 'summary', 'publishedAt'],
        },
      },
    },
    required: ['events', 'news'],
  },
}

// サーバーサイドの web 検索 / 取得ツール（GA）
const WEB_TOOLS = [
  { type: 'web_search_20260209', name: 'web_search' },
  { type: 'web_fetch_20260209', name: 'web_fetch' },
] as unknown as Anthropic.ToolUnion[]

function buildPrompt(group: GroupSource, todayISO: string): string {
  return [
    `あなたはアイドルの公式情報を収集するアシスタントです。`,
    `対象グループ: ${group.name}`,
    `公式サイト: ${group.officialUrls.join(', ')}`,
    `公式X: ${group.xHandles.join(', ')}`,
    `本日の日付: ${todayISO}（日本時間）`,
    ``,
    `次の手順で作業してください。`,
    `1. web_fetch で上記の公式サイト（特にスケジュールページ）を確認する。`,
    `2. 不足する情報は web_search で「${group.name} スケジュール」「${group.name} 出演」等を検索して補う。`,
    `3. 本日以降の予定を、ライブ/特典会/テレビ/ラジオ/YouTube/TikTok LIVE/リリース/グッズ発売 のいずれかに分類する。`,
    `4. 直近の告知・ニュースがあれば最大5件まとめる。`,
    `5. 最後に必ず save_schedule ツールを1回呼び出して結果を渡す。`,
    ``,
    `注意:`,
    `- 過去の日付の予定は含めない。`,
    `- 日時は可能な限り正確に、JST(+09:00)のISO 8601で。時刻が不明なら 00:00:00 にする。`,
    `- 不確かな情報は含めない。確認できた予定だけを返す。`,
    `- 該当する予定が無ければ events を空配列で save_schedule を呼ぶ。`,
  ].join('\n')
}

/**
 * 1グループ分の予定・ニュースを収集して構造化結果を返す。
 * Claude のサーバーサイド web ツールで巡回し、save_schedule ツールで整形結果を受け取る。
 */
export async function collectGroup(
  client: Anthropic,
  group: GroupSource,
  todayISO: string,
  log: (msg: string) => void = console.log
): Promise<ExtractionResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildPrompt(group, todayISO) },
  ]

  const tools: Anthropic.ToolUnion[] = [...WEB_TOOLS, SAVE_TOOL]
  let forced = false

  for (let i = 0; i < 12; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      tools,
      // 終盤、まだ save_schedule を呼んでいなければ強制する
      ...(forced ? { tool_choice: { type: 'tool', name: 'save_schedule' } } : {}),
      messages,
    } as Anthropic.MessageCreateParamsNonStreaming)

    // サーバーツール（web検索/取得）がループ上限に達した → そのまま再送して継続
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content })
      continue
    }

    if (res.stop_reason === 'tool_use') {
      const save = res.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'save_schedule'
      )
      if (save) {
        log(`[${group.id}] save_schedule received`)
        return save.input as ExtractionResult
      }
      // 想定外のツール呼び出し（基本起きない）。空結果を返して継続させる。
      messages.push({ role: 'assistant', content: res.content })
      const otherToolUses = res.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )
      messages.push({
        role: 'user',
        content: otherToolUses.map((t) => ({
          type: 'tool_result' as const,
          tool_use_id: t.id,
          content: 'noop',
        })),
      })
      continue
    }

    // end_turn 等で save_schedule を呼ばずに終わった → 一度だけ強制呼び出しさせる
    if (!forced) {
      log(`[${group.id}] stop_reason=${res.stop_reason}, forcing save_schedule`)
      messages.push({ role: 'assistant', content: res.content })
      messages.push({
        role: 'user',
        content: 'これまでに確認できた予定とニュースを save_schedule ツールで保存してください。',
      })
      forced = true
      continue
    }

    break
  }

  log(`[${group.id}] no result extracted`)
  return { events: [], news: [] }
}
