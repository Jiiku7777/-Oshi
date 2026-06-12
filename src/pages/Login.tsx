import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function Login() {
  const { signInWithGoogle, isDemo } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError('ログインに失敗しました。もう一度お試しください。')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-oshi-pinkLight via-oshi-bg to-oshi-blueLight px-6">
      <div className="w-full max-w-sm text-center">
        {/* ロゴ */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue text-4xl shadow-card">
          ⭐
        </div>
        <h1 className="mb-2 text-3xl font-extrabold text-oshi-text">OshiHub</h1>
        <p className="mb-1 text-sm font-bold text-oshi-pink">推し活、ぜんぶおまかせ。</p>
        <p className="mb-10 text-sm leading-relaxed text-oshi-sub">
          推しを登録するだけで、AIが公式サイト・公式Xから
          <br />
          予定を集めてカレンダーにまとめます。
        </p>

        <button
          onClick={handleLogin}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-white py-3.5 font-bold text-oshi-text shadow-card transition active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? 'ログイン中…' : 'Googleでログイン'}
        </button>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {isDemo && (
          <p className="mt-6 rounded-2xl bg-white/70 px-4 py-3 text-xs leading-relaxed text-oshi-sub">
            現在 <b>デモモード</b> です。Firebase 未設定のため、ボタンを押すと
            擬似ユーザーでログインしモックデータで体験できます。
          </p>
        )}

        <p className="mt-8 text-[11px] text-oshi-sub">
          ログインすると利用規約・プライバシーポリシーに同意したものとみなされます。
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
