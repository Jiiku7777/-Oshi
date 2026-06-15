import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// SKIYAKI系の公式サイト（ONE N' ONLY など）。/vertical_calendar/YYYY/M で月切替。
//   .schedule-list-item-inner
//     time[datetime="2026-06-01"] + .time-hour(HH:MM)
//     .schedule-list-tag … カテゴリ(MEDIA/LIVE/RELEASE…)
//     .schedule-list-content … タイトル（img[alt]にも入る）/ a[href] 詳細

export async function collectSkiyaki(source) {
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

    $('.schedule-list-item-inner').each((_, it) => {
      const $it = $(it)
      const dt = $it.find('time[datetime]').first().attr('datetime') || ''
      const dm = /(\d{4})-(\d{2})-(\d{2})/.exec(dt)
      if (!dm) return
      const hour = $it.find('.time-hour').first().text().trim()
      const label = $it.find('.schedule-list-tag').first().text().replace(/\s+/g, ' ').trim()
      // 画像alt（簡潔なタイトル）を優先。無ければ本文テキストの先頭。
      let title = ($it.find('img[alt]').first().attr('alt') || '').replace(/\s+/g, ' ').trim()
      if (!title) {
        title = $it
          .find('.schedule-list-content')
          .first()
          .clone()
          .find('.schedule-list-thumb')
          .remove()
          .end()
          .text()
          .replace(/\s+/g, ' ')
          .trim()
      }
      if (!title) return
      if (title.length > 90) title = title.slice(0, 88) + '…'
      const time = /^\d{1,2}:\d{2}$/.test(hour) && hour !== '00:00' ? hour : ''
      const startAt = toISOJst(+dm[1], +dm[2], +dm[3], time)
      if (!isFutureOrToday(startAt)) return
      const href = $it.find('a[href]').first().attr('href') || ''
      events.push({
        title,
        category: guessCategory(title, label),
        startAt,
        source: 'official_site',
        url: href.startsWith('http') ? href : href ? `${source.base}${href}` : url,
        description: label || undefined,
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
