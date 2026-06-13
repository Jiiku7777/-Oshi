import { useInstallPrompt } from '@/utils/pwa'

/** スマホのホーム画面にアプリ（PWA）を追加するカード。インストール済みなら非表示。 */
export function InstallAppCard() {
  const { canInstall, promptInstall, standalone } = useInstallPrompt()

  if (standalone) return null // 既にホーム画面アプリとして起動中

  return (
    <div className="rounded-card bg-gradient-to-r from-oshi-pinkLight to-oshi-purpleLight p-4 shadow-soft">
      <button
        onClick={() => canInstall && promptInstall()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-oshi-pink to-oshi-purple py-3.5 font-extrabold text-white shadow-card transition active:scale-[0.98]"
      >
        📲 ホーム画面にアプリを追加
      </button>
      <div className="mt-2.5 space-y-1 text-[11px] leading-relaxed text-oshi-sub">
        <p>
          <b className="text-oshi-text">iPhone：</b>Safari下部の共有ボタン（□に↑）→「ホーム画面に追加」
        </p>
        <p>
          <b className="text-oshi-text">Android：</b>上のボタン、または⋮メニュー →「アプリをインストール」
        </p>
      </div>
    </div>
  )
}
