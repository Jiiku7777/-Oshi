import type { Group } from '@/types'

/**
 * β版対応グループ一覧。
 * 本番では Firestore の `groups` コレクションに移すことを想定し、
 * UI からはこの配列ではなく getGroups() 経由で参照する。
 */
export const GROUPS: Group[] = [
  { id: 'fruits-zipper', name: 'FRUITS ZIPPER', color: '#FF7EB9', reading: 'フルーツジッパー' },
  { id: 'cutie-street', name: 'CUTIE STREET', color: '#FFA6C9', reading: 'キューティーストリート' },
  { id: 'candy-tune', name: 'CANDY TUNE', color: '#FFB3D9', reading: 'キャンディチューン' },
  { id: 'sweet-steady', name: 'SWEET STEADY', color: '#F7A8C4', reading: 'スウィートステディ' },
  { id: 'equal-love', name: '=LOVE', color: '#7EC8FF', reading: 'イコールラブ' },
  { id: 'not-equal-me', name: '≠ME', color: '#A89CFF', reading: 'ノットイコールミー' },
  { id: 'nearly-equal-joy', name: '≒JOY', color: '#9CE0D6', reading: 'ニアリーイコールジョイ' },
  { id: 'nogizaka46', name: '乃木坂46', color: '#7E5BFF', reading: 'のぎざかフォーティーシックス' },
  { id: 'sakurazaka46', name: '櫻坂46', color: '#FF6FA3', reading: 'さくらざかフォーティーシックス' },
  { id: 'hinatazaka46', name: '日向坂46', color: '#8FD3FF', reading: 'ひなたざかフォーティーシックス' },
  { id: 'jo1', name: 'JO1', color: '#3A57D6', reading: 'ジェイオーワン' },
  { id: 'ini', name: 'INI', color: '#1FB6C9', reading: 'アイエヌアイ' },
  { id: 'dxteen', name: 'DXTEEN', color: '#E0566A', reading: 'ディーエックスティーン' },
  { id: 'mei', name: 'ME:I', color: '#E94FB0', reading: 'ミーアイ' },
  { id: 'momoclo', name: 'ももいろクローバーZ', color: '#E23B3B', reading: 'ももいろクローバーゼット' },
  { id: 'tokisen', name: '超ときめき♡宣伝部', color: '#C840C0', reading: 'ちょうときめきせんでんぶ' },
  { id: 'onenonly', name: "ONE N' ONLY", color: '#C9A227', reading: 'ワンエンオンリー' },
  { id: 'naniwa', name: 'なにわ男子', color: '#F0A030', reading: 'なにわだんし' },
  { id: 'timelesz', name: 'timelesz', color: '#2E86C1', reading: 'タイムレス' },
  { id: 'sixtones', name: 'SixTONES', color: '#555E6B', reading: 'ストーンズ' },
  { id: 'snowman', name: 'Snow Man', color: '#79A8D9', reading: 'スノーマン' },
  { id: 'aegroup', name: 'Aぇ! group', color: '#C0506E', reading: 'エーグループ' },
]

// グループごとの固有マーク。色が似ていても（ピンク系が多い）一目で見分けられるように。
const GROUP_EMOJI: Record<string, string> = {
  'fruits-zipper': '🍓',
  'cutie-street': '🎀',
  'candy-tune': '🍬',
  'sweet-steady': '🍯',
  'equal-love': '💙',
  'not-equal-me': '💜',
  'nearly-equal-joy': '🍀',
  'nogizaka46': '🐐',
  'sakurazaka46': '🌸',
  'hinatazaka46': '☀️',
  'jo1': '🔷',
  'ini': '🟢',
  'dxteen': '🔥',
  'mei': '💖',
  'momoclo': '🌈',
  'tokisen': '💘',
  'onenonly': '🎧',
  'naniwa': '🟡',
  'timelesz': '🕰️',
  'sixtones': '⚫',
  'snowman': '⛄',
  'aegroup': '🅰️',
}

export function getGroupEmoji(id: string): string {
  return GROUP_EMOJI[id] ?? '⭐'
}

// STARTO系（公式が出演情報を直近1〜2週間しか公開しないため予定が少なめ）
export const STARTO_GROUP_IDS = ['naniwa', 'timelesz', 'sixtones', 'snowman', 'aegroup']

export function isStartoGroup(id: string): boolean {
  return STARTO_GROUP_IDS.includes(id)
}

const groupMap = new Map(GROUPS.map((g) => [g.id, g]))

export function getGroups(): Group[] {
  return GROUPS
}

export function getGroup(id: string): Group | undefined {
  return groupMap.get(id)
}

export function getGroupName(id: string): string {
  return groupMap.get(id)?.name ?? '不明なグループ'
}
