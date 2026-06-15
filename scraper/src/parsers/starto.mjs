import { fetchText, guessCategory, toISOJst, isFutureOrToday, upcomingMonths } from '../util.mjs'

// STARTO ENTERTAINMENT（旧ジャニーズ）公式の出演情報。
// 公式サイトはVue描画だが、裏のJSON APIが使える:
//   https://starto.jp/s/p/api/list/media?dy=YYYYMMDD  （日単位だと1ページに収まる）
// 1日分に全アーティストの出演が入るため、各 item の tags_display(JSON文字列) の
// str_code がグループのタグID(source.tagId)と一致するものだけ採用する。
// 同一プロセス内（collect.mjs 1実行）では日単位レスポンスをキャッシュし、
// 5グループで使い回して取得回数を抑える。

const API = 'https://starto.jp/s/p/api/list/media?dy='
const dayCache = new Map()

async function fetchDay(dy) {
  if (dayCache.has(dy)) return dayCache.get(dy)
  let items = []
  try {
    const j = JSON.parse(await fetchText(API + dy))
    items = Array.isArray(j.items) ? j.items : []
  } catch {
    items = []
  }
  dayCache.set(dy, items)
  return items
}

function belongsTo(item, tagId, name) {
  let td = item.tags_display
  if (typeof td === 'string') {
    try {
      td = JSON.parse(td)
    } catch {
      td = null
    }
  }
  const arr = Array.isArray(td) ? td : td ? [td] : []
  const norm = (s) => String(s || '').replace(/\s+/g, '')
  return arr.some(
    (x) => String(x.str_code) === String(tagId) || norm(x.str_artiname) === norm(name)
  )
}

const CAT = { tv: 'tv', radio: 'radio', web: 'youtube', live: 'live', release: 'release', goods: 'goods' }

export async function collectStarto(source) {
  const events = []
  const seen = new Set()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 1)
  cutoff.setHours(0, 0, 0, 0)

  for (const { year, month } of upcomingMonths(1)) {
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d) < cutoff) continue // 過去日は取得しない
      const dy = `${year}${String(month).padStart(2, '0')}${String(d).padStart(2, '0')}`
      const items = await fetchDay(dy)
      for (const it of items) {
        if (!belongsTo(it, source.tagId, source.name)) continue
        const title = (it.name || '').replace(/\s+/g, ' ').trim()
        if (!title) continue
        const tm = /(\d{1,2}):(\d{2})/.exec(it.time || '')
        const startAt = toISOJst(year, month, d, tm ? tm[0] : '')
        if (!isFutureOrToday(startAt)) continue
        const k = `${startAt.slice(0, 10)}|${title}`
        if (seen.has(k)) continue
        seen.add(k)
        events.push({
          title,
          category: CAT[it.catecode] || guessCategory(title, it.catename),
          startAt,
          source: 'official_site',
          url: it.link ? `https://starto.jp${String(it.link).split('?')[0]}` : undefined,
          description: it.catename || undefined,
        })
      }
    }
  }
  return { events, news: [] }
}
