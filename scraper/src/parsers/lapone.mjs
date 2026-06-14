import * as cheerio from 'cheerio'
import { fetchText, guessCategory, toISOJst, isFutureOrToday } from '../util.mjs'

// LAPONE系（JO1 / INI / DXTEEN / ME:I など）。公式サイトの /schedule/list が
// サーバーレンダリング・同一テンプレ。当月分が出る（月切替はJSのため当月のみ取得、
// 日次収集で常に最新）。
//   ul.list--schedule > li
//     p.date … "2026.06.01[Mon]"（年あり）or "06.01Mon"（年なし）
//     a[href=/schedule/detail/ID] > p.category(RELEASE/LIVE/TV/RADIO…) + p.tit(タイトル)

function lcat(label, title) {
  const L = (label || '').toUpperCase()
  if (L.includes('RELEASE')) return 'release'
  if (L.includes('RADIO')) return 'radio'
  if (L.includes('TV')) return 'tv'
  if (L.includes('WEB')) return guessCategory(title, 'web')
  if (L.includes('LIVE') || L.includes('EVENT')) return guessCategory(title)
  return guessCategory(title, label)
}

export async function collectLapone(source) {
  const html = await fetchText(`${source.base}/schedule/list`)
  const $ = cheerio.load(html)
  const now = new Date()
  const nowY = now.getFullYear()
  const nowM = now.getMonth() + 1
  const events = []

  $('ul.list--schedule > li').each((_, li) => {
    const $li = $(li)
    const $date = $li.find('p.date').first()
    const dtxt = $date.text().replace(/\s+/g, ' ').trim()
    let y, m, d
    const full = /(\d{4})\.(\d{1,2})\.(\d{1,2})/.exec(dtxt)
    const spanM = $date.find('.m').first().text().trim()
    const spanD = $date.find('.d').first().text().trim()
    if (full) {
      y = +full[1]; m = +full[2]; d = +full[3]
    } else if (spanM && spanD) {
      m = +spanM; d = +spanD; y = m < nowM ? nowY + 1 : nowY // INI形式（span.m/.d）
    } else {
      const md = /(\d{1,2})[.\s]+(\d{1,2})/.exec(dtxt) // "06.01" or "06 01"
      if (!md) return
      m = +md[1]; d = +md[2]
      y = m < nowM ? nowY + 1 : nowY // 当月ページなので年は当年/翌年で推定
    }
    if (!m || !d) return

    $li.find('a[href*="/schedule/detail/"]').each((__, a) => {
      const $a = $(a)
      const label = $a.find('p.category').first().text().trim()
      const title = $a.find('p.tit').first().text().replace(/\s+/g, ' ').trim()
      if (!title) return
      const tm = /(\d{1,2}):(\d{2})/.exec(title)
      const startAt = toISOJst(y, m, d, tm ? tm[0] : '')
      if (!isFutureOrToday(startAt)) return
      const href = $a.attr('href') || ''
      events.push({
        title,
        category: lcat(label, title),
        startAt,
        source: 'official_site',
        url: href.startsWith('http') ? href : `${source.base}${href}`,
        description: label || undefined,
      })
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
