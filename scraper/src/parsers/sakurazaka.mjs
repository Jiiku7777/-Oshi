import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// 櫻坂46 公式メディアスケジュール。
// ページ内に FullCalendar 用のイベント配列がインライン出力されている:
//   var scheduleEvents = [ { title: '…', start: '2026-06-01', className: 'media', ... }, ... ];
// className: media / live / event / goods / release / ticket / shakehands / birthday / other

function classToCategory(className, title) {
  switch (className) {
    case 'live': return 'live'
    case 'goods': return 'goods'
    case 'release': return 'release'
    case 'ticket':
    case 'shakehands': return 'event'
    case 'event': return guessCategory(title) === 'live' ? 'event' : guessCategory(title)
    case 'media':
    default: return guessCategory(title)
  }
}

export async function collectSakurazaka(source) {
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

    const m = /scheduleEvents\s*=\s*\[([\s\S]*?)\];/.exec(html)
    if (!m) continue

    // 各オブジェクト { ... } を個別に取り出して属性を抽出（JSオブジェクトリテラルのため正規表現で）
    for (const obj of m[1].matchAll(/\{([\s\S]*?)\}/g)) {
      const body = obj[1]
      const title = (/title\s*:\s*'((?:[^'\\]|\\.)*)'/.exec(body)?.[1] || '').replace(/\\'/g, "'").trim()
      const start = /start\s*:\s*'(\d{4})-(\d{2})-(\d{2})'/.exec(body)
      const className = /className\s*:\s*'([^']*)'/.exec(body)?.[1] || ''
      if (!title || !start) continue

      const startAt = toISOJst(start[1], start[2], start[3])
      if (!isFutureOrToday(startAt)) continue
      const dedup = `${startAt.slice(0, 10)}|${title}`
      if (seen.has(dedup)) continue
      seen.add(dedup)

      events.push({
        title,
        category: classToCategory(className, title),
        startAt,
        source: 'official_site',
        url: `${source.base}/media/list?dy=${dy}`,
      })
    }
  }
  return { events, news: [] }
}
