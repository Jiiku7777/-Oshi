import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Loading } from '@/components/Loading'
import { CategoryBadge } from '@/components/CategoryBadge'
import { getGroup, getGroups } from '@/data/groups'
import { fetchEventsByGroup } from '@/services/eventService'
import { getAffiliateLink } from '@/utils/affiliate'
import { shareToX, nativeShare } from '@/utils/share'
import { SITE } from '@/config/site'
import { formatDateLong, formatTime, isFutureOrToday, parseDate } from '@/utils/date'
import type { OshiEvent } from '@/types'

/**
 * 公開スケジュールページ（ログイン不要・SEO対象）。
 * /g/:groupId — 検索流入の入口。各予定にアフィリンク・公式リンク・アプリ誘導を配置。
 */
export function GroupSchedule() {
  const { groupId } = useParams<{ groupId: string }>()
  const group = groupId ? getGroup(groupId) : undefined
  const [events, setEvents] = useState<OshiEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    let active = true
    setLoading(true)
    fetchEventsByGroup(groupId)
      .then((list) => {
        if (active) setEvents(list.filter((e) => isFutureOrToday(parseDate(e.startAt))))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [groupId])

  // 日付ごとにグルーピング
  const byDate = useMemo(() => {
    const map = new Map<string, OshiEvent[]>()
    for (const e of events) {
      const key = e.startAt.slice(0, 10)
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])

  if (!group) {
    return (
      <PublicShell>
        <Seo title="グループが見つかりません" path={`/g/${groupId}`} noindex />
        <div className="px-6 py-20 text-center text-oshi-sub">
          グループが見つかりませんでした。
          <div className="mt-4">
            <Link to="/groups" className="font-bold text-oshi-pink">
              対応アイドル一覧へ →
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  const title = `${group.name}の最新スケジュール`
  const desc = `${group.name}のライブ・特典会・テレビ/ラジオ出演・配信・リリース情報をまとめてチェック。${SITE.name}なら推し登録で自動更新。`
  const pageUrl = `${SITE.url}/g/${group.id}`

  return (
    <PublicShell>
      <Seo title={title} description={desc} path={`/g/${group.id}`} />

      {/* ヘッダー */}
      <header
        className="px-5 pb-6 pt-8 text-white"
        style={{ background: `linear-gradient(135deg, ${group.color}, #B79CED)` }}
      >
        <Link to="/groups" className="text-xs font-bold text-white/90">
          ← 対応アイドル一覧
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold">{group.name}の予定</h1>
        <p className="mt-1 text-sm text-white/90">
          ライブ・特典会・テレビ・ラジオ・配信・リリースの最新スケジュール
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() =>
              nativeShare({ title, text: `${group.name}の予定をチェック！`, url: pageUrl }).then(
                (ok) => !ok && shareToX(`${group.name}の予定をチェック！ #${SITE.name}`, pageUrl)
              )
            }
            className="rounded-full bg-white/25 px-4 py-2 text-sm font-bold backdrop-blur active:scale-95"
          >
            🔗 シェア
          </button>
          <Link
            to="/login"
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-oshi-pink active:scale-95"
          >
            ⭐ アプリで通知を受け取る
          </Link>
        </div>
      </header>

      {/* 予定一覧 */}
      <div className="px-5 py-6">
        {loading ? (
          <Loading label="予定を読み込み中…" />
        ) : byDate.length === 0 ? (
          <p className="rounded-card bg-white/60 px-4 py-10 text-center text-sm text-oshi-sub">
            現在公開されている今後の予定はありません。
          </p>
        ) : (
          <div className="space-y-5">
            {byDate.map(([date, list]) => (
              <section key={date}>
                <h2 className="mb-2 text-sm font-extrabold text-oshi-text">
                  {formatDateLong(`${date}T00:00:00+09:00`)}
                </h2>
                <div className="space-y-2.5">
                  {list.map((e) => (
                    <PublicEventCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 他グループへの内部リンク（SEO・回遊） */}
        <nav className="mt-10 border-t border-oshi-pinkLight pt-5">
          <p className="mb-2 text-xs font-bold text-oshi-sub">他のグループの予定</p>
          <div className="flex flex-wrap gap-2">
            {getGroups()
              .filter((g) => g.id !== group.id)
              .map((g) => (
                <Link
                  key={g.id}
                  to={`/g/${g.id}`}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-oshi-text shadow-soft"
                >
                  {g.name}
                </Link>
              ))}
          </div>
        </nav>
      </div>
    </PublicShell>
  )
}

function PublicEventCard({ event }: { event: OshiEvent }) {
  const aff = getAffiliateLink(event)
  return (
    <div className="rounded-card bg-white p-3.5 shadow-soft">
      <div className="flex items-start gap-2">
        <span className="shrink-0 pt-0.5 text-sm font-bold text-oshi-pink">
          {formatTime(event.startAt)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1">
            <CategoryBadge category={event.category} />
          </div>
          <p className="text-sm font-bold text-oshi-text">{event.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-oshi-purple underline"
              >
                公式詳細
              </a>
            )}
            {aff && (
              <>
                <a
                  href={aff.amazonUrl}
                  target="_blank"
                  rel="noreferrer nofollow sponsored"
                  className="rounded-full bg-[#FF9900] px-2.5 py-0.5 text-xs font-bold text-white"
                >
                  Amazon
                </a>
                <a
                  href={aff.rakutenUrl}
                  target="_blank"
                  rel="noreferrer nofollow sponsored"
                  className="rounded-full bg-[#BF0000] px-2.5 py-0.5 text-xs font-bold text-white"
                >
                  楽天
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 公開ページ共通シェル（下部ナビ無し・中央寄せ） */
function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-oshi-bg">
      <div className="mx-auto min-h-dvh max-w-md bg-oshi-bg">{children}</div>
    </div>
  )
}
