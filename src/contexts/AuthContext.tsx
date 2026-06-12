import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '@/firebase/config'
import type { UserProfile } from '@/types'
import {
  clearDemoProfile,
  fetchOrCreateProfile,
  updateProfile as persistProfile,
} from '@/services/userService'

interface AuthContextValue {
  /** 認証ロード中（初期化前） */
  loading: boolean
  /** ログイン中ユーザーのプロフィール（未ログインは null） */
  profile: UserProfile | null
  isDemo: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  /** プロフィール更新（推し登録・通知設定など）。楽観的にローカル反映＋永続化。 */
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEMO_USER = {
  uid: 'demo-user',
  displayName: 'デモユーザー',
  email: 'demo@oshihub.app',
  photoURL: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // ---- 本番: Firebase Auth の状態監視 ----
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // デモモード: localStorage に既存プロフィールがあれば復元
      const existing = localStorage.getItem('oshihub_demo_logged_in')
      if (existing === 'true') {
        fetchOrCreateProfile(DEMO_USER).then((p) => {
          setProfile(p)
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
      return
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const p = await fetchOrCreateProfile({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        })
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      // デモモード: 擬似ログイン
      const p = await fetchOrCreateProfile(DEMO_USER)
      localStorage.setItem('oshihub_demo_logged_in', 'true')
      setProfile(p)
      return
    }
    await signInWithPopup(auth, googleProvider)
    // 以降は onAuthStateChanged が拾う
  }, [])

  const signOut = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      localStorage.removeItem('oshihub_demo_logged_in')
      clearDemoProfile()
      setProfile(null)
      return
    }
    await fbSignOut(auth)
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
      const uid = profile?.uid ?? DEMO_USER.uid
      await persistProfile(uid, patch)
    },
    [profile?.uid]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      profile,
      isDemo: !isFirebaseConfigured,
      signInWithGoogle,
      signOut,
      updateProfile,
    }),
    [loading, profile, signInWithGoogle, signOut, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の中で使ってください')
  return ctx
}
