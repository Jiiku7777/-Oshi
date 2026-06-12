import type { EventCategory } from '@/types'
import { CATEGORY_META } from '@/utils/category'

export function CategoryBadge({ category }: { category: EventCategory }) {
  const meta = CATEGORY_META[category]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.badgeClass}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  )
}
