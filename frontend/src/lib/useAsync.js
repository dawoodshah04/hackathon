import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------- response cache
//
// On a slow connection the worst experience is a skeleton on every navigation.
// Requests with a cache key show the last response straight away and refresh it
// in the background (stale-while-revalidate). Identical requests in flight are
// shared, so prefetching on hover and the page itself never download twice.

const cache = new Map() // key -> { data, at }
const inflight = new Map() // key -> Promise

/** Fresh enough to skip the background refresh entirely. */
const FRESH_MS = 15_000

function request(key, load) {
  if (inflight.has(key)) return inflight.get(key)
  const promise = load().then(
    (data) => {
      cache.set(key, { data, at: Date.now() })
      inflight.delete(key)
      return data
    },
    (error) => {
      inflight.delete(key)
      throw error
    },
  )
  inflight.set(key, promise)
  return promise
}

/** Warms the cache (e.g. on hover) so the next page opens without waiting. */
export function prefetch(key, load) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.at < FRESH_MS) return
  request(key, load).catch(() => {
    /* the page will retry and show the error itself */
  })
}

/** Drops cached responses whose key starts with `prefix` (everything when omitted). */
export function invalidate(prefix = '') {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

// ---------------------------------------------------------------- hook

/**
 * Runs `load` whenever `deps` change (or `reload()` is called) and tracks the result.
 * Results are keyed by request so a slow response for an old id can never
 * overwrite the screen for the current one.
 *
 * Pass `{ cacheKey }` to show cached data instantly and refresh it quietly;
 * `refreshing` is true while that background refresh runs.
 */
export function useAsync(load, deps, { cacheKey } = {}) {
  const [attempt, setAttempt] = useState(0)
  const key = `${JSON.stringify(deps)}#${attempt}`
  const [result, setResult] = useState({ key: null, data: null, error: null })

  const cached = cacheKey ? cache.get(cacheKey) : undefined

  useEffect(() => {
    let active = true
    const entry = cacheKey ? cache.get(cacheKey) : undefined
    // A manual reload always goes to the network; otherwise very fresh data is reused as is.
    if (entry && attempt === 0 && Date.now() - entry.at < FRESH_MS) {
      setResult({ key, data: entry.data, error: null })
      return undefined
    }
    const run = cacheKey ? request(cacheKey, load) : load()
    run.then(
      (data) => active && setResult({ key, data, error: null }),
      (error) => active && setResult({ key, data: null, error }),
    )
    return () => {
      active = false
    }
    // `load` is usually an inline closure; re-running is keyed by `deps` instead of its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(() => setAttempt((count) => count + 1), [])
  const settled = result.key === key

  if (!settled && cached) {
    // Show the previous response while the refresh is in flight.
    return { data: cached.data, error: null, loading: false, refreshing: true, reload }
  }

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
    refreshing: false,
    reload,
  }
}
