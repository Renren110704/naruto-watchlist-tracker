/**
 * Ninja ranks earned from the number of regular episodes watched (movies and OVAs
 * don't count, matching the progress percentages elsewhere in the app).
 *
 * `min` is the number of watched episodes needed to reach the rank. Edit the numbers
 * or add rows to tune the ladder; keep them in ascending order. The last rank has no
 * `min` because it is only reached by watching every episode in the catalog.
 */
export const RANKS = [
  { id: 'academy', title: 'Academy Student', min: 0 },
  { id: 'genin', title: 'Genin', min: 5 },
  { id: 'chunin', title: 'Chunin', min: 50 },
  { id: 'special-jonin', title: 'Special Jonin', min: 120 },
  { id: 'jonin', title: 'Jonin', min: 220 },
  { id: 'anbu', title: 'ANBU', min: 350 },
  { id: 'sannin', title: 'Sannin', min: 500 },
  { id: 'hokage', title: 'Hokage', min: 720 },
  { id: 'sage', title: 'Sage of Six Paths' },
]

/**
 * Resolves the rank for `watched` episodes out of `total`.
 * Returns the current rank, the next one (or null at the top), the percentage of the
 * way from the current rank to the next, and the full ladder with each rank's state.
 */
export function getRank(watched = 0, total = 0) {
  const tiers = RANKS.map((r) => ({ ...r, min: r.min ?? (total || Infinity) }))
  let index = 0
  tiers.forEach((t, i) => {
    if (watched >= t.min) index = i
  })
  const current = tiers[index]
  const next = tiers[index + 1] ?? null
  return {
    ...current,
    next: next && { id: next.id, title: next.title, min: next.min, remaining: next.min - watched },
    percent: next ? Math.round(((watched - current.min) / (next.min - current.min)) * 100) : 100,
    ladder: tiers.map((t, i) => ({ ...t, state: i < index ? 'earned' : i === index ? 'current' : 'locked' })),
  }
}
