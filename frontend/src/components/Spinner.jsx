import { cx } from '../lib/cx'

const SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-8' }

export default function Spinner({ size = 'md', label, className }) {
  return (
    <span role={label ? 'status' : undefined} className={cx('inline-flex items-center', className)}>
      <svg className={cx('animate-spin', SIZES[size])} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export function FullPageSpinner({ label = 'Loading' }) {
  return (
    <div className="grid min-h-dvh place-items-center text-brand-700">
      <Spinner size="lg" label={label} />
    </div>
  )
}
