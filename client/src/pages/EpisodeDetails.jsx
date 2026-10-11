import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Clapperboard, FileText, NotebookPen, Pencil, Trash2 } from 'lucide-react'
import { SpecialBadge, WatchButton } from '../components/Episode'
import { ConfirmDialog } from '../components/Modal'
import { NoteEditorModal } from '../components/NoteEditorModal'
import { NoteView } from '../components/NoteView'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useWatchToggle } from '../hooks/useWatchToggle'
import { parseApiError } from '../services/api'
import { catalogApi, notesApi } from '../services/endpoints'
import { SPECIAL_LABELS, formatDate } from '../utils/format'
import NotFound from './NotFound'

function NeighbourLink({ episode, direction }) {
  if (!episode) return <span />
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <Link
      to={`/episodes/${episode.id}`}
      className={`card card-hover flex min-w-0 items-center gap-2 p-3 text-sm ${direction === 'next' ? 'justify-end text-right' : ''}`}
    >
      {direction === 'prev' && <Icon className="size-4 shrink-0 text-cream-500" />}
      <span className="min-w-0">
        <span className="block text-xs text-cream-500">{direction === 'prev' ? 'Previous' : 'Next'}</span>
        <span className="block truncate font-medium text-cream-100">{episode.label}</span>
      </span>
      {direction === 'next' && <Icon className="size-4 shrink-0 text-cream-500" />}
    </Link>
  )
}

export default function EpisodeDetails() {
  const { episodeId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, error, loading, reload, setData } = useAsync(() => catalogApi.episode(episodeId), [episodeId])
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { toggle, isPending } = useWatchToggle((updated) => setData((d) => d && { ...d, episode: { ...updated } }))

  if (loading && !data) return <LoadingState />
  if (error?.status === 404 || error?.status === 422) return <NotFound message="That episode isn't in the catalog." />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  const { episode, note, previous, next } = data
  const facts = [
    ['Series', episode.series.title],
    ['Season', episode.season.title],
    episode.kind === 'episode' ? ['Episode', `#${episode.episodeNumber}`] : ['Type', SPECIAL_LABELS[episode.specialType]],
    ['Arc', episode.arc || (episode.kind === 'special' ? 'Between arcs (watch order)' : '—')],
  ]

  async function handleDelete() {
    setDeleting(true)
    try {
      await notesApi.remove(episode.id)
      setData((d) => ({ ...d, note: null, episode: { ...d.episode, hasNotes: false } }))
      setConfirmDelete(false)
      toast.success('Notes deleted')
    } catch (err) {
      toast.error(parseApiError(err).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/browse'))} className="btn-ghost -ml-3 px-3">
        <ArrowLeft className="size-4" /> Back
      </button>

      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-fox-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fox-400">
              <Link to={`/browse?series=${episode.series.id}&season=${episode.season.id}`} className="hover:text-fox-300">
                {episode.series.title} · {episode.season.title}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {episode.kind === 'special' && <Clapperboard className="size-7 text-leaf-400" />}
              <h1 className="text-3xl font-semibold sm:text-4xl">{episode.label}</h1>
              <SpecialBadge episode={episode} />
            </div>
            {episode.arc && <p className="mt-2 text-cream-300">{episode.arc}</p>}
            {episode.watched && episode.watchedAt && (
              <p className="mt-2 text-sm text-chakra-400">Watched on {formatDate(episode.watchedAt, { dateStyle: 'medium' })}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <WatchButton episode={episode} pending={isPending(episode.id)} onToggle={toggle} />
            <button className="btn-primary" onClick={() => setEditing(true)}>
              {note ? <Pencil className="size-4" /> : <NotebookPen className="size-4" />}
              {note ? 'Edit notes' : 'Add Episode Notes'}
            </button>
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-4 border-t border-ink-700/70 pt-5 sm:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-cream-500">{k}</dt>
              <dd className="mt-1 truncate text-sm font-medium text-cream-100" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        {episode.kind === 'episode' && !episode.title && (
          <p className="relative mt-4 text-xs text-cream-500">
            Your source lists track episodes by number and arc, so no official episode title is shown.
          </p>
        )}
      </header>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="size-5 text-fox-400" /> My episode notes
          </h2>
          {note && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-cream-500">Updated {formatDate(note.updatedAt)}</span>
              <Link to={`/episodes/${episode.id}/notes`} className="btn-secondary btn-sm">
                <Pencil className="size-3.5" /> Open editor
              </Link>
              <button className="btn-ghost btn-sm text-leaf-400" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
        {note ? (
          <NoteView note={note} />
        ) : (
          <div className="card">
            <EmptyState
              icon={NotebookPen}
              title="No notes yet"
              action={
                <button className="btn-primary" onClick={() => setEditing(true)}>
                  <NotebookPen className="size-4" /> What did you learn?
                </button>
              }
            >
              Write a recap, log the characters who showed up and any new jutsu. Everything stays private to you.
            </EmptyState>
          </div>
        )}
      </section>

      <nav className="grid grid-cols-2 gap-3" aria-label="Adjacent episodes">
        <NeighbourLink episode={previous} direction="prev" />
        <NeighbourLink episode={next} direction="next" />
      </nav>

      {editing && (
        <NoteEditorModal
          episode={{ ...episode, hasNotes: Boolean(note) }}
          onClose={() => setEditing(false)}
          onChange={(saved) => setData((d) => ({ ...d, note: saved, episode: { ...d.episode, hasNotes: Boolean(saved) } }))}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete these notes?"
        danger
        busy={deleting}
        confirmLabel="Delete notes"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      >
        Your recap, characters and jutsu for <strong className="text-cream-50">{episode.label}</strong> will be permanently removed.
      </ConfirmDialog>
    </div>
  )
}
