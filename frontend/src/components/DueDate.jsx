import { cx } from '../lib/cx'
import { dueHint, formatDate } from '../lib/format'
import Badge from './Badge'

/** A deadline with an optional "In 5 days" / "Overdue" hint. */
export default function DueDate({ value, withHint = false, className }) {
  const hint = withHint ? dueHint(value) : null
  return (
    <span className={cx('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <time dateTime={value ?? undefined} className="tabular-nums">
        {formatDate(value)}
      </time>
      {hint && hint.tone !== 'neutral' && <Badge tone={hint.tone}>{hint.label}</Badge>}
      {hint && hint.tone === 'neutral' && <span className="text-xs text-stone-500">{hint.label}</span>}
    </span>
  )
}
