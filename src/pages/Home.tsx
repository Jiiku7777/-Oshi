import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEvents, useNews } from '@/hooks/useEvents'
import { EventCard } from '@/components/EventCard'
import { Loading } from '@/components/Loading'
import { getGroup } from '@/data/groups'
import { isSameDay, isWithinDays, parseDate, formatDateShort } from '@/utils/date'

export function Home() {
  const { profile } = useAuth()
  const oshiIds = profile?.oshiGroupIds ?? []
  const { events, loading } = useEvents(oshiIds)
  const { news } = useNews(oshiIds)

  const now = new Date()

  const { today, thisWeek } = useMemo(() => {
    const todayEvents = events.filter((e) => isSameDay(parseDate(e.startAt), now))
    const weekEvents = events.filter(
      (e) =>
        !isSameDay(parseDate(e.startAt), now) &&
        isWithinDays(parseDate(e.startAt), 7, now)
    )
    return { today: todayEvents, thisWeek: weekEvents }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

  const firstName = profile?.displayName?.split(' ')[0] ?? 'あなた'

  return (
    <div className="animate-fade-in">
      {/* ヘッダー */}
      <header className="bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue px-5 pb-6 pt-8 text-white">
        <p className="text-xs font-bold opacity-90">{formatDateShort(now.toISOString())} の推し活</p>
        <h1 className="mt-1 text-2xl font-extrabold">こんにちは、{firstName}さん</h1>
        <p className="mt-1 text-sm opacity-90">
          {oshiIds.length}グループの推しを応援中 ⭐
        </p>
      </header>

      <div className="space-y-7 px-5 pt-6">
        {loading ? (
          <Loading label="推しの予定を集めています…" />
        ) : (
          <>
            {/* 今日の予定（最も目立たせる） */}
            <section>
              <SectionTitle emoji="🔥" title="今日の予定" accent />
              {today.length === 0 ? (
                <EmptyCard text="今日の予定はありません。ゆっくり過ごしてね🍵" />
              ) : (
                <div className="space-y-2.5 rounded-card bg-gradient-to-br from-oshi-pinkLight to-oshi-purpleLight p-3">
                  {today.map((e) => (
                    <EventCard key={e.id} event={e} emphasizeTime />
                  ))}
                </div>
              )}
            </section>

            {/* 今週の予定 */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <SectionTitle emoji="🗓️" title="今週の予定" />
                <Link to="/calendar" className="text-xs font-bold text-oshi-pink">
                  カレンダー →
                </Link>
              </div>
              {thisWeek.length === 0 ? (
                <EmptyCard text="今週の予定はまだありません。" />
              ) : (
                <div className="space-y-2.5">
                  {thisWeek.map((e) => (
                    <EventCard key={e.id} event={e} showDate />
                  ))}
                </div>
              )}
            </section>

            {/* 推しニュース */}
            <section className="pb-4">
              <SectionTitle emoji="📰" title="推しニュース" />
              {news.length === 0 ? (
                <EmptyCard text="新着ニュースはありません。" />
              ) : (
                <div className="space-y-2.5">
                  {news.map((n) => {
                    const g = getGroup(n.groupId)
                    return (
                      <a
                        key={n.id}
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-card bg-white p-3.5 shadow-soft transition active:scale-[0.98]"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: g?.color }}
                          />
                          <span className="text-xs font-bold text-oshi-sub">
                            {g?.name}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-oshi-text">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-oshi-sub">
                          {n.summary}
                        </p>
                      </a>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({
  emoji,
  title,
  accent,
}: {
  emoji: string
  title: string
  accent?: boolean
}) {
  return (
    <h2
      className={`mb-3 flex items-center gap-2 font-extrabold ${
        accent ? 'text-lg text-oshi-pink' : 'text-base text-oshi-text'
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {title}
    </h2>
  )
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-card bg-white/60 px-4 py-6 text-center text-sm text-oshi-sub">
      {text}
    </div>
  )
}
