import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday } from '../util.mjs'

// スターダスト系（ももいろクローバーZ など）公式サイトの /schedule。
// サーバーレンダリング。当月＋翌月分が出る。
//   .schedule_list_container
//     .schedule_list_genre_text … ジャンル(TV/LIVE/RADIO…)
//     h2.schedule_list_title     … タイトル
//     p.schedule_list_text       … "2026/6/1(月)24:00～26:10"（日付＋時刻）
//     .schedule_list_link a[href] … 外部リンク

export async function collectStardust(source) {
  const html = await fetchText(`${source.base}/schedule`)
  const $ = cheerio.load(html)
  const events = []

  $('.schedule_list_container').each((_, el) => {
    const $e = $(el)
    const title = $e.find('.schedule_list_title').first().text().replace(/\s+/g, ' ').trim()
    if (!title) return
    const dtext = $e.find('.schedule_list_text').first().text()
    const dm = /(20\d\d)\/(\d{1,2})\/(\d{1,2})/.exec(dtext)
    if (!dm) return
    const tm = /(\d{1,2}):(\d{2})/.exec(dtext)
    const startAt = toISOJst(+dm[1], +dm[2], +dm[3], tm ? tm[0] : '')
    if (!isFutureOrToday(startAt)) return
    const genre = $e.find('.schedule_list_genre_text').first().text().trim()
    const href = $e.find('.schedule_list_link a').first().attr('href') || ''
    events.push({
      title,
      category: guessCategory(title, genre),
      startAt,
      source: 'official_site',
      url: href || `${source.base}/schedule`,
      description: genre || undefined,
    })
  })

  const seen = new Set()
  return {
    events: events.filter((e) => {
      const k = `${e.startAt.slice(0, 10)}|${e.title}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    }),
    news: [],
  }
}
