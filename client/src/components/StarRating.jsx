import { useState } from 'react'
import { Star } from 'lucide-react'

export function StarRating({ value, onChange, size = 'md', readOnly = false }) {
  const [hover, setHover] = useState(null)
  const s = size === 'sm' ? 'size-3.5' : 'size-6'
  const shown = hover ?? value ?? 0

  if (readOnly) {
    if (!value) return null
    return (
      <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} className={`${s} ${n <= value ? 'fill-fox-400 text-fox-400' : 'text-ink-500'}`} />
        ))}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Episode rating" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(value === n ? null : n)}
            className="rounded-md p-0.5 transition hover:scale-110"
          >
            <Star className={`${s} transition ${n <= shown ? 'fill-fox-400 text-fox-400' : 'text-ink-500'}`} />
          </button>
        ))}
      </div>
      <span className="text-sm text-cream-500">{value ? `${value}/5` : 'Not rated'}</span>
    </div>
  )
}
