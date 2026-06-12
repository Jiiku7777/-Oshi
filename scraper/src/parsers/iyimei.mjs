import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// =LOVE / ≠ME / ≒JOY 公式サイト（同一CMS）のスケジュールをパース。
// カレンダーグリッド構造:
//   .calendarBody .week .cell > span.date(日) + .catNN > a[href=/schedule/detail/ID]
//                                    > span.cat(ラベル) + span.tit(タイトル)
// 月は ?year=YYYY&month=MM で切替。

export async function collectIyimei(source) {
  const events = []
  for (const { year, month } of upcomingMonths(2)) {
    let html
    try {
      html = await fetchText(`${source.base}/schedule?year=${year}&month=${String(month).padStart(2, '0')}`)
    } catch {
      continue
    }
    const $ = cheerio.load(html)

    $('.calendarBody .cell').each((_, cell) => {
      const $cell = $(cell)
      const day = parseInt($cell.find('span.date').first().text().trim(), 10)
      if (!day) return

      $cell.find('a[href*="/schedule/detail/"]').each((__, a) => {
        const $a = $(a)
        const label = $a.find('span.cat').text().trim()
        const title = $a.find('span.tit').text().trim()
        if (!title) return
        const href = $a.attr('href') || ''
        const startAt = toISOJst(year, month, day)
        if (!isFutureOrToday(startAt)) return
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

  // 同一URL重複を除去
  const seen = new Set()
  const deduped = events.filter((e) => {
    const k = `${e.startAt.slice(0, 10)}|${e.title}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  return { events: deduped, news: [] }
}
