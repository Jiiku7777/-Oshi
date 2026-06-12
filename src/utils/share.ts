// SNS共有ユーティリティ（拡散による集客用）

/** OS標準の共有シート（スマホ）。使えない環境では false を返す */
export async function nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data)
      return true
    } catch {
      return false
    }
  }
  return false
}

/** X（旧Twitter）の投稿画面を開く */
export function shareToX(text: string, url: string): void {
  const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  window.open(u, '_blank', 'noopener,noreferrer')
}

/** LINEで共有 */
export function shareToLine(url: string): void {
  const u = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`
  window.open(u, '_blank', 'noopener,noreferrer')
}
