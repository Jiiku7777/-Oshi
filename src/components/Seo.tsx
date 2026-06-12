import { Helmet } from 'react-helmet-async'
import { SITE } from '@/config/site'

interface Props {
  title: string
  description?: string
  /** ルート相対パス（例: /g/nogizaka46）。canonical/OGP用 */
  path?: string
  image?: string
  /** 検索エンジンにインデックスさせない場合 true（ログイン後の画面など） */
  noindex?: boolean
}

/** ページ単位の <head>（title/description/canonical/OGP）を設定する */
export function Seo({ title, description, path = '/', image, noindex }: Props) {
  const fullTitle = title === SITE.name ? title : `${title} | ${SITE.name}`
  const desc = description ?? SITE.description
  const url = `${SITE.url}${path}`
  const img = image ?? SITE.ogImage

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  )
}
