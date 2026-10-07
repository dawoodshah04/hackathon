import { formatHours, pluralize } from '../../lib/format'
import { fromDay, shortDate } from '../../lib/schedule'

/** Columns of hours due per week. Single series, value on each cap. */
export default function WeekColumns({ buckets, ariaLabel }) {
  const max = Math.max(...buckets.map((bucket) => bucket.hours), 1)

  return (
    <figure aria-label={ariaLabel}>
      <ol className="flex h-44 items-end gap-1 border-b border-stone-200">
        {buckets.map((bucket, index) => {
          const height = (bucket.hours / max) * 100
          const label = index === 0 ? 'This week' : `Week of ${shortDate(fromDay(bucket.day))}`
          return (
            <li key={bucket.day} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
              <span className="sr-only">
                {label}: {formatHours(bucket.hours)} across {pluralize(bucket.count, 'task')}
              </span>
              {bucket.hours > 0 && (
                <span aria-hidden="true" className="mb-1 text-[11px] font-medium text-stone-700 tabular-nums">
                  {Math.round(bucket.hours)}
                </span>
              )}
              <span
                aria-hidden="true"
                className="w-full max-w-6 rounded-t-[4px] bg-brand-500 transition-colors group-hover:bg-brand-600"
                style={{ height: `${height}%`, minHeight: bucket.hours > 0 ? 3 : 0 }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 shadow-lg group-hover:block"
              >
                <span className="block font-medium text-white">{label}</span>
                {formatHours(bucket.hours)} · {pluralize(bucket.count, 'task')} due
              </span>
            </li>
          )
        })}
      </ol>
      <ol aria-hidden="true" className="mt-1.5 flex gap-1">
        {buckets.map((bucket, index) => (
          <li key={bucket.day} className="min-w-0 flex-1 truncate text-center text-[11px] text-stone-500 tabular-nums">
            {index === 0 ? 'Now' : shortDate(fromDay(bucket.day))}
          </li>
        ))}
      </ol>
      <figcaption className="mt-2 text-xs text-stone-500">Hours of work due each week, by task deadline.</figcaption>
    </figure>
  )
}
