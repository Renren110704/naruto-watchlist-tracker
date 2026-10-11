import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard, Eye, NotebookPen, ScrollText } from 'lucide-react'
import { SPECIAL_LABELS, episodeContext, timeAgo } from '../utils/format'
import { Spinner } from './States'

export function EpisodeNumberBadge({ episode, className = '' }) {
  const base = `grid size-11 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold transition ${className}`
  if (episode.kind === 'special') {
    return (
      <span className={`${base} ${episode.watched ? 'bg-chakra-500/15 text-chakra-400' : 'bg-leaf-500/12 text-leaf-400'}`}>
        <Clapperboard className="size-5" aria-hidden="true" />
      </span>
    )
  }
  return (
    <span
      className={`${base} ${episode.watched ? 'bg-chakra-500/15 text-chakra-400' : 'bg-ink-700/70 text-cream-300'}`}
      aria-hidden="true"
    >
      {episode.episodeNumber}
    </span>
  )
}

export function SpecialBadge({ episode }) {
  if (episode.kind !== 'special') return null
  return <span className="chip border-leaf-500/30 bg-leaf-500/10 text-leaf-400">{SPECIAL_LABELS[episode.specialType] || 'Special'}</span>
}

export function NotesBadge({ episode }) {
  if (!episode.hasNotes) return null
  return (
    <span className="chip border-fox-500/30 bg-fox-500/10 text-fox-400" title="You have notes for this episode">
      <ScrollText className="size-3" /> Notes
    </span>
  )
}

const TOMOE_ANGLES = [0, 120, 240]

/** Watched-state icon: a red three-tomoe eye. `spin` plays the one-off awakening spin. */
function Sharingan({ className = '', spin = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${spin ? 'animate-sharingan' : ''}`} aria-hidden="true">
      <circle cx="12" cy="12" r="10.2" fill="#c1121f" stroke="#1a0508" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5.6" fill="none" stroke="#1a0508" strokeOpacity="0.5" strokeWidth="0.7" />
      <circle cx="12" cy="12" r="2.3" fill="#1a0508" />
      {TOMOE_ANGLES.map((angle) => (
        <g key={angle} transform={`rotate(${angle} 12 12)`} fill="#1a0508">
          <circle cx="12" cy="6.4" r="1.9" />
          <path d="M12 4.5C10.2 4.3 8.6 5.2 7.7 6.9c1.2-.9 2.2-1 2.5 0z" />
        </g>
      ))}
    </svg>
  )
}

export function WatchButton({ episode, pending, onToggle, size = 'md' }) {
  const watched = episode.watched
  const sm = size === 'sm'
  // Icon-only button: the aria-label and title below carry the text.
  const iconSize = sm ? 'size-5' : 'size-6'
  // Only spin when this click turned the eye on, not for episodes that load already watched.
  const [awakened, setAwakened] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        setAwakened(!watched)
        onToggle(episode)
      }}
      disabled={pending}
      aria-pressed={watched}
      aria-label={watched ? `Mark ${episode.label} as unwatched` : `Mark ${episode.label} as watched`}
      title={watched ? 'Click to mark as unwatched' : 'Mark as watched'}
      className={`btn ${sm ? 'btn-sm' : ''} border ${
        watched
          ? 'border-chakra-500/40 bg-chakra-500/15 text-chakra-400 hover:border-leaf-500/40 hover:bg-leaf-500/10 hover:text-leaf-400'
          : 'border-ink-600 bg-ink-800 text-cream-300 hover:border-fox-500/60 hover:text-fox-400'
      }`}
    >
      {pending ? (
        <Spinner className={iconSize} />
      ) : watched ? (
        <Sharingan className={iconSize} spin={awakened} />
      ) : (
        <Eye className={iconSize} aria-hidden="true" />
      )}
    </button>
  )
}

export function NotesButton({ episode, onClick, compact = false }) {
  const label = episode.hasNotes ? 'Episode Recap' : 'Add Episode Notes'
  return (
    <button
      type="button"
      onClick={() => onClick(episode)}
      className="btn-ghost btn-sm border border-transparent hover:border-ink-600"
      aria-label={`${label}: ${episode.label}`}
    >
      <NotebookPen className="size-3.5" />
      <span className={compact ? 'hidden lg:inline' : 'hidden sm:inline'}>{label}</span>
    </button>
  )
}

/** A single episode line used in the browser, tracker and dashboard lists. */
export function EpisodeRow({ episode, onToggle, pending, onNotes, showSeries = false, showSeason = false, meta }) {
  return (
    <li
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition sm:gap-4 sm:px-4 ${
        episode.watched
          ? 'border-chakra-500/15 bg-chakra-500/[0.04] hover:border-chakra-500/30'
          : 'border-ink-700/60 bg-ink-850/60 hover:border-ink-600 hover:bg-ink-800/70'
      }`}
    >
      <EpisodeNumberBadge episode={episode} />
      <Link to={`/episodes/${episode.id}`} className="min-w-0 flex-1 rounded-md">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`truncate font-medium ${episode.watched ? 'text-cream-300' : 'text-cream-50'} group-hover:text-fox-300`}>
            {episode.label}
          </span>
          <SpecialBadge episode={episode} />
          <NotesBadge episode={episode} />
        </div>
        <p className="mt-0.5 truncate text-xs text-cream-500">
          {meta ?? episodeContext(episode, { series: showSeries, season: showSeason }) ?? ''}
          {!meta && episode.watched && episode.watchedAt && (
            <span className="hidden text-chakra-400/80 sm:inline"> · watched {timeAgo(episode.watchedAt)}</span>
          )}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-1.5">
        {onNotes && <NotesButton episode={episode} onClick={onNotes} compact />}
        {onToggle && <WatchButton episode={episode} pending={pending} onToggle={onToggle} size="sm" />}
      </div>
    </li>
  )
}
