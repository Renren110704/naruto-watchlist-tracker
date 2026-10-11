import { useId, useMemo, useState } from 'react'
import { BookOpen, Flame, Lightbulb, Plus, Save, Trash2, Users } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { parseApiError } from '../services/api'
import { notesApi } from '../services/endpoints'
import { episodeContext } from '../utils/format'
import { Field } from './Controls'
import { ConfirmDialog } from './Modal'
import { StarRating } from './StarRating'
import { Spinner } from './States'
import { SpecialBadge } from './Episode'
import { CHARACTER_TYPES, JUTSU_CATEGORIES, JUTSU_TYPES } from '../utils/noteOptions'


const TEXT_FIELDS = ['summary', 'importantEvents', 'favoriteScene', 'personalNotes', 'newAbilities', 'lore', 'relationships', 'openQuestions']
const LIMITS = { text: 5000, name: 100, jutsuName: 120, short: 100, description: 2000 }

let tempId = 0
const newCharacter = () => ({ _key: `c${++tempId}`, name: '', status: 'introduced', affiliation: '', description: '' })
const newJutsu = () => ({ _key: `j${++tempId}`, name: '', category: '', usedBy: '', description: '', status: 'new' })

function fromNote(note) {
  const base = Object.fromEntries(TEXT_FIELDS.map((f) => [f, note?.[f] ?? '']))
  return {
    ...base,
    rating: note?.rating ?? null,
    characters: (note?.characters ?? []).map((c) => ({ ...c, _key: c.id })),
    jutsu: (note?.jutsu ?? []).map((j) => ({ ...j, _key: j.id })),
  }
}

function toPayload(form) {
  const strip = ({ _key, id, ...rest }) => rest // eslint-disable-line no-unused-vars
  return {
    ...Object.fromEntries(TEXT_FIELDS.map((f) => [f, form[f].trim()])),
    rating: form.rating,
    characters: form.characters.map(strip).map((c) => ({ ...c, name: c.name.trim() })),
    jutsu: form.jutsu.map(strip).map((j) => ({ ...j, name: j.name.trim() })),
  }
}

function validate(form) {
  const errors = {}
  for (const f of TEXT_FIELDS) if (form[f].length > LIMITS.text) errors[f] = `Keep this under ${LIMITS.text} characters`
  form.characters.forEach((c, i) => {
    if (!c.name.trim()) errors[`characters[${i}].name`] = 'Character name is required'
    else if (c.name.length > LIMITS.name) errors[`characters[${i}].name`] = 'Name is too long'
    if (c.affiliation.length > LIMITS.short) errors[`characters[${i}].affiliation`] = 'Too long'
    if (c.description.length > LIMITS.description) errors[`characters[${i}].description`] = 'Too long'
  })
  form.jutsu.forEach((j, i) => {
    if (!j.name.trim()) errors[`jutsu[${i}].name`] = 'Jutsu name is required'
    else if (j.name.length > LIMITS.jutsuName) errors[`jutsu[${i}].name`] = 'Name is too long'
    if (j.description.length > LIMITS.description) errors[`jutsu[${i}].description`] = 'Too long'
  })
  const empty = TEXT_FIELDS.every((f) => !form[f].trim()) && !form.characters.length && !form.jutsu.length && !form.rating
  if (empty) errors._form = 'Add at least one note, character, jutsu or rating before saving.'
  return errors
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-fox-500/12 text-fox-400">
          <Icon className="size-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-cream-500">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 sm:pl-11">{children}</div>
    </section>
  )
}

