import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flame, NotebookPen, SearchX, Users } from 'lucide-react'
import { PageHeader, SearchInput, Select } from '../components/Controls'
import { SpecialBadge } from '../components/Episode'
import { StarRating } from '../components/StarRating'
import { EmptyState, ErrorState, SkeletonRows } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { useDebounce } from '../hooks/useDebounce'
import { notesApi } from '../services/endpoints'
import { formatDate } from '../utils/format'

const PAGE_SIZE = 12

function Chips({ icon: Icon, items, tone }) {
  if (!items.length) return null
  const shown = items.slice(0, 4)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Icon className={`size-3.5 ${tone}`} aria-hidden="true" />
      {shown.map((it) => (
        <span key={it.id} className="chip border-ink-600 bg-ink-800 text-cream-300">
          {it.name}
        </span>
      ))}
      {items.length > shown.length && <span className="text-xs text-cream-500">+{items.length - shown.length} more</span>}
    </div>
  )
}

function NoteCard({ note }) {
  const navigate = useNavigate()
  const e = note.episode
  const open = () => navigate(`/episodes/${e.id}`)
  return (
    <li>
      <article
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(ev) => ev.key === 'Enter' && open()}
        className="card card-hover flex h-full cursor-pointer flex-col gap-3 p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-fox-400">
              {e.series.title} · {e.season.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold">{e.label}</h2>
              <SpecialBadge episode={e} />
            </div>
            {e.arc && <p className="truncate text-xs text-cream-500">{e.arc}</p>}
          </div>
          <StarRating value={note.rating} readOnly size="sm" />
        </header>
        {note.summary && <p className="line-clamp-3 text-sm text-cream-300">{note.summary}</p>}
        <div className="space-y-2">
          <Chips icon={Users} items={note.characters} tone="text-fox-400" />
          <Chips icon={Flame} items={note.jutsu} tone="text-leaf-400" />
        </div>
        <footer className="mt-auto flex items-center justify-between border-t border-ink-700/60 pt-3 text-xs text-cream-500">
          <span>Updated {formatDate(note.updatedAt)}</span>
          <Link to={`/episodes/${e.id}/notes`} onClick={(ev) => ev.stopPropagation()} className="font-medium text-fox-400 hover:text-fox-300">
            Edit
          </Link>
        </footer>
      </article>
    </li>
  )
}

export default function MyNotes() {
  const [query, setQuery] = useState('')
  const q = useDebounce(query.trim(), 300)
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const { data, error, loading, reload } = useAsync(
    () => notesApi.list({ q: q || undefined, sort, page, limit: PAGE_SIZE }),
    [q, sort, page],
  )

  const notes = data?.notes ?? []
  const pagination = data?.pagination

  return (
    <div>
      <PageHeader eyebrow="Journal" title="My Notes">
        Every recap you&apos;ve written. Search by episode, character or jutsu.
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={query}
          onChange={(v) => {
            setQuery(v)
            setPage(1)
          }}
          placeholder="Search episode, character or jutsu…"
          label="Search notes"
          className="flex-1"
        />
        <Select
          label="Sort notes"
          value={sort}
          onChange={(v) => {
            setSort(v)
            setPage(1)
          }}
          className="sm:w-52"
        >
          <option value="updated">Recently updated</option>
          <option value="order">Watch order</option>
          <option value="rating">Highest rated</option>
        </Select>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <SkeletonRows rows={4} />
      ) : notes.length === 0 ? (
        <div className="card">
          {q ? (
            <EmptyState icon={SearchX} title="No notes match your search">
              Try an episode number, a character&apos;s name or a jutsu.
            </EmptyState>
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="Your journal is empty"
              action={
                <Link to="/browse" className="btn-primary">
                  Find an episode
                </Link>
              }
            >
              Open any episode and choose &ldquo;Add Episode Notes&rdquo; to write your first recap.
            </EmptyState>
          )}
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-cream-500">
            {pagination.total} note{pagination.total === 1 ? '' : 's'}
          </p>
          <ul className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </ul>
          {pagination.totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
              <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="size-4" /> Previous
              </button>
              <span className="text-sm text-cream-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button className="btn-secondary btn-sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
