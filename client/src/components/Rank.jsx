import { Medal } from 'lucide-react'
import { getRank } from '../utils/rank'
import { ProgressBar } from './Progress'

const CHIP_TONES = {
  earned: 'border-chakra-500/30 bg-chakra-500/10 text-chakra-400',
  current: 'border-fox-500/50 bg-fox-500/15 text-fox-300',
  locked: 'border-ink-700 bg-ink-800/60 text-cream-500',
}

/** The user's ninja rank from episodes watched, progress to the next rank and the full ladder. */
export function RankCard({ watched, total }) {
  const rank = getRank(watched, total)
  const { next } = rank
  return (
    <section className="card p-5 sm:p-6" aria-label="Ninja rank">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:shrink-0">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-fox-500/12 text-fox-400">
            <Medal className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fox-400">Ninja rank</p>
            <p className="font-display text-2xl font-semibold text-cream-50 sm:whitespace-nowrap">{rank.title}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex justify-between gap-3 text-sm">
            <span className="text-cream-300">
              {next
                ? `${next.remaining.toLocaleString()} more episode${next.remaining === 1 ? '' : 's'} to reach ${next.title}`
                : 'Highest rank reached. Every episode watched!'}
            </span>
            <span className="shrink-0 tabular-nums text-cream-500">
              {watched.toLocaleString()}/{(next ? next.min : total).toLocaleString()}
            </span>
          </div>
          <ProgressBar value={rank.percent} tone={next ? 'fox' : 'chakra'} label="Progress to the next rank" />
        </div>
      </div>
      <ol className="mt-5 flex flex-wrap gap-2 border-t border-ink-700/70 pt-4">
        {rank.ladder.map((r) => (
          <li
            key={r.id}
            className={`chip ${CHIP_TONES[r.state]}`}
            aria-current={r.state === 'current' ? 'true' : undefined}
            title={r.min === 0 ? 'Starting rank' : `Reached at ${r.min.toLocaleString()} episodes watched`}
          >
            {r.title}
          </li>
        ))}
      </ol>
    </section>
  )
}
