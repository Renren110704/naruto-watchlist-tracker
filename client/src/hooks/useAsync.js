import { useCallback, useEffect, useRef, useState } from 'react'
import { parseApiError } from '../services/api'

/**
 * Runs an async loader whenever `deps` change and exposes { data, error, loading }.
 * `setData` allows optimistic/local updates after mutations; `reload` re-runs it.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const callId = useRef(0)
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++callId.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await loaderRef.current()
      if (id === callId.current) setState({ data, error: null, loading: false })
    } catch (err) {
      if (id === callId.current) setState((s) => ({ ...s, error: parseApiError(err), loading: false }))
    }
  }, [])

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  return { ...state, setData, reload: run }
}
