import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getGroups, getGroup } from '@/data/groups'
import {
  currentPermission,
  enableNotifications,
  isPushConfigured,
} from '@/services/notifications'
import { GroupSelectCard } from '@/components/GroupSelectCard'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  TIMING_LABEL,
  TIMING_ORDER,
} from '@/utils/category'
import type {
  EventCategory,
  NotificationSettings,
  NotifyTiming,
} from '@/types'

type Tab = 'oshi' | 'notify'

export function Settings() {
  const { profile, signOut, isDemo } = useAuth()
  const [tab, setTab] = useState<Tab>('oshi')

  if (!profile) return null

  return (
    <div className="animate-fade-in pb-6">
      <header className="bg-gradient-to-br from-oshi-blue to-oshi-purple px-5 pb-6 pt-8 text-white">
        <h1 className="text-xl font-extrabold">設定</h1>
        <div className="mt-3 flex items-center gap-3">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt=""
              className="h-11 w-11 rounded-full border-2 border-white/60"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-lg">
              👤
            </div>
          )}
          <div>
            <p className="font-bold">{profile.displayName ?? 'ゲスト'}</p>
            <p className="text-xs opacity-90">{profile.email}</p>
          </div>
        </div>
      </header>

      {/* タブ */}
      <div className="sticky top-0 z-10 flex gap-2 bg-oshi-bg px-5 py-3">
        <TabButton active={tab === 'oshi'} onClick={() => setTab('oshi')}>
          推しグループ
        </TabButton>
        <TabButton active={tab === 'notify'} onClick={() => setTab('notify')}>
          通知設定
        </TabButton>
      </div>

      <div className="px-5">
        {tab === 'oshi' ? <OshiTab /> : <NotifyTab />}
      </div>

      {/* ログアウト */}
      <div className="mt-8 px-5">
        <button
          onClick={signOut}
          className="w-full rounded-full border-2 border-oshi-pinkLight bg-white py-3 font-bold text-oshi-pink active:scale-[0.98]"
        >
          ログアウト
        </button>
        {isDemo && (
          <p className="mt-3 text-center text-[11px] text-oshi-sub">
            デモモードのデータはこの端末にのみ保存されます。
          </p>
        )}
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-bold transition ${
        active
          ? 'bg-gradient-to-r from-oshi-pink to-oshi-purple text-white shadow-soft'
          : 'bg-white text-oshi-sub'
      }`}
    >
      {children}
    </button>
  )
}

// ---- 推しグループ管理タブ ----
function OshiTab() {
  const { profile, updateProfile } = useAuth()
  const groups = getGroups()
  const selected = profile?.oshiGroupIds ?? []

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]

    // グループ通知 ON/OFF も追従させる
    const groupEnabled = { ...(profile?.notifications.groupEnabled ?? {}) }
    groupEnabled[id] = next.includes(id)

    updateProfile({
      oshiGroupIds: next,
      notifications: {
        ...(profile!.notifications),
        groupEnabled,
      },
    })
  }

  return (
    <div className="space-y-2.5 pt-1">
      <p className="pb-1 text-sm text-oshi-sub">
        タップで追加・削除できます（{selected.length}グループ選択中）
      </p>
      {groups.map((g) => (
        <GroupSelectCard
          key={g.id}
          group={g}
          selected={selected.includes(g.id)}
          onToggle={toggle}
        />
      ))}
    </div>
  )
}

// ---- 通知設定タブ ----
function NotifyTab() {
  const { profile, updateProfile } = useAuth()
  const n = profile!.notifications

  const patch = (partial: Partial<NotificationSettings>) =>
    updateProfile({ notifications: { ...n, ...partial } })

  const toggleCategory = (c: EventCategory) =>
    patch({ categories: { ...n.categories, [c]: !n.categories[c] } })

  const toggleTiming = (t: NotifyTiming) =>
    patch({ timings: { ...n.timings, [t]: !n.timings[t] } })

  const toggleGroup = (id: string) =>
    patch({ groupEnabled: { ...n.groupEnabled, [id]: !n.groupEnabled[id] } })

  const oshiIds = profile!.oshiGroupIds

  return (
    <div className="space-y-6 pt-1">
      {/* マスタースイッチ */}
      <ToggleRow
        label="通知を受け取る"
        description="OFFにするとすべての通知が止まります"
        checked={n.enabled}
        onChange={() => patch({ enabled: !n.enabled })}
        big
      />

      {/* 端末でのプッシュ通知許可 */}
      <PushPermission uid={profile!.uid} />

      <div className={n.enabled ? '' : 'pointer-events-none opacity-40'}>
        {/* 通知タイミング */}
        <Group title="通知タイミング" sub="複数選択できます">
          <div className="grid grid-cols-2 gap-2">
            {TIMING_ORDER.map((t) => (
              <ChipToggle
                key={t}
                label={TIMING_LABEL[t]}
                checked={n.timings[t]}
                onChange={() => toggleTiming(t)}
              />
            ))}
          </div>
        </Group>

        {/* 通知カテゴリ */}
        <Group title="通知カテゴリ" sub="受け取りたい予定の種類">
          <div className="space-y-2">
            {CATEGORY_ORDER.map((c) => (
              <ToggleRow
                key={c}
                label={`${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`}
                checked={n.categories[c]}
                onChange={() => toggleCategory(c)}
              />
            ))}
          </div>
        </Group>

        {/* グループごと ON/OFF */}
        <Group title="推しグループごとの通知" sub="グループ単位で通知を切り替え">
          {oshiIds.length === 0 ? (
            <p className="text-sm text-oshi-sub">
              推しグループが未登録です。「推しグループ」タブから追加してください。
            </p>
          ) : (
            <div className="space-y-2">
              {oshiIds.map((id) => (
                <ToggleRow
                  key={id}
                  label={getGroup(id)?.name ?? id}
                  checked={n.groupEnabled[id] ?? false}
                  onChange={() => toggleGroup(id)}
                />
              ))}
            </div>
          )}
        </Group>
      </div>
    </div>
  )
}

/** 端末のプッシュ通知許可ボタン（FCMトークンを取得・保存） */
function PushPermission({ uid }: { uid: string }) {
  const [perm, setPerm] = useState<string>('default')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setPerm(currentPermission())
  }, [])

  if (!isPushConfigured()) {
    return (
      <div className="rounded-card bg-amber-50 px-4 py-3 text-xs text-amber-700">
        プッシュ通知は準備中です（管理者がVAPID鍵を設定すると有効になります）。
      </div>
    )
  }

  if (perm === 'unsupported') {
    return (
      <div className="rounded-card bg-white px-4 py-3 text-xs text-oshi-sub">
        この端末/ブラウザはプッシュ通知に未対応です。iPhoneは「ホーム画面に追加」すると通知が使えます。
      </div>
    )
  }

  const handle = async () => {
    setBusy(true)
    setMsg(null)
    const res = await enableNotifications(uid)
    setPerm(currentPermission())
    if (res.ok) setMsg('✅ この端末で通知を受け取れます')
    else if (res.reason === 'denied')
      setMsg('通知がブロックされています。ブラウザ設定から許可してください。')
    else setMsg('有効化に失敗しました。時間をおいて再度お試しください。')
    setBusy(false)
  }

  const granted = perm === 'granted'
  return (
    <div className="rounded-card bg-gradient-to-r from-oshi-pinkLight to-oshi-purpleLight px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-oshi-text">🔔 この端末で通知を受け取る</p>
          <p className="text-xs text-oshi-sub">
            {granted ? '許可済み。下の設定でタイミングを選べます' : 'リマインドを受け取るには許可が必要です'}
          </p>
        </div>
        <button
          onClick={handle}
          disabled={busy || granted}
          className="shrink-0 rounded-full bg-oshi-pink px-4 py-2 text-sm font-bold text-white shadow-soft transition active:scale-95 disabled:opacity-50"
        >
          {granted ? '許可済み' : busy ? '設定中…' : '許可する'}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-bold text-oshi-text">{msg}</p>}
    </div>
  )
}

function Group({
  title,
  sub,
  children,
}: {
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5">
      <h3 className="text-sm font-extrabold text-oshi-text">{title}</h3>
      {sub && <p className="mb-2 text-xs text-oshi-sub">{sub}</p>}
      <div className="mt-2">{children}</div>
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  big,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  big?: boolean
}) {
  return (
    <button
      onClick={onChange}
      className={`flex w-full items-center justify-between rounded-card bg-white px-4 shadow-soft ${
        big ? 'py-4' : 'py-3'
      }`}
    >
      <span className="text-left">
        <span className="block text-sm font-bold text-oshi-text">{label}</span>
        {description && (
          <span className="block text-xs text-oshi-sub">{description}</span>
        )}
      </span>
      <Switch checked={checked} />
    </button>
  )
}

function Switch({ checked }: { checked: boolean }) {
  return (
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? 'bg-oshi-pink' : 'bg-oshi-pinkLight'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </span>
  )
}

function ChipToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`rounded-full py-2.5 text-sm font-bold transition active:scale-95 ${
        checked
          ? 'bg-gradient-to-r from-oshi-pink to-oshi-purple text-white shadow-soft'
          : 'bg-white text-oshi-sub'
      }`}
    >
      {label}
    </button>
  )
}
