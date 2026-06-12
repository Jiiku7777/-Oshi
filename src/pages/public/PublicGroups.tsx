import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { getGroups } from '@/data/groups'
import { SITE } from '@/config/site'

/** 公開ランディング：対応アイドル一覧（/groups）。検索流入の受け皿＆内部リンクハブ。 */
export function PublicGroups() {
  const groups = getGroups()
  return (
    <div className="min-h-dvh bg-oshi-bg">
      <div className="mx-auto min-h-dvh max-w-md">
        <Seo
          title="対応アイドルのスケジュール一覧"
          description="FRUITS ZIPPER・=LOVE・乃木坂46・櫻坂46・日向坂46など人気アイドルの最新スケジュールをまとめてチェック。"
          path="/groups"
        />

        <header className="bg-gradient-to-br from-oshi-pink via-oshi-purple to-oshi-blue px-5 pb-8 pt-10 text-white">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-3xl">
            ⭐
          </div>
          <h1 className="text-2xl font-extrabold">{SITE.name} 推し活スケジュール</h1>
          <p className="mt-2 text-sm text-white/90">
            アイドルの最新予定（ライブ・特典会・テレビ・配信・リリース）をまとめてチェック。
            気になるグループをタップ。
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-oshi-pink shadow-card active:scale-95"
          >
            ⭐ アプリを使う（無料・通知あり）
          </Link>
        </header>

        <div className="px-5 py-6">
          <h2 className="mb-3 text-base font-extrabold text-oshi-text">対応アイドル</h2>
          <div className="grid grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                to={`/g/${g.id}`}
                className="flex items-center gap-2 rounded-card bg-white p-3.5 shadow-soft active:scale-[0.98]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ backgroundColor: g.color }}
                >
                  {g.name.charAt(0)}
                </span>
                <span className="min-w-0 truncate text-sm font-bold text-oshi-text">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-oshi-sub">
            © {new Date().getFullYear()} {SITE.name}
          </p>
        </div>
      </div>
    </div>
  )
}
