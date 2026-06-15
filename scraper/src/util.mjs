// 共通ユーティリティ：カテゴリ判定・日付整形

// 一部の公式サイトがBot系UAを弾くため、一般的なブラウザUAを使う
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`)
  return r.text()
}

/** タイトル等のテキストからイベントカテゴリを推定 */
export function guessCategory(text = '', hint = '') {
  const s = `${hint} ${text}`
  if (/TikTok/i.test(s)) return 'tiktok'
  if (/YouTube|配信|生放送|ニコ生|SHOWROOM/i.test(s)) return 'youtube'
  if (/ラジオ|radio|FM|AM放送|文化放送|ニッポン放送/i.test(s)) return 'radio'
  if (/テレビ|TV|系「|放送|MUSIC|Mステ|歌番組|出演/i.test(s)) return 'tv'
  if (/特典会|お話し会|握手|サイン会|individual|ハイタッチ/i.test(s)) return 'event'
  if (/リリース|発売|配信開始|シングル|アルバム|CD/i.test(s)) return 'release'
  if (/グッズ|goods|物販|受注|アクスタ/i.test(s)) return 'goods'
  if (/ライブ|LIVE|公演|ツアー|フェス|ワンマン|コンサート/i.test(s)) return 'live'
  return 'event'
}

/** 坂道CMSの cate コードをカテゴリへ */
export function mapNogiCate(cate, title) {
  switch (cate) {
    case 'tv': return 'tv'
    case 'radio': return 'radio'
    case 'web': return guessCategory(title, 'web') // YouTube配信等を含む
    case 'live': return 'live'
    case 'event': return 'event'
    case 'goods': return 'goods'
    case 'release': return 'release'
    default: return guessCategory(title)
  }
}

/** y, m(1-12), d, hh:mm（任意）から JST の ISO 8601 文字列 */
export function toISOJst(y, m, d, time = '') {
  let hour = 0, mi = 0, day = Number(d), mon = Number(m), year = Number(y)
  const t = /(\d{1,2}):(\d{2})/.exec(time)
  if (t) { hour = Number(t[1]); mi = Number(t[2]) }
  // 「24:00」「25:30」等の深夜表記は翌日へ繰り上げ
  if (hour >= 24) {
    const carry = Math.floor(hour / 24)
    hour = hour % 24
    const base = new Date(year, mon - 1, day + carry)
    year = base.getFullYear(); mon = base.getMonth() + 1; day = base.getDate()
  }
  const p = (n) => String(n).padStart(2, '0')
  return `${year}-${p(mon)}-${p(day)}T${p(hour)}:${p(mi)}:00+09:00`
}

/** 今日（JST）以降か */
export function isFutureOrToday(iso) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(iso) >= today
}

/** 当月から monthsAhead か月分の {year, month} を列挙 */
export function upcomingMonths(monthsAhead = 2) {
  const now = new Date()
  const out = []
  for (let i = 0; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return out
}
