import axios from 'axios'

const TOKEN_KEY = 'nw_token'

/** localStorage can throw (private mode, blocked storage); never let that crash the app. */
export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      /* storage unavailable: the session lasts until reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* nothing to clear */
    }
  },
}

/**
 * Every failure the UI sees has the same shape: { status, code, message, issues }.
 * `status` is 0 when the request never got an HTTP response.
 */
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Something went wrong', issues = [] } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.issues = issues
  }
}

const FALLBACK_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'BUSY',
  422: 'VALIDATION_FAILED',
  502: 'AI_FAILED',
}

export function toApiError(error) {
  if (error instanceof ApiError) return error

  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return new ApiError({ code: 'TIMEOUT', message: 'The server took too long to respond' })
  }

  const response = error?.response
  if (!response) {
    return new ApiError({ code: 'NETWORK', message: 'Cannot reach the server' })
  }

  const body = response.data?.error
  return new ApiError({
    status: response.status,
    code: body?.code || FALLBACK_CODES[response.status] || 'SERVER_ERROR',
    message: body?.message || `Request failed (${response.status})`,
    issues: Array.isArray(body?.issues) ? body.issues : [],
  })
}

// The auth context subscribes here so an expired session in any request
// sends the user back to sign-in without a full page reload.
const unauthorizedListeners = new Set()

export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

export function handleUnauthorized() {
  tokenStore.clear()
  unauthorizedListeners.forEach((listener) => listener())
}

export const LOGIN_PATH = '/api/auth/login'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  // Render's free tier sleeps when idle and needs up to a minute to wake.
  timeout: 75_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    // A 401 from the login form means "wrong password", not "session expired".
    if (apiError.status === 401 && error.config?.url !== LOGIN_PATH) {
      handleUnauthorized()
    }
    return Promise.reject(apiError)
  },
)
