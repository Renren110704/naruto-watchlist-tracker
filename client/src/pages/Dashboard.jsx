import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, CheckCircle2, Clapperboard, Hourglass, Layers, NotebookText, Play, ScrollText } from 'lucide-react'
import { EpisodeRow, NotesButton, SpecialBadge, WatchButton } from '../components/Episode'
import { NoteEditorModal } from '../components/NoteEditorModal'
import { ProgressBar, ProgressRing } from '../components/Progress'
import { RankCard } from '../components/Rank'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useWatchToggle } from '../hooks/useWatchToggle'
import { progressApi } from '../services/endpoints'
import { episodeContext, pct, timeAgo } from '../utils/format'

function StatCard({ icon: Icon, label, value, hint, tone = 'fox' }) {
  const tones = {
    fox: 'bg-fox-500/12 text-fox-400',
    chakra: 'bg-chakra-500/12 text-chakra-400',
    leaf: 'bg-leaf-500/12 text-leaf-400',
    cream: 'bg-ink-700 text-cream-300',
  }
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-[18px]" />
        </span>
        <p className="text-sm text-cream-500">{label}</p>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-cream-50 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-cream-500">{hint}</p>}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: stats, error, loading, reload } = useAsync(() => progressApi.stats(), [])
  const [noteEpisode, setNoteEpisode] = useState(null)

  const refresh = useCallback(() => reload({ silent: true }), [reload])
  const { toggle, isPending } = useWatchToggle(refresh)

  if (loading && !stats) return <LoadingState label="Gathering your progress…" />
  if (error && !stats) return <ErrorState error={error} onRetry={reload} />

  const { overall, series, continueWatching: next, upNext, recent, notesCount } = stats
  const started = overall.watched > 0 || overall.specialsWatched > 0

  return (
    <div className="space-y-6 sm:space-y-8">
      <header>
        <p className="text-sm text-cream-500">{greeting()},</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          {started ? 'Welcome back' : 'Welcome'}, <span className="text-fox-400">{user.username}</span>
        </h1>
      </header>

      <RankCard watched={overall.watched} total={overall.total} />

      {/* Overview */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="card flex min-w-0 flex-col items-center gap-5 p-6 sm:flex-row lg:flex-col">
          <div className="shrink-0">
            <ProgressRing value={overall.percent} size={148}>
              <div>
                <p className="font-display text-3xl font-semibold text-cream-50">{pct(overall.percent)}</p>
                <p className="text-xs text-cream-500">complete</p>
              </div>
            </ProgressRing>
          </div>
          <div className="w-full min-w-0 flex-1 space-y-3">
            {series.map((s) => (
              <div key={s.id}>
                <div className="mb-1.5 flex justify-between gap-2 text-sm">
                  <span className="truncate text-cream-300">{s.title}</span>
                  <span className="shrink-0 tabular-nums text-cream-500">
                    {s.watched}/{s.total}
                  </span>
                </div>
                <ProgressBar value={s.percent} size="sm" label={`${s.title} progress`} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard icon={Layers} label="Total episodes" value={overall.total.toLocaleString()} hint={`+ ${overall.specialsTotal} movies & OVAs`} tone="cream" />
          <StatCard icon={CheckCircle2} label="Watched" value={overall.watched.toLocaleString()} hint={`${overall.specialsWatched} movies & OVAs watched`} tone="chakra" />
          <StatCard icon={Hourglass} label="Remaining" value={overall.remaining.toLocaleString()} hint={overall.remaining ? `${overall.specialsTotal - overall.specialsWatched} movies & OVAs to go` : 'Every episode watched!'} tone="leaf" />
          <StatCard icon={ScrollText} label="Episode notes" value={notesCount} hint={notesCount ? 'Keep the journal going' : 'Write your first recap'} />
        </div>
      </section>

      {/* Continue watching */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card relative overflow-hidden p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-fox-500/10 blur-2xl" />
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-fox-400">
            <Play className="size-3.5 fill-current" /> {started ? 'Continue watching' : 'Start your journey'}
          </p>
          {next ? (
            <div className="relative mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/episodes/${next.id}`} className="font-display text-2xl font-semibold text-cream-50 hover:text-fox-300 sm:text-3xl">
                  {next.label}
                </Link>
                <SpecialBadge episode={next} />
              </div>
              <p className="mt-1 text-sm text-cream-500">{episodeContext(next, { series: true, season: true })}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <WatchButton episode={next} pending={isPending(next.id)} onToggle={toggle} />
                <NotesButton episode={next} onClick={setNoteEpisode} />
                <Link to={`/episodes/${next.id}`} className="btn-ghost">
                  Details <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState icon={CheckCircle2} title="You've watched everything!" className="py-6">
              Every episode, movie and OVA in the catalog is marked as watched.
            </EmptyState>
          )}
          {upNext.length > 1 && (
            <div className="relative mt-6 border-t border-ink-700/70 pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream-500">Up next</p>
              <ul className="flex flex-wrap gap-2">
                {upNext.slice(1).map((e) => (
                  <li key={e.id}>
                    <Link to={`/episodes/${e.id}`} className="chip border-ink-600 bg-ink-800 py-1 text-cream-300 hover:border-fox-500/50 hover:text-fox-300">
                      {e.kind === 'special' && <Clapperboard className="size-3" />}
                      <span className="max-w-48 truncate">{e.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="grid gap-3">
          {[
            { to: '/browse', icon: Clapperboard, title: 'Browse seasons', text: '33 seasons across three series' },
            { to: '/tracker', icon: BarChart3, title: 'View tracker', text: 'Season-by-season progress' },
            { to: '/notes', icon: NotebookText, title: 'My notes', text: 'Recaps, characters & jutsu' },
          ].map(({ to, icon: Icon, title, text }) => (
            <Link key={to} to={to} className="card card-hover group flex items-center gap-4 p-4">
              <span className="grid size-10 place-items-center rounded-xl bg-ink-700/70 text-fox-400 transition group-hover:bg-fox-500/15">
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-cream-50">{title}</span>
                <span className="block text-xs text-cream-500">{text}</span>
              </span>
              <ArrowRight className="size-4 text-cream-500 transition group-hover:translate-x-0.5 group-hover:text-fox-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Recently watched */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recently watched</h2>
          {recent.length > 0 && (
            <Link to="/tracker?tab=watched" className="text-sm font-medium text-fox-400 hover:text-fox-300">
              View all
            </Link>
          )}
        </div>
        {recent.length ? (
          <ul className="space-y-2">
            {recent.map((e) => (
              <EpisodeRow
                key={e.id}
                episode={e}
                onToggle={toggle}
                pending={isPending(e.id)}
                onNotes={setNoteEpisode}
                meta={`${e.series.title} · ${e.season.title} · ${timeAgo(e.watchedAt)}`}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Clapperboard}
            title="Nothing watched yet"
            action={
              <Link to="/browse" className="btn-primary">
                Browse episodes
              </Link>
            }
          >
            Mark an episode as watched and it will show up here.
          </EmptyState>
        )}
      </section>

      {noteEpisode && <NoteEditorModal episode={noteEpisode} onClose={() => setNoteEpisode(null)} onChange={refresh} />}
    </div>
  )
}
