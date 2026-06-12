import { createHash } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import type { ExtractedEvent, ExtractedNews } from './types.js'

/**
 * 決定的なドキュメントIDを生成して再実行時の重複を防ぐ。
 * 同じグループ・同じ日付（日単位）・同じタイトルなら同一IDになる。
 */
function eventId(groupId: string, startAt: string, title: string): string {
  const day = startAt.slice(0, 10) // YYYY-MM-DD
  const norm = title.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha1').update(`${groupId}|${day}|${norm}`).digest('hex').slice(0, 24)
}

function newsId(groupId: string, publishedAt: string, title: string): string {
  const day = publishedAt.slice(0, 10)
  const norm = title.trim().toLowerCase().replace(/\s+/g, ' ')
  return createHash('sha1').update(`news|${groupId}|${day}|${norm}`).digest('hex').slice(0, 24)
}

/** 抽出結果を Firestore に upsert（merge）。書き込んだ件数を返す。 */
export async function saveExtraction(
  groupId: string,
  events: ExtractedEvent[],
  news: ExtractedNews[]
): Promise<{ events: number; news: number }> {
  const db = getFirestore()
  const collectedAt = new Date().toISOString()
  const batch = db.batch()

  for (const e of events) {
    if (!e.title || !e.startAt) continue
    const ref = db.collection('events').doc(eventId(groupId, e.startAt, e.title))
    batch.set(
      ref,
      {
        title: e.title,
        groupId,
        category: e.category,
        startAt: e.startAt,
        ...(e.endAt ? { endAt: e.endAt } : {}),
        source: e.source,
        ...(e.url ? { url: e.url } : {}),
        ...(e.description ? { description: e.description } : {}),
        collectedAt,
      },
      { merge: true }
    )
  }

  for (const n of news) {
    if (!n.title) continue
    const ref = db.collection('news').doc(newsId(groupId, n.publishedAt || collectedAt, n.title))
    batch.set(
      ref,
      {
        groupId,
        title: n.title,
        summary: n.summary ?? '',
        ...(n.url ? { url: n.url } : {}),
        publishedAt: n.publishedAt || collectedAt,
      },
      { merge: true }
    )
  }

  await batch.commit()
  return { events: events.length, news: news.length }
}
