import axios from 'axios'

/**
 * Axios instance for the Express API. Auth lives in an httpOnly cookie, so the only
 * thing the client manages is the CSRF token echoed in X-CSRF-Token on writes.
 */
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 })

let csrfToken = null
let csrfPromise = null

export async function ensureCsrf(force = false) {
  if (csrfToken && !force) return csrfToken
  if (!csrfPromise) {
    csrfPromise = axios
      .get('/api/auth/csrf', { withCredentials: true })
      .then((res) => (csrfToken = res.data.csrfToken))
      .finally(() => (csrfPromise = null))
  }
  return csrfPromise
}

const SAFE = new Set(['get', 'head', 'options'])

api.interceptors.request.use(async (config) => {
  if (!SAFE.has((config.method || 'get').toLowerCase())) {
    config.headers['X-CSRF-Token'] = await ensureCsrf()
  }
  return config
})

const unauthorizedListeners = new Set()
export function onUnauthorized(fn) {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    const code = response?.data?.error?.code
    // A stale CSRF cookie (e.g. cleared cookies): fetch a new token and retry once.
    if (response?.status === 403 && code === 'CSRF_INVALID' && !config._csrfRetry) {
      config._csrfRetry = true
      config.headers['X-CSRF-Token'] = await ensureCsrf(true)
      return api(config)
    }
    if (response?.status === 401 && !config.skipAuthRedirect) {
      unauthorizedListeners.forEach((fn) => fn(response.data?.error))
    }
    return Promise.reject(error)
  },
)

/** Human-readable message + per-field details from an API error. */
export function parseApiError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED') return { message: 'The server took too long to respond.', details: {} }
    return { message: 'Cannot reach the server. Check that the API is running and try again.', details: {} }
  }
  const e = error.response.data?.error
  return { message: e?.message || fallback, details: e?.details || {}, code: e?.code, status: error.response.status }
}
