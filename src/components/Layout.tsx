import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/contexts/AuthContext'

/** スマホファーストの中央寄せシェル（最大 max-w-md） */
export function Layout() {
  const { isDemo } = useAuth()
  return (
    <div className="min-h-dvh bg-oshi-bg">
      <div className="relative mx-auto min-h-dvh max-w-md bg-oshi-bg pb-24">
        {isDemo && (
          <div className="bg-oshi-purple/90 px-4 py-1 text-center text-[11px] font-bold text-white">
            デモモード（Firebase 未設定）— モックデータで動作中
          </div>
        )}
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
