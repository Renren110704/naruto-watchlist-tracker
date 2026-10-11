export function ProgressBar({ value = 0, size = 'md', tone = 'fox', label }) {
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2'
  const fill = tone === 'chakra' ? 'bg-chakra-500' : 'bg-gradient-to-r from-fox-600 to-fox-400'
  const v = Math.min(100, Math.max(0, value))
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-ink-700/80 ${h}`}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`${h} rounded-full ${fill} transition-[width] duration-500 ease-out`} style={{ width: `${v}%` }} />
    </div>
  )
}

export function ProgressRing({ value = 0, size = 140, stroke = 12, children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(100, Math.max(0, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-fox-400)" />
            <stop offset="100%" stopColor="var(--color-leaf-500)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink-700)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
