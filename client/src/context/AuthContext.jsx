import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onUnauthorized } from '../services/api'
import { authApi } from '../services/endpoints'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready
  const [sessionMessage, setSessionMessage] = useState(null)
  const userRef = useRef(null)
  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((d) => !cancelled && setUser(d.user))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setStatus('ready'))
    return () => {
      cancelled = true
    }
  }, [])

  // Any 401 from a protected call (expired / revoked token) signs the user out locally.
  useEffect(
    () =>
      onUnauthorized((err) => {
        if (userRef.current) setSessionMessage(err?.message || 'Your session has ended. Please sign in again.')
        setUser(null)
      }),
    [],
  )

  const signin = useCallback(async (body) => {
    const d = await authApi.signin(body)
    setSessionMessage(null)
    setUser(d.user)
    return d
  }, [])

  const signup = useCallback(async (body) => {
    const d = await authApi.signup(body)
    setSessionMessage(null)
    setUser(d.user)
    return d
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, setUser, status, signin, signup, logout, sessionMessage, clearSessionMessage: () => setSessionMessage(null) }),
    [user, status, signin, signup, logout, sessionMessage],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
