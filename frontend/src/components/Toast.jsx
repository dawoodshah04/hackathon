import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../lib/cx'

const ToastContext = createContext(null)

const ICONS = {
  success: <CheckCircle2 className="size-4 text-brand-600" aria-hidden="true" />,
  error: <AlertCircle className="size-4 text-red-600" aria-hidden="true" />,
  info: <Info className="size-4 text-stone-500" aria-hidden="true" />,
}

const DURATION = { success: 4500, info: 4500, error: 7000 }

function ToastItem({ toast, onDismiss }) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => clearTimeout(timer)
  }, [paused, toast.id, toast.duration, onDismiss])

  return (
    <li
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-lg border border-stone-200 bg-white px-3.5 py-3 text-sm shadow-lg shadow-stone-900/5 sm:w-96"
    >
      <span className="mt-0.5">{ICONS[toast.type]}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-stone-900">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-stone-600">{toast.description}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          className="focus-ring -my-1 rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50"
          onClick={() => {
            toast.action.onClick()
            onDismiss(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="focus-ring -m-1 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])

  const push = useCallback((type, title, options = {}) => {
    nextId.current += 1
    const toast = { id: nextId.current, type, title, duration: DURATION[type], ...options }
    // Keep the stack short; the newest message is the one that matters.
    setToasts((current) => [...current.slice(-2), toast])
    return toast.id
  }, [])

  const api = useMemo(
    () => ({
      success: (title, options) => push('success', title, options),
      error: (title, options) => push('error', title, options),
      info: (title, options) => push('info', title, options),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol
        aria-live="polite"
        className={cx(
          'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4',
          'sm:inset-x-auto sm:right-0 sm:items-end sm:p-6',
        )}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </ol>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
