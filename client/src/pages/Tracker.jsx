import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCheck, ChevronLeft, ChevronRight, Clapperboard, ListChecks, Play, SearchX } from 'lucide-react'
import { PageHeader, SearchInput, Segmented, Select } from '../components/Controls'
import { EpisodeRow, NotesButton, WatchButton } from '../components/Episode'
import { NoteEditorModal } from '../components/NoteEditorModal'
import { ProgressBar, ProgressRing } from '../components/Progress'
import { EmptyState, ErrorState, LoadingState, SkeletonRows } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useWatchToggle } from '../hooks/useWatchToggle'
import { progressApi } from '../services/endpoints'
import { episodeContext, pct } from '../utils/format'

const PAGE_SIZE = 25

function EpisodeList({ tab, series, q, onChanged, onNotes, reloadKey }) {
  const [page, setPage] = useState(1)
  const params = {
    status: tab,
    series: series || undefined,
    q: q || undefined,
    sort: tab === 'watched' ? 'recent' : 'order',
    page,
    limit: PAGE_SIZE,
  }
  const { data, error, loading, reload, setData } = useAsync(() => progressApi.list(params), [tab, series, q, page, reloadKey])

  const onUpdated = useCallback(
    (updated) => {
      // The entry no longer belongs to this tab.
      setData((d) => d && { ...d, episodes: d.episodes.filter((e) => e.id !== updated.id), pagination: { ...d.pagination, total: d.pagination.total - 1 } })
      onChanged()
    },
    [setData, onChanged],
  )
  const { toggle, isPending } = useWatchToggle(onUpdated)

  if (error && !data) return <ErrorState error={error} onRetry={reload} />
  if (!data) return <SkeletonRows rows={8} />
  const { episodes, pagination } = data

  if (!episodes.length) {
    return (
      <div className="card">
        <EmptyState icon={q ? SearchX : tab === 'watched' ? Clapperboard : CheckCheck} title={q ? 'No matches' : tab === 'watched' ? 'No watched episodes yet' : 'Nothing left to watch!'}>
          {q ? 'Try another search term.' : tab === 'watched' ? 'Episodes you mark as watched will appear here, most recent first.' : 'Everything in this selection is watched.'}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <p className="mb-3 text-sm text-cream-500">
        {pagination.total.toLocaleString()} {tab} {pagination.total === 1 ? 'entry' : 'entries'}
        {tab === 'watched' ? ' · most recent first' : ' · in watch order'}
      </p>
      <ul className="space-y-2">
        {episodes.map((e) => (
          <EpisodeRow key={e.id} episode={e} onToggle={toggle} pending={isPending(e.id)} onNotes={onNotes} showSeries showSeason />
        ))}
      </ul>
      {pagination.totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Pagination">
          <button className="btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>
            <ChevronLeft className="size-4" /> Previous
          </button>
          <span className="text-sm text-cream-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button className="btn-secondary btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>
            Next <ChevronRight className="size-4" />
          </button>
        </nav>
      )}
    </div>
  )
}

