import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useEvents } from '@/hooks/useEvents'
import { EventCard } from '@/components/EventCard'
import { CATEGORY_META } from '@/utils/category'
import {
  buildMonthGrid,
  dateKey,
  isSameDay,
  parseDate,
  weekdayJa,
  formatDateLong,
} from '@/utils/date'
import type { OshiEvent } from '@/types'

export function Calendar() {
  const { profile } = useAuth()
  const { events } = useEvents(profile?.oshiGroupIds ?? [])

  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(today)

  // 日付キー -> その日のイベント
  const eventsByDay = useMemo(() => {
    const map = new Map<string, OshiEvent[]>()
    for (const e of events) {
      const k = dateKey(parseDate(e.startAt))
      const arr = map.get(k) ?? []
      arr.push(e)
      map.set(k, arr)
    }
    return map
  }, [events])

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  )

  const selectedEvents = (eventsByDay.get(dateKey(selected)) ?? []).sort((a, b) =>
    a.startAt.localeCompare(b.startAt)
  )

  const moveMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))

  return (
    <div className="animate-fade-in pb-4">
      <header className="bg-gradient-to-br from-oshi-purple to-oshi-blue px-5 pb-5 pt-8 text-white">
        <h1 className="text-xl font-extrabold">カレンダー</h1>
        <p className="mt-1 text-sm opacity-90">推しの予定をまとめてチェック</p>
      </header>

      {/* 月ナビ */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => moveMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-oshi-purple shadow-soft active:scale-95"
        >
          ‹
        </button>
        <p className="text-lg font-extrabold text-oshi-text">
          {cursor.getFullYear()}年 {cursor.getMonth() + 1}月
        </p>
        <button
          onClick={() => moveMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-oshi-purple shadow-soft active:scale-95"
        >
          ›
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="mx-4 rounded-card bg-white p-3 shadow-card">
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <div
              key={d}
              className={
                d === 0 ? 'text-oshi-pink' : d === 6 ? 'text-oshi-blue' : 'text-oshi-sub'
              }
            >
              {weekdayJa(d)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((day) => {
            const inMonth = day.getMonth() === cursor.getMonth()
            const dayEvents = eventsByDay.get(dateKey(day)) ?? []
            const isToday = isSameDay(day, today)
            const isSelected = isSameDay(day, selected)
            // 表示するドット色（最大3種カテゴリ）
            const dots = Array.from(new Set(dayEvents.map((e) => e.category))).slice(0, 3)

            return (
              <button
                key={dateKey(day)}
                onClick={() => setSelected(day)}
                className={`flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition ${
                  isSelected
                    ? 'bg-gradient-to-br from-oshi-pink to-oshi-purple font-extrabold text-white shadow-soft'
                    : isToday
                      ? 'bg-oshi-pinkLight font-bold text-oshi-pink'
                      : inMonth
                        ? 'text-oshi-text active:bg-oshi-bg'
                        : 'text-oshi-sub/40'
                }`}
              >
                <span>{day.getDate()}</span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {dots.map((c) => (
                    <span
                      key={c}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? '#fff' : CATEGORY_META[c].dotColor,
                      }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日のイベント一覧 */}
      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-extrabold text-oshi-text">
          {formatDateLong(selected.toISOString())}
        </h2>
        {selectedEvents.length === 0 ? (
          <div className="rounded-card bg-white/60 px-4 py-8 text-center text-sm text-oshi-sub">
            この日の予定はありません。
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
