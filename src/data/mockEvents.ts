import type { OshiEvent } from '@/types'

// ============================================================
// モックイベント（デモ / Firebase 未設定時に使用）
// 本番では AI 収集バックエンドが Firestore に書き込む想定。
// 日付は「今日」を基準に生成し、常に当日の予定が出るようにする。
// ============================================================

/** 今日を基準に時刻を指定した ISO 文字列を作る（offsetDays 日後の hh:mm） */
function at(offsetDays: number, hh: number, mm = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

let seq = 0
const id = () => `evt_${++seq}`

export const MOCK_EVENTS: OshiEvent[] = [
  // ---- 今日 ----
  {
    id: id(),
    title: 'FRUITS ZIPPER 定期YouTube生配信',
    groupId: 'fruits-zipper',
    category: 'youtube',
    startAt: at(0, 19, 0),
    source: 'youtube',
    url: 'https://www.youtube.com/@FRUITSZIPPER',
    description: '新曲リリース記念の生配信。メンバー全員出演予定。',
  },
  {
    id: id(),
    title: 'CUTIE STREET TikTok LIVE',
    groupId: 'cutie-street',
    category: 'tiktok',
    startAt: at(0, 20, 0),
    source: 'official_x',
    url: 'https://www.tiktok.com/@cutie_street',
    description: 'ダンス練習の裏側を生配信！',
  },
  {
    id: id(),
    title: '日向坂46 出演「CDTVライブ!ライブ!」',
    groupId: 'hinatazaka46',
    category: 'tv',
    startAt: at(0, 21, 0),
    source: 'official_site',
    url: 'https://www.hinatazaka46.com/',
    description: '最新シングルを地上波で初披露。',
  },

  // ---- 明日〜今週 ----
  {
    id: id(),
    title: '=LOVE 全国ツアー 東京公演',
    groupId: 'equal-love',
    category: 'live',
    startAt: at(1, 18, 30),
    endAt: at(1, 20, 30),
    source: 'official_site',
    url: 'https://equal-love.jp/',
    description: '東京・有明アリーナにて。終演後に特典会あり。',
  },
  {
    id: id(),
    title: '=LOVE リリースイベント（特典会）',
    groupId: 'equal-love',
    category: 'event',
    startAt: at(1, 14, 0),
    source: 'official_x',
    url: 'https://twitter.com/equal_love_staff',
    description: '対象商品購入者限定の個別お話し会。',
  },
  {
    id: id(),
    title: 'CANDY TUNE 新曲「キャンディラッシュ」配信リリース',
    groupId: 'candy-tune',
    category: 'release',
    startAt: at(2, 0, 0),
    source: 'official_site',
    url: 'https://candytune.jp/',
    description: '各種音楽サブスクで一斉配信開始。',
  },
  {
    id: id(),
    title: '櫻坂46 出演「ミュージックステーション」',
    groupId: 'sakurazaka46',
    category: 'tv',
    startAt: at(2, 20, 0),
    source: 'official_site',
    url: 'https://sakurazaka46.com/',
  },
  {
    id: id(),
    title: '≠ME 冠ラジオ「ノイミーのオールナイトニッポン」',
    groupId: 'not-equal-me',
    category: 'radio',
    startAt: at(3, 25 - 24, 0), // 翌1:00想定の簡略表現
    source: 'official_x',
    url: 'https://not-equal-me.jp/',
  },
  {
    id: id(),
    title: 'SWEET STEADY 新グッズ発売開始',
    groupId: 'sweet-steady',
    category: 'goods',
    startAt: at(3, 12, 0),
    source: 'official_site',
    url: 'https://sweet-steady.jp/',
    description: '推しメンアクリルスタンド第2弾。オンラインストア限定。',
  },
  {
    id: id(),
    title: '乃木坂46 真夏の全国ツアー 大阪公演',
    groupId: 'nogizaka46',
    category: 'live',
    startAt: at(4, 17, 0),
    endAt: at(4, 19, 30),
    source: 'official_site',
    url: 'https://www.nogizaka46.com/',
  },
  {
    id: id(),
    title: '≒JOY YouTube ゲーム実況配信',
    groupId: 'nearly-equal-joy',
    category: 'youtube',
    startAt: at(5, 19, 30),
    source: 'youtube',
    url: 'https://nearly-equal-joy.jp/',
  },

  // ---- 来月にかけて（カレンダー確認用） ----
  {
    id: id(),
    title: 'FRUITS ZIPPER ワンマンライブ',
    groupId: 'fruits-zipper',
    category: 'live',
    startAt: at(12, 18, 0),
    endAt: at(12, 20, 0),
    source: 'official_site',
    url: 'https://fruitszipper.jp/',
  },
  {
    id: id(),
    title: '乃木坂46 27thシングル発売',
    groupId: 'nogizaka46',
    category: 'release',
    startAt: at(18, 0, 0),
    source: 'official_site',
    url: 'https://www.nogizaka46.com/',
  },
  {
    id: id(),
    title: 'CUTIE STREET 特典会（東京）',
    groupId: 'cutie-street',
    category: 'event',
    startAt: at(20, 13, 0),
    source: 'official_x',
    url: 'https://cutiestreet.jp/',
  },
]
