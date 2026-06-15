import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// 超ときめき♡宣伝部（toki-sen.com）公式カレンダー。サーバーレンダリング。
//   /vertical_calendar/YYYY/M で月切替
//   li.list-group-item
//     time.time[datetime="2026-06-01"] … 日付
//     .plan > a[href=/contents/ID] > span.tag(OTHER/MEDIA/LIVE…) + タイトル文字列

export async function collectTokisen(source) {
  const events = []
  for (const { year, month } of upcomingMonths(1)) {
    const url = `${source.base}/vertical_calendar/${year}/${month}`
    let html
    try {
      html = await fetchText(url)
    } catch {
      continue
    }
    const $ = cheerio.load(html)

    $('li.list-group-item').each((_, li) => {
      const $li = $(li)
      const dt = $li.find('time.time').first().attr('datetime') || ''
      const dm = /(\d{4})-(\d{2})-(\d{2})/.exec(dt)
      if (!dm) return

      $li.find('.plan a').each((__, a) => {
        const $a = $(a)
        const label = $a.find('.tag').first().text().trim()
        const title = $a.clone().children('.tag').remove().end().text().replace(/\s+/g, ' ').trim()
        if (!title) return
        const tm = /(\d{1,2}):(\d{2})/.exec(title)
        const startAt = toISOJst(+dm[1], +dm[2], +dm[3], tm ? tm[0] : '')
        if (!isFutureOrToday(startAt)) return
        const href = $a.attr('href') || ''
        events.push({
          title,
          category: guessCategory(title, label),
          startAt,
          source: 'official_site',
          url: href.startsWith('http') ? href : `${source.base}${href}`,
          description: label || undefined,
        })
      })
    })
  }

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
