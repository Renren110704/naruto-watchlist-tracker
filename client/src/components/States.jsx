import { AlertTriangle, Loader2, RotateCw } from 'lucide-react'

export function Spinner({ className = 'size-4' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
}

export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 py-16 text-sm text-cream-500 ${className}`} role="status">
      <Spinner className="size-5 text-fox-500" />
      {label}
    </div>
  )
}

export function SkeletonRows({ rows = 6 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-800/70" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div className={`card flex flex-col items-center gap-3 px-6 py-10 text-center ${className}`} role="alert">
      <span className="grid size-11 place-items-center rounded-full bg-leaf-500/15 text-leaf-400">
        <AlertTriangle className="size-5" />
      </span>
      <div>
        <p className="font-medium text-cream-50">Something went wrong</p>
        <p className="mt-1 text-sm text-cream-500">{error?.message || 'Please try again.'}</p>
      </div>
      {onRetry && (
        <button className="btn-secondary btn-sm" onClick={() => onRetry()}>
          <RotateCw className="size-3.5" /> Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 px-6 py-12 text-center ${className}`}>
      {Icon && (
        <span className="grid size-12 place-items-center rounded-2xl bg-fox-500/10 text-fox-400">
          <Icon className="size-6" />
        </span>
      )}
      <div className="max-w-sm">
        <p className="font-display font-semibold text-cream-50">{title}</p>
        {children && <p className="mt-1.5 text-sm text-cream-500">{children}</p>}
      </div>
      {action}
    </div>
  )
}
