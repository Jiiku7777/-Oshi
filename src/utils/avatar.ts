/**
 * 画像ファイルを正方形・小サイズに縮小して data URL（JPEG）に変換する。
 * Firebase Storage（有料化リスク）を使わず、Firestore に収まる軽量データで
 * アイコンを保存するためのユーティリティ。
 */
const AVATAR_SIZE = 128 // 出力する一辺のピクセル数
const JPEG_QUALITY = 0.72

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await loadImage(file)

  // 中央を正方形にクロップ
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  const sy = (bitmap.height - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context が取得できません')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  // createImageBitmap が使えるブラウザでは EXIF 回転などを考慮しつつ高速
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('画像の読み込みに失敗しました'))
    }
    img.src = url
  })
}
