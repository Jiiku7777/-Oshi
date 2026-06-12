import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// 日向坂46 公式メディアスケジュール（サーバーレンダリング）。
// 構造:
//   .p-schedule__list-group
//     .c-schedule__date--list > span(日) <b>曜日</b>
//     ul.p-schedule__list > li.p-schedule__item
//       a[href=/s/official/media/detail/ID]
//         .c-schedule__category(配信/テレビ等) + .c-schedule__time--list(時刻) + .c-schedule__text(タイトル)
//   月は ?dy=YYYYMM で切替

export async function collectHinatazaka(source) {
  const events = []
  const seen = new Set()

  for (const { year, month } of upcomingMonths(2)) {
    const dy = `${year}${String(month).padStart(2, '0')}`
    let html
    try {
      html = await fetchText(`${source.base}/media/list?dy=${dy}`)
    } catch {
      continue
    }
    const $ = cheerio.load(html)

    $('.p-schedule__list-group').each((_, group) => {
      const $g = $(group)
      const day = parseInt($g.find('.c-schedule__date--list span').first().text().trim(), 10)
      if (!day) return

      $g.find('li.p-schedule__item').each((__, li) => {
        const $li = $(li)
        const cat = $li.find('.c-schedule__category').first().text().trim()
        const time = $li.find('.c-schedule__time--list').first().text().trim()
        const title = $li.find('.c-schedule__text').first().text().replace(/\s+/g, ' ').trim()
        if (!title) return
        const href = $li.find('a').first().attr('href') || ''
        const startAt = toISOJst(year, month, day, time)
        if (!isFutureOrToday(startAt)) return
        const dedup = `${startAt.slice(0, 10)}|${title}`
        if (seen.has(dedup)) return
        seen.add(dedup)

        const url = href
          ? (href.startsWith('http') ? href : `https://www.hinatazaka46.com${href.split('?')[0]}`)
          : undefined
        events.push({
          title,
          category: guessCategory(title, cat),
          startAt,
          source: 'official_site',
          url,
          description: cat || undefined,
        })
      })
    })
  }
  return { events, news: [] }
}
