import { fetchText, mapNogiCate, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// 乃木坂46 公式スケジュールAPI（JSONP: res({...})）をパース。
// 例: https://www.nogizaka46.com/s/n46/api/list/schedule?dy=202606

function parseJsonp(text) {
  const start = text.indexOf('(')
  const end = text.lastIndexOf(')')
  return JSON.parse(text.slice(start + 1, end))
}

function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function collectNogizaka(source) {
  const events = []
  for (const { year, month } of upcomingMonths(2)) {
    const dy = `${year}${String(month).padStart(2, '0')}`
    let json
    try {
      json = parseJsonp(await fetchText(`${source.api}?dy=${dy}`))
    } catch {
      continue
    }
    for (const it of json.data ?? []) {
      const m = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(it.date || '')
      if (!m) continue
      const startAt = toISOJst(m[1], m[2], m[3], it.start_time || '')
      if (!isFutureOrToday(startAt)) continue
      events.push({
        title: it.title?.trim() || '(無題)',
        category: mapNogiCate(it.cate, it.title || ''),
        startAt,
        endAt: it.end_time ? toISOJst(m[1], m[2], m[3], it.end_time) : undefined,
        source: 'official_site',
        url: it.link || undefined,
        description: stripHtml(it.text) || undefined,
      })
    }
  }
  return { events, news: [] }
}
