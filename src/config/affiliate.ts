// ============================================================
// アフィリエイト設定
// 取得したID/タグをここに入れると、購入リンクが収益化されます。
// 空のままでも通常の検索リンクとして機能します（収益は付きません）。
// ============================================================

export const AFFILIATE = {
  /** Amazonアソシエイト・トラッキングID（例: oshihub-22）。https://affiliate.amazon.co.jp/ で取得 */
  amazonTag: '',
  /** 楽天アフィリエイトID。https://affiliate.rakuten.co.jp/ で取得（任意） */
  rakutenAffiliateId: '',
} as const

export const hasAmazon = () => AFFILIATE.amazonTag.trim().length > 0
