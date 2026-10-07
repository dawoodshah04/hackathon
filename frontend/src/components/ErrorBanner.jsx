import { AlertCircle, X } from 'lucide-react'
import { cx } from '../lib/cx'
import Button from './Button'

export default function ErrorBanner({ title, error, message, onRetry, retryLabel = 'Try again', onDismiss, className }) {
  const text = message ?? error?.message
  return (
    <div role="alert" className={cx('flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm', className)}>
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-red-900">{title}</p>}
        {text && <p className={cx('text-red-800', title && 'mt-0.5')}>{text}</p>}
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="focus-ring -m-1 size-7 shrink-0 rounded-md p-1.5 text-red-700 hover:bg-red-100"
          aria-label="Dismiss"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
