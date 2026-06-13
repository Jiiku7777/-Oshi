import { useEffect, useState } from 'react'

/**
 * PWA「ホーム画面に追加（インストール）」の補助。
 * Chrome/Android では beforeinstallprompt を捕まえてワンタップ設置。
 * iOS Safari はプログラム設置不可なので手順を案内する。
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const EVENT = 'oshihub:installable'

/** アプリ起動時に呼ぶ。インストールプロンプトを早期に捕捉する。 */
export function initInstallCapture() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event(EVENT))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new Event(EVENT))
  })
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => !!deferred)
  useEffect(() => {
    const handler = () => setCanInstall(!!deferred)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable'
    await deferred.prompt()
    const choice = await deferred.userChoice
    deferred = null
    window.dispatchEvent(new Event(EVENT))
    return choice.outcome
  }

  return { canInstall, promptInstall, ios: isIOS(), standalone: isStandalone() }
}
