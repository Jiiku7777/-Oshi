import { useEffect, useState } from 'react'
import type { OshiEvent, OshiNews } from '@/types'
import { fetchEvents, fetchNews } from '@/services/eventService'

/** 推しグループのイベントを購読的に取得する */
export function useEvents(oshiGroupIds: string[]) {
  const [events, setEvents] = useState<OshiEvent[]>([])
  const [loading, setLoading] = useState(true)
  const key = oshiGroupIds.join(',')

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchEvents(oshiGroupIds)
      .then((data) => active && setEvents(data))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { events, loading }
}

export function useNews(oshiGroupIds: string[]) {
  const [news, setNews] = useState<OshiNews[]>([])
  const [loading, setLoading] = useState(true)
  const key = oshiGroupIds.join(',')

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchNews(oshiGroupIds)
      .then((data) => active && setNews(data))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { news, loading }
}
