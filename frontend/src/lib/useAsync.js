import { useCallback, useEffect, useState } from 'react'

/**
 * Runs `load` whenever `deps` change (or `reload()` is called) and tracks the result.
 * Results are keyed by request so a slow response for an old id can never
 * overwrite the screen for the current one.
 */
export function useAsync(load, deps) {
  const [attempt, setAttempt] = useState(0)
  const key = `${JSON.stringify(deps)}#${attempt}`
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let active = true
    load().then(
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
  const loading = result.key !== key

  return { data: loading ? null : result.data, error: loading ? null : result.error, loading, reload }
}
