import { useEffect, useState } from 'react'
import type { OshiEvent } from '@/types'

/**
 * ホーム画面に表示する「カウントダウン」のピン留め。
 * 端末ごとの個人設定なので localStorage に保存（完全無料・Firestore 不要）。
 */
export interface CountdownItem {
  id: string
  title: string
  groupId: string
  category: string
  startAt: string
}

const KEY = 'oshihub_countdowns'
const EVENT = 'oshihub:countdowns'

function read(): CountdownItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CountdownItem[]) : []
  } catch {
    return []
  }
}

function write(items: CountdownItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
  // 同一タブ内の購読者に通知（storage イベントは他タブにしか飛ばないため）
  window.dispatchEvent(new Event(EVENT))
}

export function getCountdowns(): CountdownItem[] {
  return read().sort((a, b) => a.startAt.localeCompare(b.startAt))
}

export function isPinned(id: string): boolean {
  return read().some((c) => c.id === id)
}

export function addCountdown(event: OshiEvent) {
  const items = read()
  if (items.some((c) => c.id === event.id)) return
  items.push({
    id: event.id,
    title: event.title,
    groupId: event.groupId,
    category: event.category,
    startAt: event.startAt,
  })
  write(items)
}

export function removeCountdown(id: string) {
  write(read().filter((c) => c.id !== id))
}

/** ピン留めの一覧を購読する Hook（追加・削除に即時追従） */
export function useCountdowns(): CountdownItem[] {
  const [items, setItems] = useState<CountdownItem[]>(getCountdowns)
  useEffect(() => {
    const refresh = () => setItems(getCountdowns())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return items
}

/** 1件のピン留め状態を購読する Hook */
export function useIsPinned(id: string): boolean {
  const items = useCountdowns()
  return items.some((c) => c.id === id)
}
