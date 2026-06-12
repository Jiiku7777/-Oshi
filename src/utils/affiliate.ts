import type { EventCategory, OshiEvent } from '@/types'
import { getGroupName } from '@/data/groups'
import { AFFILIATE } from '@/config/affiliate'

// イベントから「買える商品」を推定し、Amazon/楽天の検索リンクを生成する。
// 主に release（CD/Blu-ray）・goods（グッズ）・雑誌掲載 で購入導線を出す。

export interface AffiliateLink {
  label: string
  amazonUrl: string
  rakutenUrl: string
}

/** タイトルから検索キーワードを抽出（メンバー名・装飾を除去） */
function cleanKeyword(title: string): string {
  return title
    .replace(/[（(【].*?[)）】]/g, ' ') // （櫻井）【...】等
    .replace(/※.*$/g, ' ') // ※メンバー名
    .replace(/@.*$/g, ' ') // @会場
    .replace(/\s+/g, ' ')
    .trim()
}

/** タイトルが雑誌掲載っぽいか（「ar」7月号 / CanCam 8月号 等） */
function looksLikeMagazine(title: string): boolean {
  return /号|月号|増刊|『[^』]+』\s*\d|「[^」]+」\s*\d月/.test(title) && !/シングル|アルバム|Blu-?ray|DVD/i.test(title)
}

function amazonSearch(keyword: string): string {
  const params = new URLSearchParams({ k: keyword })
  if (AFFILIATE.amazonTag) params.set('tag', AFFILIATE.amazonTag)
  return `https://www.amazon.co.jp/s?${params.toString()}`
}

function rakutenSearch(keyword: string): string {
  const base = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`
  // 楽天アフィリエイトは原則リンク生成ツール経由。ID未設定時は通常検索リンク。
  return base
}

/**
 * イベントに応じた購入リンクを返す。該当しないカテゴリでは null。
 */
export function getAffiliateLink(event: OshiEvent): AffiliateLink | null {
  const group = getGroupName(event.groupId)
  const cleaned = cleanKeyword(event.title)

  const relevant: EventCategory[] = ['release', 'goods']
  const isMag = looksLikeMagazine(event.title)

  let label = ''
  let keyword = ''

  if (event.category === 'release') {
    label = 'このCD・Blu-rayを探す'
    keyword = `${group} ${cleaned}`
  } else if (event.category === 'goods') {
    label = 'グッズを探す'
    keyword = `${group} グッズ`
  } else if (isMag) {
    label = 'この雑誌を探す'
    keyword = cleaned || `${group} 雑誌`
  } else if (relevant.includes(event.category)) {
    label = '関連商品を探す'
    keyword = `${group} ${cleaned}`
  } else {
    return null
  }

  return {
    label,
    amazonUrl: amazonSearch(keyword.trim()),
    rakutenUrl: rakutenSearch(keyword.trim()),
  }
}
