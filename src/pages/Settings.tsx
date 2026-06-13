import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getGroups, getGroup } from '@/data/groups'
import {
  currentPermission,
  disableNotifications,
  enableNotifications,
  isPushConfigured,
  isPushOn,
} from '@/services/notifications'
import { GroupSelectCard } from '@/components/GroupSelectCard'
import { Avatar } from '@/components/Avatar'
import { InstallAppCard } from '@/components/InstallAppCard'
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
          <Avatar src={profile.avatar || profile.photoURL} name={profile.displayName ?? undefined} size={44} ring />
          <div>
            <p className="font-bold">{profile.displayName ?? 'ゲスト'}</p>
            <p className="text-xs opacity-90">{profile.email}</p>
          </div>
        </div>
      </header>

      {/* ホーム画面にアプリを追加（PWA） */}
      <div className="px-5 pt-4">
        <InstallAppCard />
      </div>

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

      {/* 通知の受信条件の案内 */}
      <NotificationHelp />

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

/** 端末のプッシュ通知 ON/OFF トグル。一度ONにすればOFFにするまで保持する。 */
function PushPermission({ uid }: { uid: string }) {
  const [perm, setPerm] = useState<string>(() => currentPermission())
  const [on, setOn] = useState<boolean>(() => isPushOn(uid))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 既にONなら、開いた時にトークンを裏側で静かに維持（取りこぼし防止）。
  // 失敗してもUIはONのまま（OFFに戻さない）＝「OFFにするまで受け取る」。
  useEffect(() => {
    if (on && currentPermission() === 'granted' && isPushConfigured()) {
      enableNotifications(uid).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

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

  const turnOn = async () => {
    setBusy(true)
    setMsg(null)
    const res = await enableNotifications(uid)
    setPerm(currentPermission())
    if (res.ok) {
      setOn(true)
      setMsg('✅ この端末で通知を受け取ります（OFFにするまで有効）')
    } else if (res.reason === 'denied') {
      setMsg('通知がブロックされています。ブラウザ設定から許可してください。')
    } else {
      setMsg(`⚠ 設定に失敗しました（${res.reason}${'detail' in res && res.detail ? ': ' + res.detail : ''}）`)
    }
    setBusy(false)
  }

  const turnOff = async () => {
    setBusy(true)
    setMsg(null)
    await disableNotifications(uid)
    setOn(false)
    setMsg('通知をOFFにしました。')
    setBusy(false)
  }

  const toggle = () => (on ? turnOff() : turnOn())
  const granted = perm === 'granted'
  // ONなのに端末側で許可が外れている場合だけ注意を出す
  const needsRepermit = on && !granted

  return (
    <div className="rounded-card bg-gradient-to-r from-oshi-pinkLight to-oshi-purpleLight px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-oshi-text">🔔 この端末で通知を受け取る</p>
          <p className="text-xs text-oshi-sub">
            {on
              ? '受け取り中。OFFにするまで有効です'
              : 'リマインドを受け取るにはONにしてください'}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          aria-label="通知ON/OFF"
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            on ? 'bg-oshi-pink' : 'bg-white/70'
          }`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
              on ? 'left-[1.375rem]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      {busy && <p className="mt-2 text-xs font-bold text-oshi-text">設定中…</p>}
      {!busy && msg && <p className="mt-2 text-xs font-bold text-oshi-text">{msg}</p>}
      {needsRepermit && !busy && (
        <button onClick={turnOn} className="mt-2 text-xs font-bold text-oshi-pink underline">
          通知許可が外れています。タップで再設定
        </button>
      )}
    </div>
  )
}

/** 通知がいつ届くか（端末別の条件）の案内。折りたたみ式。 */
function NotificationHelp() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-card bg-white px-4 py-3 shadow-soft">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-bold text-oshi-text">
          📲 アプリを閉じても通知は届きます
        </span>
        <span className="text-oshi-sub">{open ? '−' : '＋'}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs leading-relaxed text-oshi-sub">
          <p>
            通知は端末の裏側で受け取るので、アプリやタブを閉じていても届きます。確実に受け取るには端末ごとに以下を確認してください。
          </p>
          <div>
            <p className="font-bold text-oshi-text">📱 スマホ（おすすめ）</p>
            <p>
              ブラウザのメニューから<b>「ホーム画面に追加」</b>し、その<b>アイコンから開いて</b>通知を許可すると、
              LINEのようにアプリを閉じていても・画面ロック中でも届きます。
              <br />
              <span className="text-oshi-pink">※iPhoneは「ホーム画面に追加」が必須です（iOS16.4以降）。</span>
            </p>
          </div>
          <div>
            <p className="font-bold text-oshi-text">💻 パソコン</p>
            <p>
              ウィンドウを閉じても、ブラウザが裏で起動していれば届きます。ブラウザを完全に終了すると届きません。
            </p>
          </div>
          <div>
            <p className="font-bold text-oshi-text">🔕 届かないとき</p>
            <p>
              広告ブロッカーやVPN、一部のネットワークが通知をブロックすることがあります。
              その場合は拡張機能をオフにするか、別のブラウザ・回線でお試しください。
            </p>
          </div>
        </div>
      )}
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
