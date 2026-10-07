import { cx } from '../lib/cx'

/** A compact row of headline numbers inside one card. */
export default function StatStrip({ items, className }) {
  return (
    <dl
      className={cx(
        'grid divide-x divide-stone-200 rounded-xl border border-stone-200 bg-white shadow-xs',
        items.length === 4 ? 'grid-cols-2 sm:grid-cols-4 [&>*:nth-child(3)]:border-l-0 sm:[&>*:nth-child(3)]:border-l' : 'grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-4 py-3.5 sm:px-5">
          <dt className="truncate text-xs text-stone-500">{item.label}</dt>
          <dd className="mt-1 truncate text-lg font-semibold tracking-tight text-stone-900 tabular-nums sm:text-xl">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
