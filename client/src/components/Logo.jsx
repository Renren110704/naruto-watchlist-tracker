/** Leaf-swirl mark inspired by the Hidden Leaf symbol (original artwork, not the emblem). */
export function LeafMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-fox-500/12" />
      <path
        d="M32 12c-8 6-14 13-14 22a14 14 0 0 0 28 0c0-9-6-16-14-22z"
        fill="none"
        className="stroke-fox-500"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M32 50V27" className="stroke-fox-500" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="35" r="5" fill="none" className="stroke-leaf-500" strokeWidth="3" />
    </svg>
  )
}

export function Logo({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LeafMark />
      {!compact && (
        <span className="leading-tight">
          <span className="block font-display text-[15px] font-semibold text-cream-50">Watchlist</span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-fox-400">Ninja Journal</span>
        </span>
      )}
    </span>
  )
}
