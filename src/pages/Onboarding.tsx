import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getGroups } from '@/data/groups'
import { GroupSelectCard } from '@/components/GroupSelectCard'
import { defaultNotificationSettings } from '@/services/userService'

/** 初回ログイン時の推しグループ選択 */
export function Onboarding() {
  const { profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const groups = getGroups()
  const [selected, setSelected] = useState<string[]>(profile?.oshiGroupIds ?? [])
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const handleStart = async () => {
    setBusy(true)
    await updateProfile({
      oshiGroupIds: selected,
      onboarded: true,
      notifications: defaultNotificationSettings(selected),
    })
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-oshi-bg">
      <header className="px-6 pb-4 pt-10">
        <p className="text-sm font-bold text-oshi-pink">はじめまして！</p>
        <h1 className="mt-1 text-2xl font-extrabold text-oshi-text">
          推しを選んでね
        </h1>
        <p className="mt-2 text-sm text-oshi-sub">
          選んだグループの予定を自動で集めます。複数選択OK・あとから変更できます。
        </p>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-6 pb-32">
        {groups.map((g) => (
          <GroupSelectCard
            key={g.id}
            group={g}
            selected={selected.includes(g.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      {/* 固定フッターのCTA */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-oshi-pinkLight/60 bg-white/95 p-4 backdrop-blur">
        <button
          onClick={handleStart}
          disabled={selected.length === 0 || busy}
          className="w-full rounded-full bg-gradient-to-r from-oshi-pink to-oshi-purple py-3.5 font-bold text-white shadow-card transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy
            ? '設定中…'
            : selected.length === 0
              ? '1つ以上選んでください'
              : `${selected.length}グループで始める`}
        </button>
      </div>
    </div>
  )
}
