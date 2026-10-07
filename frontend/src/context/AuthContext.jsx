import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as api from '../api'
import { onUnauthorized, tokenStore } from '../api/client'
import { invalidate } from '../lib/useAsync'

const AuthContext = createContext(null)

/** Resolves with the next session state instead of throwing. */
async function fetchSession() {
  try {
    const { user } = await api.me()
    return { user, status: 'authenticated' }
  } catch (error) {
    if (error.status === 401) return { user: null, status: null }
    return { user: null, status: error.status ? 'anonymous' : 'unreachable' }
  }
}

/**
 * status:
 *  - "checking"       a token exists and we are verifying it with /auth/me
 *  - "authenticated"  `user` is set
 *  - "anonymous"      no session
 *  - "unreachable"    a token exists but the server could not be reached to verify it
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'checking' : 'anonymous'))
  const [sessionExpired, setSessionExpired] = useState(false)

  const applySession = useCallback((result) => {
    setUser(result.user)
    // A 401 is handled by the unauthorized listener below, so it is ignored here.
    if (result.status) setStatus(result.status)
  }, [])

  // Verify a stored token once on load; later sign-ins go through `signIn`.
  useEffect(() => {
    if (!tokenStore.get()) return undefined
    let active = true
    fetchSession().then((result) => active && applySession(result))
    return () => {
      active = false
    }
  }, [applySession])

  const retry = useCallback(() => {
    setStatus('checking')
    fetchSession().then(applySession)
  }, [applySession])

  useEffect(
    () =>
      onUnauthorized(() => {
        invalidate()
        setUser(null)
        setStatus('anonymous')
        setSessionExpired(true)
      }),
    [],
  )

  const signIn = useCallback(async (email, password) => {
    const { token, user: signedIn } = await api.login(email, password)
    tokenStore.set(token)
    invalidate()
    setUser(signedIn)
    setStatus('authenticated')
    setSessionExpired(false)
    return signedIn
  }, [])

  const signOut = useCallback(() => {
    tokenStore.clear()
    invalidate()
    setUser(null)
    setStatus('anonymous')
    setSessionExpired(false)
  }, [])

  const value = useMemo(
    () => ({ user, status, sessionExpired, signIn, signOut, retry }),
    [user, status, sessionExpired, signIn, signOut, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
