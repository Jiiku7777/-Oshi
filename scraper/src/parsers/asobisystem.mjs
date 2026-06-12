import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// FRUITS ZIPPER / CUTIE STREET / CANDY TUNE / SWEET STEADY（asobisystem KAWAII LAB. 同一CMS）。
// スケジュールページ構造（サーバーレンダリング）:
//   ul.list--schedule > li.sys-schedule > a.box[href=/live_information/detail/ID]
//     .block--date__month(MM) .block--date__date(DD) .block--date__youbi([MON])
//     .block--txt > p.category(EVENT/LIVE…) + p.tit(タイトル)
//   月は ?viewMode=default&year=YYYY&month=MM で切替

export async function collectAsobi(source) {
  const events = []
  for (const { year, month } of upcomingMonths(2)) {
    const url = `${source.base}/live_information/schedule/list/?viewMode=default&year=${year}&month=${String(month).padStart(2, '0')}`
    let html
    try {
      html = await fetchText(url)
    } catch {
      continue
    }
    const $ = cheerio.load(html)

    $('li.sys-schedule a.box, .list--schedule a.box').each((_, a) => {
      const $a = $(a)
      const mm = parseInt($a.find('.block--date__month').first().text().trim(), 10)
      const dd = parseInt($a.find('.block--date__date').first().text().trim(), 10)
      if (!mm || !dd) return
      // 年は表示中の月から決定（12→1月の年跨ぎを考慮）
      const y = mm < month ? year + 1 : year
      const label = $a.find('.category').first().text().trim()
      const title = $a.find('.tit').first().text().replace(/\s+/g, ' ').trim()
      if (!title) return
      const href = $a.attr('href') || ''
      const startAt = toISOJst(y, mm, dd)
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
  }

  // 月をまたいだ重複を除去
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
