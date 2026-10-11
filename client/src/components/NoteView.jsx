import { BookOpen, Flame, Lightbulb, Users } from 'lucide-react'
import { CHARACTER_TYPES, JUTSU_TYPES } from '../utils/noteOptions'
import { StarRating } from './StarRating'

const typeLabel = (list, v) => list.find((t) => t.value === v)?.label ?? v

function Block({ label, text }) {
  if (!text) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-cream-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-cream-100">{text}</dd>
    </div>
  )
}

function Group({ icon: Icon, title, children, empty }) {
  return (
    <section className="card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <Icon className="size-4 text-fox-400" /> {title}
      </h3>
      {children || <p className="text-sm text-cream-500">{empty}</p>}
    </section>
  )
}

/** Read-only rendering of a saved note on the episode details page. */
export function NoteView({ note }) {
  const story = note.summary || note.importantEvents || note.favoriteScene || note.personalNotes
  const learning = note.newAbilities || note.lore || note.relationships || note.openQuestions

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Group icon={BookOpen} title="Story notes" empty="No story notes written.">
        {story && (
          <dl className="space-y-4">
            <Block label="Summary / recap" text={note.summary} />
            <Block label="Important events" text={note.importantEvents} />
            <Block label="Favorite scene" text={note.favoriteScene} />
            <Block label="Personal notes" text={note.personalNotes} />
          </dl>
        )}
      </Group>

      <Group icon={Lightbulb} title="What I learned" empty="Nothing recorded here yet.">
        {(learning || note.rating) && (
          <dl className="space-y-4">
            {note.rating && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-cream-500">My rating</dt>
                <dd className="mt-1"><StarRating value={note.rating} readOnly /></dd>
              </div>
            )}
            <Block label="New abilities or techniques" text={note.newAbilities} />
            <Block label="Lore & world-building" text={note.lore} />
            <Block label="Relationships & development" text={note.relationships} />
            <Block label="Unanswered questions" text={note.openQuestions} />
          </dl>
        )}
      </Group>

      <Group icon={Users} title={`Characters (${note.characters.length})`} empty="No characters recorded.">
        {note.characters.length > 0 && (
          <ul className="space-y-3">
            {note.characters.map((c) => (
              <li key={c.id} className="rounded-xl border border-ink-700/70 bg-ink-900/40 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-cream-50">{c.name}</span>
                  <span className="chip border-fox-500/30 bg-fox-500/10 text-fox-400">{typeLabel(CHARACTER_TYPES, c.status)}</span>
                </div>
                {c.affiliation && <p className="mt-1 text-xs text-cream-500">{c.affiliation}</p>}
                {c.description && <p className="mt-2 whitespace-pre-line text-sm text-cream-300">{c.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Group>

      <Group icon={Flame} title={`Jutsu (${note.jutsu.length})`} empty="No jutsu recorded.">
        {note.jutsu.length > 0 && (
          <ul className="space-y-3">
            {note.jutsu.map((j) => (
              <li key={j.id} className="rounded-xl border border-ink-700/70 bg-ink-900/40 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-cream-50">{j.name}</span>
                  <span className={`chip ${j.status === 'new' ? 'border-leaf-500/30 bg-leaf-500/10 text-leaf-400' : 'border-ink-600 bg-ink-800 text-cream-300'}`}>
                    {typeLabel(JUTSU_TYPES, j.status)}
                  </span>
                </div>
                {(j.category || j.usedBy) && (
                  <p className="mt-1 text-xs text-cream-500">{[j.category, j.usedBy && `used by ${j.usedBy}`].filter(Boolean).join(' · ')}</p>
                )}
                {j.description && <p className="mt-2 whitespace-pre-line text-sm text-cream-300">{j.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </Group>
    </div>
  )
}
