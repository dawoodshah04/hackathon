import { cx } from '../lib/cx'

export default function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-stone-200/70', className)} />
}

/** Wraps skeleton blocks so screen readers hear one "Loading" instead of nothing. */
export function SkeletonGroup({ label = 'Loading', className, children }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
