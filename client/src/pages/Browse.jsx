import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Clapperboard, RotateCcw, SearchX } from 'lucide-react'
import { PageHeader, SearchInput, Segmented, Select } from '../components/Controls'
import { EpisodeRow } from '../components/Episode'
import { ConfirmDialog } from '../components/Modal'
import { NoteEditorModal } from '../components/NoteEditorModal'
import { ProgressBar } from '../components/Progress'
import { EmptyState, ErrorState, SkeletonRows } from '../components/States'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { useWatchToggle } from '../hooks/useWatchToggle'
import { parseApiError } from '../services/api'
import { catalogApi, progressApi } from '../services/endpoints'
import { formatAirDates, pct, timeAgo } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unwatched', label: 'Unwatched' },
  { value: 'watched', label: 'Watched' },
]

function SeasonList({ seasons, activeId, onSelect }) {
  return (
    <ul className="space-y-1.5">
      {seasons.map((s) => {
        const active = s.id === activeId
        const done = s.episodeCount > 0 && s.watchedCount === s.episodeCount
        return (
          <li key={s.id}>
            <button
              onClick={() => onSelect(s.id)}
              aria-current={active ? 'true' : undefined}
              className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                active ? 'border-fox-500/50 bg-fox-500/10' : 'border-transparent hover:border-ink-700 hover:bg-ink-800/70'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-sm font-medium ${active ? 'text-fox-300' : 'text-cream-100'}`}>{s.title}</span>
                {done && <CheckCheck className="size-4 shrink-0 text-chakra-400" aria-label="Season complete" />}
              </div>
              <div className="mt-1 flex justify-between text-xs text-cream-500">
                <span>
                  {s.episodeCount} episodes{s.specialCount ? ` · ${s.specialCount} special${s.specialCount > 1 ? 's' : ''}` : ''}
                </span>
                <span className="tabular-nums">{s.watchedCount}/{s.episodeCount}</span>
              </div>
              <div className="mt-2">
                <ProgressBar value={s.percent} size="sm" tone={done ? 'chakra' : 'fox'} label={`${s.title} progress`} />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Rows sit under their arc heading, so the arc is only repeated while searching.
function rowMeta(e, searching) {
  if (e.watched) return `Watched ${timeAgo(e.watchedAt)}${searching && e.arc ? ` · ${e.arc}` : ''}`
  if (e.kind === 'special') return 'Placed here in the watch order'
  return searching ? e.arc || 'Not watched yet' : 'Not watched yet'
}

/** Inserts arc headings whenever the arc changes, mirroring the PDF layout. */
function groupByArc(episodes) {
  const groups = []
  for (const e of episodes) {
    const arc = e.kind === 'special' ? groups.at(-1)?.arc ?? null : e.arc
    const last = groups.at(-1)
    if (last && (last.arc === arc || e.kind === 'special')) last.items.push(e)
    else groups.push({ arc, items: [e] })
  }
  return groups
}

export default function Browse() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const seriesId = params.get('series') || 'naruto'
  const status = params.get('status') || 'all'
  const [query, setQuery] = useState(params.get('q') || '')
  const q = useDebounce(query.trim(), 300)
  const [noteEpisode, setNoteEpisode] = useState(null)
  const [bulk, setBulk] = useState(null) // { watched: boolean }
  const [bulkBusy, setBulkBusy] = useState(false)

  const setParam = useCallback(
    (updates) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(updates)) {
            if (v == null || v === '' || (k === 'status' && v === 'all')) next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  useEffect(() => {
    if ((params.get('q') || '') !== q) setParam({ q })
  }, [q, params, setParam])

  const seriesState = useAsync(() => catalogApi.series(), [])
  const seasonsState = useAsync(() => catalogApi.seasons({ series: seriesId }), [seriesId])
  const seasons = useMemo(() => seasonsState.data?.seasons ?? [], [seasonsState.data])

  // Default to the first unfinished season of the selected series.
  const requestedSeason = params.get('season')
  const seasonId = useMemo(() => {
    if (!seasons.length) return null
    if (requestedSeason && seasons.some((s) => s.id === requestedSeason)) return requestedSeason
    return (seasons.find((s) => s.watchedCount < s.episodeCount) ?? seasons[0]).id
  }, [seasons, requestedSeason])
  const season = seasons.find((s) => s.id === seasonId)
  const seasonIndex = seasons.findIndex((s) => s.id === seasonId)

  const episodesState = useAsync(
    () => (seasonId ? catalogApi.seasonEpisodes(seasonId, { status, q: q || undefined }) : Promise.resolve({ episodes: [] })),
    [seasonId, status, q],
  )
  const episodes = episodesState.data?.episodes ?? []

  const { setData: setSeasonsData } = seasonsState
  const { setData: setEpisodesData } = episodesState
  const { setData: setSeriesData } = seriesState
  const onUpdated = useCallback(
    (updated, before) => {
      const delta = updated.watched === before.watched ? 0 : updated.watched ? 1 : -1
      setEpisodesData((d) => {
        if (!d) return d
        const keep = status === 'all' || (status === 'watched') === updated.watched
        const list = keep ? d.episodes.map((e) => (e.id === updated.id ? updated : e)) : d.episodes.filter((e) => e.id !== updated.id)
        return { ...d, episodes: list }
      })
      if (!delta) return
      const field = updated.kind === 'episode' ? 'watchedCount' : 'specialsWatched'
      const bump = (s) => {
        const next = { ...s, [field]: s[field] + delta }
        return { ...next, percent: next.episodeCount ? Math.round((next.watchedCount / next.episodeCount) * 1000) / 10 : 0 }
      }
      setSeasonsData((d) => d && { ...d, seasons: d.seasons.map((s) => (s.id === updated.season.id ? bump(s) : s)) })
      setSeriesData((d) => d && { ...d, series: d.series.map((s) => (s.id === updated.series.id ? bump(s) : s)) })
    },
    [status, setEpisodesData, setSeasonsData, setSeriesData],
  )
  const { toggle, isPending } = useWatchToggle(onUpdated)

  const onNoteChange = (note) => {
    const id = noteEpisode.id
    setEpisodesData((d) => d && { ...d, episodes: d.episodes.map((e) => (e.id === id ? { ...e, hasNotes: Boolean(note) } : e)) })
  }

  async function runBulk() {
    setBulkBusy(true)
    try {
      const res = await progressApi.setSeasonWatched(seasonId, bulk.watched)
      toast.success(`${season.title}: ${res.updated} entries marked ${bulk.watched ? 'watched' : 'unwatched'}`)
      setBulk(null)
      await Promise.all([seasonsState.reload({ silent: true }), episodesState.reload({ silent: true }), seriesState.reload({ silent: true })])
    } catch (err) {
      toast.error(parseApiError(err).message)
    } finally {
      setBulkBusy(false)
    }
  }

  const seriesOptions = (seriesState.data?.series ?? []).map((s) => ({ value: s.id, label: s.title.replace('Naruto: ', ''), count: undefined }))
  const groups = groupByArc(episodes)
  const filtersActive = status !== 'all' || q

  return (
    <div>
      <PageHeader eyebrow="Catalog" title="Browse Episodes">
        Seasons, arcs, movies and OVAs in the original watch order from your source lists.
      </PageHeader>

      {seriesState.error && !seriesState.data ? (
        <ErrorState error={seriesState.error} onRetry={seriesState.reload} />
      ) : (
        <>
          <div className="mb-5 overflow-x-auto">
            {seriesOptions.length > 0 && (
              <Segmented
                label="Series"
                options={seriesOptions}
                value={seriesId}
                onChange={(v) => setParam({ series: v, season: null })}
              />
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Season selection */}
            <aside className="hidden lg:block">
              <div className="card sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto p-2">
                {seasonsState.loading && !seasons.length ? (
                  <SkeletonRows rows={6} />
                ) : seasonsState.error ? (
                  <ErrorState error={seasonsState.error} onRetry={seasonsState.reload} />
                ) : (
                  <SeasonList seasons={seasons} activeId={seasonId} onSelect={(id) => setParam({ season: id })} />
                )}
              </div>
            </aside>

            <div className="min-w-0 space-y-4">
              <div className="lg:hidden">
                <Select label="Season" value={seasonId ?? ''} onChange={(v) => setParam({ season: v })}>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.watchedCount}/{s.episodeCount})
                    </option>
                  ))}
                </Select>
              </div>

              {season && (
                <div className="card p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fox-400">{season.series.title}</p>
                      <h2 className="mt-1 text-xl font-semibold">{season.title}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cream-500">
                        {season.airDates && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" /> {formatAirDates(season.airDates)}
                          </span>
                        )}
                        <span>{season.episodeCount} episodes</span>
                        {season.specialCount > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clapperboard className="size-3.5" /> {season.specialsWatched}/{season.specialCount} movies & OVAs
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button className="btn-secondary btn-sm" disabled={seasonIndex <= 0} onClick={() => setParam({ season: seasons[seasonIndex - 1].id })} aria-label="Previous season">
                        <ChevronLeft className="size-4" />
                      </button>
                      <button className="btn-secondary btn-sm" disabled={seasonIndex >= seasons.length - 1} onClick={() => setParam({ season: seasons[seasonIndex + 1].id })} aria-label="Next season">
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <ProgressBar value={season.percent} label="Season progress" />
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-cream-300">
                      {season.watchedCount}/{season.episodeCount} · {pct(season.percent)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {season.watchedCount + season.specialsWatched < season.episodeCount + season.specialCount && (
                      <button className="btn-secondary btn-sm" onClick={() => setBulk({ watched: true })}>
                        <CheckCheck className="size-3.5" /> Mark season watched
                      </button>
                    )}
                    {season.watchedCount + season.specialsWatched > 0 && (
                      <button className="btn-ghost btn-sm" onClick={() => setBulk({ watched: false })}>
                        <RotateCcw className="size-3.5" /> Reset season
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search by number, title or arc…"
                  label="Search episodes in this season"
                  className="flex-1"
                />
                <Segmented label="Watch status filter" options={STATUS_OPTIONS} value={status} onChange={(v) => setParam({ status: v })} />
              </div>

              {episodesState.error && !episodesState.data ? (
                <ErrorState error={episodesState.error} onRetry={episodesState.reload} />
              ) : (episodesState.loading && !episodesState.data) || !seasonId ? (
                <SkeletonRows rows={8} />
              ) : episodes.length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon={filtersActive ? SearchX : CheckCheck}
                    title={filtersActive ? 'No matching episodes' : 'Nothing here'}
                    action={
                      filtersActive && (
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setQuery('')
                            setParam({ status: 'all', q: null })
                          }}
                        >
                          Clear filters
                        </button>
                      )
                    }
                  >
                    {status === 'unwatched' && !q ? 'You have watched everything in this season.' : 'Try a different search or filter.'}
                  </EmptyState>
                </div>
              ) : (
                <div className={`space-y-5 transition-opacity ${episodesState.loading ? 'opacity-60' : ''}`}>
                  {groups.map((g, i) => (
                    <section key={`${g.arc}-${i}`}>
                      {g.arc && <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-cream-500">{g.arc}</h3>}
                      <ul className="space-y-2">
                        {g.items.map((e) => (
                          <EpisodeRow key={e.id} episode={e} onToggle={toggle} pending={isPending(e.id)} onNotes={setNoteEpisode} meta={rowMeta(e, Boolean(q))} />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {noteEpisode && <NoteEditorModal episode={noteEpisode} onClose={() => setNoteEpisode(null)} onChange={onNoteChange} />}
      <ConfirmDialog
        open={Boolean(bulk)}
        title={bulk?.watched ? 'Mark the whole season as watched?' : 'Reset this season?'}
        confirmLabel={bulk?.watched ? 'Mark watched' : 'Reset season'}
        danger={bulk && !bulk.watched}
        busy={bulkBusy}
        onCancel={() => setBulk(null)}
        onConfirm={runBulk}
      >
        {bulk?.watched
          ? `Every episode, movie and OVA in ${season?.title} will be marked as watched.`
          : `All watch progress in ${season?.title} will be cleared. Your notes are kept.`}
      </ConfirmDialog>
    </div>
  )
}
