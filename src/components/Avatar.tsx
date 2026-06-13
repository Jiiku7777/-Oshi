/** ファンのアイコン表示。画像があれば丸く表示、無ければ頭文字＋グラデ円。 */
export function Avatar({
  src,
  name,
  size = 40,
  ring,
}: {
  src?: string | null
  name?: string
  size?: number
  /** 白いリングを付ける（暗背景での視認性向上） */
  ring?: boolean
}) {
  const ringCls = ring ? 'ring-2 ring-white/70' : ''
  const dim = { width: size, height: size }
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={dim}
        className={`shrink-0 rounded-full object-cover ${ringCls}`}
      />
    )
  }
  const initial = (name?.trim()?.[0] ?? '👤').toUpperCase()
  return (
    <div
      style={{ ...dim, fontSize: size * 0.45 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-oshi-pink to-oshi-purple font-black text-white ${ringCls}`}
    >
      {initial}
    </div>
  )
}
