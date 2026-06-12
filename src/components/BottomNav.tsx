import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'ホーム', icon: '🏠', end: true },
  { to: '/calendar', label: 'カレンダー', icon: '📅', end: false },
  { to: '/settings', label: '設定', icon: '⚙️', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-oshi-pinkLight/60 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex">
        {items.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition ${
                  isActive ? 'text-oshi-pink' : 'text-oshi-sub'
                }`
              }
            >
              <span className="text-xl" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
