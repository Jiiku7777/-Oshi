export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-oshi-sub">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-oshi-pinkLight border-t-oshi-pink" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
