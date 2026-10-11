import { useEffect, useState } from 'react'
import { parseApiError } from '../services/api'
import { notesApi } from '../services/endpoints'
import { Modal } from './Modal'
import { NoteEditor } from './NoteEditor'
import { ErrorState, LoadingState } from './States'

/**
 * Opens the notes form for `episode`, loading existing notes first when the episode
 * has some. `onChange(note | null)` fires after a save (note) or delete (null).
 */
export function NoteEditorModal({ episode, onClose, onChange }) {
  const [state, setState] = useState({ loading: Boolean(episode?.hasNotes), note: null, error: null })

  useEffect(() => {
    if (!episode?.hasNotes) return
    let cancelled = false
    notesApi
      .get(episode.id)
      .then((d) => !cancelled && setState({ loading: false, note: d.note, error: null }))
      .catch((err) => {
        if (cancelled) return
        // Deleted elsewhere: fall back to an empty form.
        if (err.response?.status === 404) setState({ loading: false, note: null, error: null })
        else setState({ loading: false, note: null, error: parseApiError(err) })
      })
    return () => {
      cancelled = true
    }
  }, [episode])

  if (!episode) return null
  const title = state.note ? 'Episode Recap' : 'What Did You Learn?'

  return (
    <Modal open onClose={onClose} title={title} subtitle={episode.label} size="lg">
      {state.loading ? (
        <LoadingState label="Loading your notes…" />
      ) : state.error ? (
        <ErrorState error={state.error} />
      ) : (
        <NoteEditor
          episode={episode}
          note={state.note}
          onCancel={onClose}
          onSaved={(note) => {
            onChange?.(note)
            onClose()
          }}
          onDeleted={() => {
            onChange?.(null)
            onClose()
          }}
        />
      )}
    </Modal>
  )
}
