// 収集対象グループと使用パーサー。フロントの src/data/groups.ts と id を一致させること。
// β版10組すべて status:'ok'（無料・fetch+cheerioのみ）。
// status:'todo' を付けたものは収集対象から除外される。

export const SOURCES = [
  // --- 坂道系: 乃木坂は公式JSON APIが利用可能 ---
  { id: 'nogizaka46', name: '乃木坂46', parser: 'nogizaka', status: 'ok',
    api: 'https://www.nogizaka46.com/s/n46/api/list/schedule' },

  // --- イコラブ系: 公式サイトがサーバーレンダリング（同一CMS） ---
  { id: 'equal-love', name: '=LOVE', parser: 'iyimei', status: 'ok',
    base: 'https://equal-love.jp' },
  { id: 'not-equal-me', name: '≠ME', parser: 'iyimei', status: 'ok',
    base: 'https://not-equal-me.jp' },
  { id: 'nearly-equal-joy', name: '≒JOY', parser: 'iyimei', status: 'ok',
    base: 'https://nearly-equal-joy.jp' },

  // --- asobisystem KAWAII LAB. 系: 公式サイトがサーバーレンダリング（同一CMS） ---
  { id: 'fruits-zipper', name: 'FRUITS ZIPPER', parser: 'asobisystem', status: 'ok',
    base: 'https://fruitszipper.asobisystem.com' },
  { id: 'cutie-street', name: 'CUTIE STREET', parser: 'asobisystem', status: 'ok',
    base: 'https://cutiestreet.asobisystem.com' },
  { id: 'candy-tune', name: 'CANDY TUNE', parser: 'asobisystem', status: 'ok',
    base: 'https://candytune.asobisystem.com' },
  { id: 'sweet-steady', name: 'SWEET STEADY', parser: 'asobisystem', status: 'ok',
    base: 'https://sweetsteady.asobisystem.com' },

  // --- 櫻坂46 / 日向坂46: 公式メディア出演ページ（サーバーレンダリング） ---
  { id: 'sakurazaka46', name: '櫻坂46', parser: 'sakurazaka', status: 'ok',
    base: 'https://sakurazaka46.com/s/s46' },
  { id: 'hinatazaka46', name: '日向坂46', parser: 'hinatazaka', status: 'ok',
    base: 'https://www.hinatazaka46.com/s/official' },

  // --- LAPONE系（PRODUCE 101 JAPAN 出身など人気グループ・同一CMS） ---
  { id: 'jo1', name: 'JO1', parser: 'lapone', status: 'ok', base: 'https://jo1.jp' },
  { id: 'ini', name: 'INI', parser: 'lapone', status: 'ok', base: 'https://ini-official.com' },
  { id: 'dxteen', name: 'DXTEEN', parser: 'lapone', status: 'ok', base: 'https://dxteen.com' },
  { id: 'mei', name: 'ME:I', parser: 'lapone', status: 'ok', base: 'https://me-i.jp' },

  // --- スターダスト系（公式サイト・サーバーレンダリング） ---
  { id: 'momoclo', name: 'ももいろクローバーZ', parser: 'stardust', status: 'ok', base: 'https://www.momoclo.net' },
  { id: 'tokisen', name: '超ときめき♡宣伝部', parser: 'tokisen', status: 'ok', base: 'https://toki-sen.com' },

  // --- SKIYAKI系 ---
  { id: 'onenonly', name: "ONE N' ONLY", parser: 'skiyaki', status: 'ok', base: 'https://one-n-only.jp' },
]
