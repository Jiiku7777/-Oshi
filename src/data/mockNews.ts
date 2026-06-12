import type { OshiNews } from '@/types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const MOCK_NEWS: OshiNews[] = [
  {
    id: 'news_1',
    groupId: 'fruits-zipper',
    title: 'FRUITS ZIPPER、新ビジュアル公開！',
    summary: '夏に向けた新ビジュアルが公式サイトで解禁。新衣装にファン歓喜。',
    url: 'https://fruitszipper.jp/',
    publishedAt: daysAgo(0),
  },
  {
    id: 'news_2',
    groupId: 'equal-love',
    title: '=LOVE、ツアーファイナルの追加公演決定',
    summary: 'チケット即完を受けて追加公演が発表されました。',
    url: 'https://equal-love.jp/',
    publishedAt: daysAgo(1),
  },
  {
    id: 'news_3',
    groupId: 'hinatazaka46',
    title: '日向坂46、冠番組の放送時間変更のお知らせ',
    summary: '次回より放送枠が移動します。録画予約の変更をお忘れなく。',
    url: 'https://www.hinatazaka46.com/',
    publishedAt: daysAgo(2),
  },
  {
    id: 'news_4',
    groupId: 'candy-tune',
    title: 'CANDY TUNE、MV再生数100万回突破！',
    summary: '最新MVが公開から1週間で100万回再生を達成しました。',
    url: 'https://candytune.jp/',
    publishedAt: daysAgo(3),
  },
]
