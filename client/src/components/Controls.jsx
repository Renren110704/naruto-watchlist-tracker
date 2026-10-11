import { Search, X } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder = 'Search…', className = '', label = 'Search' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        className="input pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-cream-500 hover:text-cream-100"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

/** Pill-style single choice control (e.g. All / Watched / Unwatched). */
export function Segmented({ options, value, onChange, label, className = '' }) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-xl border border-ink-700 bg-ink-900/60 p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              active ? 'bg-ink-700 text-cream-50 shadow-sm' : 'text-cream-500 hover:text-cream-100'
            }`}
          >
            {o.label}
            {o.count != null && <span className="ml-1.5 text-cream-500">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Select({ value, onChange, children, label, className = '' }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`input appearance-auto pr-8 ${className}`}>
      {children}
    </select>
  )
}

export function PageHeader({ eyebrow, title, children, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-fox-400">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {children && <p className="mt-1.5 max-w-2xl text-sm text-cream-500">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Field({ label, htmlFor, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-leaf-400" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-cream-500">{hint}</p>
      )}
    </div>
  )
}
