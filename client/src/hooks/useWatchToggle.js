import { useCallback, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { parseApiError } from '../services/api'
import { progressApi } from '../services/endpoints'

/**
 * Toggles an episode's watched state and reports the server's updated episode via
 * `onUpdated`. Tracks which episode ids have a request in flight.
 */
export function useWatchToggle(onUpdated) {
  const toast = useToast()
  const [pending, setPending] = useState(() => new Set())

  const toggle = useCallback(
    async (episode) => {
      const next = !episode.watched
      setPending((s) => new Set(s).add(episode.id))
      try {
        const res = await progressApi.setWatched(episode.id, next)
        onUpdated?.(res.episode, episode)
        return res.episode
      } catch (err) {
        toast.error(parseApiError(err).message)
        return null
      } finally {
        setPending((s) => {
          const copy = new Set(s)
          copy.delete(episode.id)
          return copy
        })
      }
    },
    [onUpdated, toast],
  )

  return { toggle, isPending: (id) => pending.has(id) }
}