function TextArea({ id, value, onChange, error, rows = 3, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input resize-y ${error ? 'input-error' : ''}`}
      aria-invalid={Boolean(error)}
      {...props}
    />
  )
}

/**
 * The "What Did You Learn?" form. Used inside the notes modal and on the dedicated
 * /episodes/:id/notes page. Creates (POST) or updates (PUT) the user's notes.
 */
export function NoteEditor({ episode, note, onSaved, onCancel, onDeleted }) {
  const toast = useToast()
  const uid = useId()
  const initial = useMemo(() => fromNote(note), [note])
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(null) // 'delete' | 'discard'
  const [deleting, setDeleting] = useState(false)
  const isEdit = Boolean(note)
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(initial))

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }))
  const setItem = (list, index, field) => (value) =>
    setForm((f) => ({ ...f, [list]: f[list].map((it, i) => (i === index ? { ...it, [field]: value } : it)) }))
  const removeItem = (list, index) => setForm((f) => ({ ...f, [list]: f[list].filter((_, i) => i !== index) }))
  const addItem = (list, factory) => setForm((f) => ({ ...f, [list]: [...f[list], factory()] }))

  async function handleSubmit(e) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length) {
      toast.error(v._form || 'Please fix the highlighted fields.')
      return
    }
    setSaving(true)
    try {
      const payload = toPayload(form)
      const res = isEdit ? await notesApi.update(episode.id, payload) : await notesApi.create(episode.id, payload)
      toast.success(isEdit ? 'Notes updated' : 'Notes saved')
      onSaved?.(res.note)
    } catch (err) {
      const { message, details } = parseApiError(err)
      setErrors(details)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await notesApi.remove(episode.id)
      toast.success('Notes deleted')
      setConfirm(null)
      onDeleted?.()
    } catch (err) {
      toast.error(parseApiError(err).message)
    } finally {
      setDeleting(false)
    }
  }

  const fid = (name) => `${uid}-${name}`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Episode information (read-only) */}
      <div className="rounded-xl border border-ink-700/70 bg-ink-900/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fox-400">Episode</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-display text-lg font-semibold text-cream-50">{episode.label}</span>
          <SpecialBadge episode={episode} />
        </div>
        <p className="mt-0.5 text-sm text-cream-500">{episodeContext(episode, { series: true, season: true })}</p>
      </div>

      {errors._form && (
        <p className="rounded-lg border border-leaf-500/40 bg-leaf-500/10 px-3 py-2 text-sm text-leaf-400" role="alert">
          {errors._form}
        </p>
      )}

      <Section icon={BookOpen} title="Story notes" description="Your recap of what happened.">
        <Field label="Episode summary / personal recap" htmlFor={fid('summary')} error={errors.summary}>
          <TextArea id={fid('summary')} value={form.summary} onChange={set('summary')} error={errors.summary} rows={4} placeholder="In your own words…" />
        </Field>
        <Field label="Important events" htmlFor={fid('importantEvents')} error={errors.importantEvents}>
          <TextArea id={fid('importantEvents')} value={form.importantEvents} onChange={set('importantEvents')} error={errors.importantEvents} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Favorite scene" htmlFor={fid('favoriteScene')} error={errors.favoriteScene}>
            <TextArea id={fid('favoriteScene')} value={form.favoriteScene} onChange={set('favoriteScene')} error={errors.favoriteScene} />
          </Field>
          <Field label="Additional personal notes" htmlFor={fid('personalNotes')} error={errors.personalNotes}>
            <TextArea id={fid('personalNotes')} value={form.personalNotes} onChange={set('personalNotes')} error={errors.personalNotes} />
          </Field>
        </div>
      </Section>

      <Section
        icon={Users}
        title="Character tracking"
        description="Who was introduced? Was a previously unknown character revealed? What did you learn about someone you already know?"
      >
        {form.characters.length === 0 && <p className="text-sm text-cream-500">No characters added yet.</p>}
        {form.characters.map((c, i) => (
          <div key={c._key} className="animate-fade-in space-y-3 rounded-xl border border-ink-700/70 bg-ink-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-cream-500">Character {i + 1}</span>
              <button type="button" onClick={() => removeItem('characters', i)} className="btn-ghost btn-sm text-leaf-400" aria-label={`Remove character ${i + 1}`}>
                <Trash2 className="size-3.5" /> Remove
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Character name *" htmlFor={fid(`c${i}name`)} error={errors[`characters[${i}].name`]}>
                <input id={fid(`c${i}name`)} className={`input ${errors[`characters[${i}].name`] ? 'input-error' : ''}`} value={c.name} maxLength={LIMITS.name} onChange={(e) => setItem('characters', i, 'name')(e.target.value)} />
              </Field>
              <Field label="What kind of entry?" htmlFor={fid(`c${i}status`)}>
                <select id={fid(`c${i}status`)} className="input" value={c.status} onChange={(e) => setItem('characters', i, 'status')(e.target.value)}>
                  {CHARACTER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Role or affiliation" htmlFor={fid(`c${i}aff`)} error={errors[`characters[${i}].affiliation`]} className="md:col-span-2">
                <input id={fid(`c${i}aff`)} className="input" value={c.affiliation} maxLength={LIMITS.short} placeholder="If known" onChange={(e) => setItem('characters', i, 'affiliation')(e.target.value)} />
              </Field>
              <Field label="Description or observations" htmlFor={fid(`c${i}desc`)} error={errors[`characters[${i}].description`]} className="md:col-span-2">
                <TextArea id={fid(`c${i}desc`)} rows={2} value={c.description} onChange={setItem('characters', i, 'description')} maxLength={LIMITS.description} />
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn-secondary btn-sm" onClick={() => addItem('characters', newCharacter)} disabled={form.characters.length >= 50}>
          <Plus className="size-3.5" /> Add character
        </button>
      </Section>

      <Section icon={Flame} title="Jutsu & abilities" description="New techniques — or familiar ones used in a new way.">
        {form.jutsu.length === 0 && <p className="text-sm text-cream-500">No jutsu added yet.</p>}
        {form.jutsu.map((j, i) => (
          <div key={j._key} className="animate-fade-in space-y-3 rounded-xl border border-ink-700/70 bg-ink-900/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-cream-500">Jutsu {i + 1}</span>
              <button type="button" onClick={() => removeItem('jutsu', i)} className="btn-ghost btn-sm text-leaf-400" aria-label={`Remove jutsu ${i + 1}`}>
                <Trash2 className="size-3.5" /> Remove
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Jutsu name *" htmlFor={fid(`j${i}name`)} error={errors[`jutsu[${i}].name`]}>
                <input id={fid(`j${i}name`)} className={`input ${errors[`jutsu[${i}].name`] ? 'input-error' : ''}`} value={j.name} maxLength={LIMITS.jutsuName} onChange={(e) => setItem('jutsu', i, 'name')(e.target.value)} />
              </Field>
              <Field label="Type or category" htmlFor={fid(`j${i}cat`)}>
                <input id={fid(`j${i}cat`)} className="input" list={fid('jutsu-cats')} value={j.category} maxLength={LIMITS.short} placeholder="If known" onChange={(e) => setItem('jutsu', i, 'category')(e.target.value)} />
              </Field>
              <Field label="Used by" htmlFor={fid(`j${i}by`)}>
                <input id={fid(`j${i}by`)} className="input" value={j.usedBy} maxLength={LIMITS.short} onChange={(e) => setItem('jutsu', i, 'usedBy')(e.target.value)} />
              </Field>
              <Field label="New or known?" htmlFor={fid(`j${i}status`)}>
                <select id={fid(`j${i}status`)} className="input" value={j.status} onChange={(e) => setItem('jutsu', i, 'status')(e.target.value)}>
                  {JUTSU_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Description or explanation" htmlFor={fid(`j${i}desc`)} error={errors[`jutsu[${i}].description`]} className="md:col-span-2">
                <TextArea id={fid(`j${i}desc`)} rows={2} value={j.description} onChange={setItem('jutsu', i, 'description')} maxLength={LIMITS.description} />
              </Field>
            </div>
          </div>
        ))}
        <datalist id={fid('jutsu-cats')}>
          {JUTSU_CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
        <button type="button" className="btn-secondary btn-sm" onClick={() => addItem('jutsu', newJutsu)} disabled={form.jutsu.length >= 50}>
          <Plus className="size-3.5" /> Add jutsu
        </button>
      </Section>

      <Section icon={Lightbulb} title="What did you learn?" description="Abilities, lore and the threads to keep an eye on.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="New abilities or techniques" htmlFor={fid('newAbilities')} error={errors.newAbilities}>
            <TextArea id={fid('newAbilities')} value={form.newAbilities} onChange={set('newAbilities')} error={errors.newAbilities} />
          </Field>
          <Field label="Lore & world-building" htmlFor={fid('lore')} error={errors.lore}>
            <TextArea id={fid('lore')} value={form.lore} onChange={set('lore')} error={errors.lore} />
          </Field>
          <Field label="Relationships & character development" htmlFor={fid('relationships')} error={errors.relationships}>
            <TextArea id={fid('relationships')} value={form.relationships} onChange={set('relationships')} error={errors.relationships} />
          </Field>
          <Field label="Unanswered questions / things to remember" htmlFor={fid('openQuestions')} error={errors.openQuestions}>
            <TextArea id={fid('openQuestions')} value={form.openQuestions} onChange={set('openQuestions')} error={errors.openQuestions} />
          </Field>
        </div>
        <Field label="Your rating" error={errors.rating}>
          <StarRating value={form.rating} onChange={set('rating')} />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-ink-700/70 bg-ink-850/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:px-6">
        {isEdit && (
          <button type="button" className="btn-ghost text-leaf-400 hover:text-leaf-400 sm:mr-auto" onClick={() => setConfirm('delete')} disabled={saving}>
            <Trash2 className="size-4" /> Delete notes
          </button>
        )}
        <div className="flex gap-2 sm:ml-auto">
          <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => (dirty ? setConfirm('discard') : onCancel?.())} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving || (isEdit && !dirty)}>
            {saving ? <Spinner /> : <Save className="size-4" />}
            {isEdit ? 'Save changes' : 'Save Notes'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete these notes?"
        danger
        busy={deleting}
        confirmLabel="Delete notes"
        onCancel={() => setConfirm(null)}
        onConfirm={handleDelete}
      >
        Your recap, characters and jutsu for <strong className="text-cream-50">{episode.label}</strong> will be permanently removed.
      </ConfirmDialog>
      <ConfirmDialog
        open={confirm === 'discard'}
        title="Discard unsaved changes?"
        confirmLabel="Discard"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null)
          onCancel?.()
        }}
      >
        You have edits that haven&apos;t been saved yet.
      </ConfirmDialog>
    </form>
  )
}
