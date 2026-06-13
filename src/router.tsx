import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { Loading } from '@/components/Loading'
import { Login } from '@/pages/Login'
import { Onboarding } from '@/pages/Onboarding'
import { Home } from '@/pages/Home'
import { Calendar } from '@/pages/Calendar'
import { EventDetail } from '@/pages/EventDetail'
import { Settings } from '@/pages/Settings'
import { Wrapped } from '@/pages/Wrapped'
import { GroupSchedule } from '@/pages/public/GroupSchedule'
import { PublicGroups } from '@/pages/public/PublicGroups'

/** ログイン必須ガード。未ログインなら /login、未オンボーディングなら /onboarding へ。 */
function RequireAuth() {
  const { loading, profile } = useAuth()
  if (loading) return <Loading label="読み込み中…" />
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** ログイン済みなら通すゲート（オンボーディング用：ログインのみ必須） */
function RequireLogin() {
  const { loading, profile } = useAuth()
  if (loading) return <Loading label="読み込み中…" />
  if (!profile) return <Navigate to="/login" replace />
  return <Outlet />
}

/** 既ログイン時に /login へ来たらホームへ飛ばす */
function PublicOnly() {
  const { loading, profile } = useAuth()
  if (loading) return <Loading label="読み込み中…" />
  if (profile) return <Navigate to="/" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  // 公開ページ（ログイン不要・SEO対象）
  { path: '/groups', element: <PublicGroups /> },
  { path: '/g/:groupId', element: <GroupSchedule /> },
  {
    element: <PublicOnly />,
    children: [{ path: '/login', element: <Login /> }],
  },
  {
    element: <RequireLogin />,
    children: [{ path: '/onboarding', element: <Onboarding /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/calendar', element: <Calendar /> },
          { path: '/wrapped', element: <Wrapped /> },
          { path: '/settings', element: <Settings /> },
        ],
      },
      // 詳細はナビ無しのフルスクリーン
      { path: '/event/:id', element: <EventDetail /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
