import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchEvents } from '@/services/eventService'
import { getGroup } from '@/data/groups'
import { CategoryBadge } from '@/components/CategoryBadge'
import { Loading } from '@/components/Loading'
import { SOURCE_LABEL } from '@/utils/category'
import { formatDateLong, formatTime } from '@/utils/date'
import { getAffiliateLink } from '@/utils/affiliate'
import { fetchAttendance, setAttendance } from '@/services/attendanceService'
import { addCountdown, removeCountdown, useIsPinned } from '@/services/countdownService'
import { daysUntil } from '@/utils/date'
import type { OshiEvent } from '@/types'

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [event, setEvent] = useState<OshiEvent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchEvents(profile?.oshiGroupIds ?? [])
      .then((list) => {
        if (active) setEvent(list.find((e) => e.id === id) ?? null)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, profile?.oshiGroupIds])

  if (loading) return <Loading />

  if (!event) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-oshi-sub">イベントが見つかりませんでした。</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-oshi-pink px-6 py-2.5 font-bold text-white"
        >
          戻る
        </button>
      </div>
    )
  }

  const group = getGroup(event.groupId)

  return (
    <div className="animate-fade-in">
      {/* ヘッダー */}
      <header
        className="px-5 pb-6 pt-8 text-white"
        style={{
          background: `linear-gradient(135deg, ${group?.color ?? '#FF8FB1'}, #B79CED)`,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-lg backdrop-blur active:scale-95"
          aria-label="戻る"
        >
          ‹
        </button>
        <div className="mb-2">
          <CategoryBadge category={event.category} />
        </div>
        <h1 className="text-xl font-extrabold leading-snug">{event.title}</h1>
      </header>

      <div className="space-y-3 px-5 py-6">
        <AttendanceToggle event={event} uid={profile?.uid} />

        <InfoRow label="日時">
          {formatDateLong(event.startAt)}
          <span className="ml-2 font-extrabold text-oshi-pink">
            {formatTime(event.startAt)}
            {event.endAt && ` 〜 ${formatTime(event.endAt)}`}
          </span>
        </InfoRow>

        <InfoRow label="グループ">
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: group?.color }}
            />
            {group?.name}
          </span>
        </InfoRow>

        <InfoRow label="情報ソース">{SOURCE_LABEL[event.source]}</InfoRow>

        {event.description && (
          <InfoRow label="詳細">
            <span className="leading-relaxed">{event.description}</span>
          </InfoRow>
        )}

        <CountdownButton event={event} />

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-oshi-pink to-oshi-purple py-3.5 font-bold text-white shadow-card transition active:scale-[0.98]"
          >
            🔗 元ページを見る
          </a>
        )}

        <PurchaseLinks event={event} />
      </div>
    </div>
  )
}

/** ホーム画面のカウントダウンへの追加／解除ボタン。過去のイベントでは非表示。 */
function CountdownButton({ event }: { event: OshiEvent }) {
  const pinned = useIsPinned(event.id)
  if (daysUntil(new Date(event.startAt)) < 0) return null

  return (
    <button
      onClick={() => (pinned ? removeCountdown(event.id) : addCountdown(event))}
      className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-bold shadow-card transition active:scale-[0.98] ${
        pinned
          ? 'border-2 border-oshi-pink bg-white text-oshi-pink'
          : 'bg-gradient-to-r from-oshi-pink to-oshi-purple text-white'
      }`}
    >
      {pinned ? '✓ ホーム画面に追加済み（タップで解除）' : '⏰ ホーム画面にカウントダウンを追加'}
    </button>
  )
}

/** 購入導線（アフィリエイト）。リリース・グッズ・雑誌掲載で表示。 */
function PurchaseLinks({ event }: { event: OshiEvent }) {
  const link = getAffiliateLink(event)
  if (!link) return null
  return (
    <div className="mt-2 rounded-card bg-oshi-pinkLight/40 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-oshi-sub">
        🛒 {link.label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={link.amazonUrl}
          target="_blank"
          rel="noreferrer nofollow sponsored"
          className="flex items-center justify-center gap-1.5 rounded-full bg-[#FF9900] py-2.5 text-sm font-bold text-white shadow-soft transition active:scale-95"
        >
          Amazon
        </a>
        <a
          href={link.rakutenUrl}
          target="_blank"
          rel="noreferrer nofollow sponsored"
          className="flex items-center justify-center gap-1.5 rounded-full bg-[#BF0000] py-2.5 text-sm font-bold text-white shadow-soft transition active:scale-95"
        >
          楽天
        </a>
      </div>
      <p className="mt-2 text-center text-[10px] text-oshi-sub">
        ※リンクから購入すると当サイトに紹介料が入る場合があります
      </p>
    </div>
  )
}

/** 参戦記録トグル（推し活Wrapped の集計元） */
function AttendanceToggle({ event, uid }: { event: OshiEvent; uid?: string }) {
  const [attended, setAttended] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) return
    let active = true
    fetchAttendance(uid).then((records) => {
      if (active) setAttended(records.some((r) => r.eventId === event.id))
    })
    return () => {
      active = false
    }
  }, [uid, event.id])

  const toggle = async () => {
    if (!uid) return
    setBusy(true)
    const next = !attended
    setAttended(next)
    try {
      await setAttendance(uid, event, next)
    } catch {
      setAttended(!next) // 失敗時は戻す
    }
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-extrabold shadow-card transition active:scale-[0.98] ${
        attended
          ? 'bg-oshi-pink text-white'
          : 'border-2 border-oshi-pink bg-white text-oshi-pink'
      }`}
    >
      {attended ? '✓ 参戦済み！（推し活に記録）' : '＋ 参戦した！を記録'}
    </button>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card bg-white p-4 shadow-soft">
      <p className="mb-1 text-xs font-bold text-oshi-sub">{label}</p>
      <div className="text-sm font-bold text-oshi-text">{children}</div>
    </div>
  )
}
