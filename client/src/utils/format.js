export const SPECIAL_LABELS = { movie: 'Movie', ova: 'OVA', special: 'Special' }

/** Short secondary line for an episode: series · season · arc. */
export function episodeContext(e, { series = true, season = true } = {}) {
  return [series && e.series?.title, season && e.season?.title, e.arc].filter(Boolean).join(' · ')
}

export function formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, opts)
}

export function formatAirDates(airDates) {
  if (!airDates?.start) return ''
  const f = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  return `${f(airDates.start)} – ${f(airDates.end)}`
}

export function timeAgo(value) {
  if (!value) return ''
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return formatDate(value)
}

export const pct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`