export default function Tracker() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'watched' ? 'watched' : 'unwatched'
  const series = params.get('series') || ''
  const [query, setQuery] = useState('')
  const q = useDebounce(query.trim(), 300)
  const [noteEpisode, setNoteEpisode] = useState(null)
  const [listKey, setListKey] = useState(0)

  const stats = useAsync(() => progressApi.stats(), [])
  const refreshStats = useCallback(() => stats.reload({ silent: true }), [stats.reload]) // eslint-disable-line react-hooks/exhaustive-deps
  const onContinueToggled = useCallback(() => {
    refreshStats()
    setListKey((k) => k + 1)
  }, [refreshStats])
  const { toggle, isPending } = useWatchToggle(onContinueToggled)

  const setParam = (k, v) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (v) next.set(k, v)
      else next.delete(k)
      return next
    }, { replace: true })

  if (stats.loading && !stats.data) return <LoadingState label="Loading your tracker…" />
  if (stats.error && !stats.data) return <ErrorState error={stats.error} onRetry={stats.reload} />
  const { overall, series: seriesStats, seasons, continueWatching: next } = stats.data

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader eyebrow="Progress" title="My Tracker">
        Your progress per series and season, plus every watched and unwatched entry.
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <div className="card flex items-center gap-6 p-6">
          <ProgressRing value={overall.percent} size={128} stroke={11}>
            <div>
              <p className="font-display text-2xl font-semibold text-cream-50">{pct(overall.percent)}</p>
              <p className="text-[11px] text-cream-500">overall</p>
            </div>
          </ProgressRing>
          <dl className="grid flex-1 gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-cream-500">Watched</dt><dd className="font-semibold tabular-nums text-chakra-400">{overall.watched}</dd></div>
            <div className="flex justify-between"><dt className="text-cream-500">Remaining</dt><dd className="font-semibold tabular-nums">{overall.remaining}</dd></div>
            <div className="flex justify-between"><dt className="text-cream-500">Movies & OVAs</dt><dd className="font-semibold tabular-nums">{overall.specialsWatched}/{overall.specialsTotal}</dd></div>
          </dl>
        </div>

        <div className="card p-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fox-400">
            <Play className="size-3.5 fill-current" /> Continue from
          </p>
          {next ? (
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link to={`/episodes/${next.id}`} className="font-display text-xl font-semibold text-cream-50 hover:text-fox-300">
                  {next.label}
                </Link>
                <p className="mt-0.5 truncate text-sm text-cream-500">{episodeContext(next, { series: true, season: true })}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <WatchButton episode={next} pending={isPending(next.id)} onToggle={toggle} />
                <NotesButton episode={next} onClick={setNoteEpisode} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-cream-300">You&apos;ve watched everything. Legendary.</p>
          )}
        </div>
      </section>

      {/* Per-series and per-season progress */}
      <section className="space-y-4">
        {seriesStats.map((s) => (
          <details key={s.id} className="card group p-5 open:pb-6" open={s.id === (next?.series.id ?? 'naruto')}>
            <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="truncate text-lg font-semibold">{s.title}</h2>
                  <span className="shrink-0 text-sm tabular-nums text-cream-300">
                    {s.watched}/{s.total} · {pct(s.percent)}
                  </span>
                </div>
                <ProgressBar value={s.percent} label={`${s.title} progress`} />
              </div>
              <ChevronRight className="size-5 shrink-0 text-cream-500 transition group-open:rotate-90" />
            </summary>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {seasons
                .filter((x) => x.seriesId === s.id)
                .map((x) => (
                  <Link key={x.id} to={`/browse?series=${s.id}&season=${x.id}`} className="group/season rounded-xl border border-ink-700/70 bg-ink-900/40 p-3.5 transition hover:border-fox-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-cream-100 group-hover/season:text-fox-300">{x.title}</span>
                      {x.percent === 100 ? <CheckCheck className="size-4 shrink-0 text-chakra-400" /> : <ArrowRight className="size-3.5 shrink-0 text-cream-500" />}
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-cream-500">
                      {x.watched}/{x.total} episodes{x.specialsTotal ? ` · ${x.specialsWatched}/${x.specialsTotal} specials` : ''}
                    </p>
                    <div className="mt-2.5">
                      <ProgressBar value={x.percent} size="sm" tone={x.percent === 100 ? 'chakra' : 'fox'} label={`${x.title} progress`} />
                    </div>
                  </Link>
                ))}
            </div>
          </details>
        ))}
      </section>

      {/* Watched / unwatched lists */}
      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <h2 className="flex items-center gap-2 text-lg font-semibold lg:mr-auto">
            <ListChecks className="size-5 text-fox-400" /> Episodes
          </h2>
          <Segmented
            label="List"
            value={tab}
            onChange={(v) => setParam('tab', v === 'unwatched' ? null : v)}
            options={[
              { value: 'unwatched', label: 'Unwatched' },
              { value: 'watched', label: 'Watched' },
            ]}
          />
          <Select label="Series filter" value={series} onChange={(v) => setParam('series', v)} className="lg:w-56">
            <option value="">All series</option>
            {seriesStats.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </Select>
          <SearchInput value={query} onChange={setQuery} placeholder="Search…" label="Search tracker list" className="lg:w-56" />
        </div>
        <EpisodeList key={`${tab}-${series}-${q}`} tab={tab} series={series} q={q} onChanged={refreshStats} onNotes={setNoteEpisode} reloadKey={listKey} />
      </section>

      {noteEpisode && (
        <NoteEditorModal
          episode={noteEpisode}
          onClose={() => setNoteEpisode(null)}
          onChange={() => {
            refreshStats()
            setListKey((k) => k + 1)
          }}
        />
      )}
    </div>
  )
}
