import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '../components/Controls'
import { NoteEditor } from '../components/NoteEditor'
import { ErrorState, LoadingState } from '../components/States'
import { useAsync } from '../hooks/useAsync'
import { catalogApi } from '../services/endpoints'
import NotFound from './NotFound'

/** Full-page version of the notes form: /episodes/:episodeId/notes */
export default function EpisodeNotesPage() {
  const { episodeId } = useParams()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useAsync(() => catalogApi.episode(episodeId), [episodeId])

  if (loading && !data) return <LoadingState />
  if (error?.status === 404 || error?.status === 422) return <NotFound message="That episode isn't in the catalog." />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  const { episode, note } = data
  const back = () => navigate(`/episodes/${episode.id}`)

  return (
    <div>
      <Link to={`/episodes/${episode.id}`} className="btn-ghost -ml-3 mb-4 px-3">
        <ArrowLeft className="size-4" /> Episode details
      </Link>
      <PageHeader eyebrow={note ? 'Episode Recap' : 'Add Episode Notes'} title="What Did You Learn?">
        Notes are private to your account. Characters and jutsu are optional — add as many as you like.
      </PageHeader>
      <div className="card px-5 pt-5 pb-5 sm:px-6 sm:pt-6">
        <NoteEditor key={note?.updatedAt ?? 'new'} episode={episode} note={note} onSaved={back} onCancel={back} onDeleted={back} />
      </div>
    </div>
  )
}
