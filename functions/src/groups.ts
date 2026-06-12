// 収集対象グループと情報ソース（公式サイト / 公式X）。
// フロントの src/data/groups.ts と id を一致させること。
// 公式URLはAIの巡回起点。見つからない情報は web_search で補完される。

export interface GroupSource {
  id: string
  name: string
  /** 公式サイト（スケジュールページがあれば優先的に指定） */
  officialUrls: string[]
  /** 公式X（@ハンドル） */
  xHandles: string[]
}

export const GROUP_SOURCES: GroupSource[] = [
  {
    id: 'fruits-zipper',
    name: 'FRUITS ZIPPER',
    officialUrls: ['https://fruitszipper.asobisystem.com/live_information/schedule/list/'],
    xHandles: ['@FRUITS_ZIPPER'],
  },
  {
    id: 'cutie-street',
    name: 'CUTIE STREET',
    officialUrls: ['https://cutiestreet.asobisystem.com/'],
    xHandles: ['@cutie_street_'],
  },
  {
    id: 'candy-tune',
    name: 'CANDY TUNE',
    officialUrls: ['https://candytune.asobisystem.com/'],
    xHandles: ['@CANDYTUNE_'],
  },
  {
    id: 'sweet-steady',
    name: 'SWEET STEADY',
    officialUrls: ['https://sweetsteady.asobisystem.com/'],
    xHandles: ['@SWEET_STEADY_'],
  },
  {
    id: 'equal-love',
    name: '=LOVE',
    officialUrls: ['https://equal-love.jp/schedule'],
    xHandles: ['@equal_love_staff'],
  },
  {
    id: 'not-equal-me',
    name: '≠ME',
    officialUrls: ['https://not-equal-me.jp/schedule'],
    xHandles: ['@notequalme_staff'],
  },
  {
    id: 'nearly-equal-joy',
    name: '≒JOY',
    officialUrls: ['https://nearlyequal-joy.jp/schedule'],
    xHandles: ['@nearlyequal_joy'],
  },
  {
    id: 'nogizaka46',
    name: '乃木坂46',
    officialUrls: ['https://www.nogizaka46.com/s/n46/schedule/list'],
    xHandles: ['@nogizaka46'],
  },
  {
    id: 'sakurazaka46',
    name: '櫻坂46',
    officialUrls: ['https://sakurazaka46.com/s/s46/schedule/list'],
    xHandles: ['@sakurazaka46'],
  },
  {
    id: 'hinatazaka46',
    name: '日向坂46',
    officialUrls: ['https://www.hinatazaka46.com/s/official/schedule/list'],
    xHandles: ['@hinatazaka46'],
  },
]
