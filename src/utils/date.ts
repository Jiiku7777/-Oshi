// 日付ユーティリティ（依存ライブラリなし・JST 前提）

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

export function parseDate(iso: string): Date {
  return new Date(iso)
}

/** YYYY-MM-DD（ローカル）でキー化 */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}

export function startOfDay(d: Date): Date {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function addDays(d: Date, days: number): Date {
  const n = new Date(d)
  n.setDate(n.getDate() + days)
  return n
}

/** 今日から days 日後（含む today）までの範囲か */
export function isWithinDays(target: Date, days: number, from = new Date()): boolean {
  const start = startOfDay(from)
  const end = startOfDay(addDays(from, days))
  return target >= start && target <= end
}

export function formatTime(iso: string): string {
  const d = parseDate(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function formatDateShort(iso: string): string {
  const d = parseDate(iso)
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_JA[d.getDay()]})`
}

export function formatDateLong(iso: string): string {
  const d = parseDate(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS_JA[d.getDay()]})`
}

export function weekdayJa(dayIndex: number): string {
  return WEEKDAYS_JA[dayIndex]
}

/** 月カレンダー用に、その月を含む 6 週 (42 日) のグリッドを生成（日曜始まり） */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startOffset = first.getDay() // 日曜=0
  const gridStart = addDays(first, -startOffset)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}
