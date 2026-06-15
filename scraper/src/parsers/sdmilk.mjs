import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday } from '../util.mjs'

// M!LK（sd-milk.com）公式スケジュール。サーバーレンダリング。
//   li.c_contents-list-item > a[href=/contents/ID]
//     time.time[datetime="2026-05-16"]
//     .c_contents-list-tags .tag(TV/RADIO/LIVE…)
//     .c_contents-list-heading（タイトル）

export async function collectSdmilk(source) {
  const $ = cheerio.load(await fetchText(`${source.base}/contents/schedule`))
  const events = []
  const seen = new Set()

  $('li.c_contents-list-item').each((_, li) => {
    const $li = $(li)
    const dt = $li.find('time[datetime]').first().attr('datetime') || ''
    const dm = /(\d{4})-(\d{2})-(\d{2})/.exec(dt)
    if (!dm) return
    const label = $li.find('.c_contents-list-tags .tag').first().text().trim()
    const title =
      $li.find('.c_contents-list-heading').first().text().replace(/\s+/g, ' ').trim() ||
      $li.find('.c_contents-list-title').first().text().replace(/\s+/g, ' ').trim()
    if (!title) return
    const startAt = toISOJst(+dm[1], +dm[2], +dm[3])
    if (!isFutureOrToday(startAt)) return
    const k = `${startAt.slice(0, 10)}|${title}`
    if (seen.has(k)) return
    seen.add(k)
    const href = $li.find('a').first().attr('href') || ''
    events.push({
      title,
      category: guessCategory(title, label),
      startAt,
      source: 'official_site',
      url: href.startsWith('http') ? href : href ? `${source.base}${href}` : undefined,
      description: label || undefined,
    })
  })

  return { events, news: [] }
}
