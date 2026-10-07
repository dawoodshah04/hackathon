import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'

/**
 * Ranked horizontal bars: one series, one hue, the value in text beside the label.
 * Each item: { id, label, value, valueLabel, detail?, leading?, to? }
 */
export default function BarList({ items, ariaLabel, max: maxOverride }) {
  const max = maxOverride ?? Math.max(...items.map((item) => item.value), 0)

  return (
    <ul aria-label={ariaLabel} className="-mx-2 space-y-0.5">
      {items.map((item) => {
        const width = max > 0 ? Math.max((item.value / max) * 100, item.value > 0 ? 1.5 : 0) : 0
        const body = (
          <>
            <div className="flex items-center gap-2.5">
              {item.leading}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-stone-800">{item.label}</span>
                  <span className="shrink-0 text-sm font-medium text-stone-900 tabular-nums">{item.valueLabel}</span>
                </div>
                {item.detail && <p className="truncate text-xs text-stone-500">{item.detail}</p>}
              </div>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-2 w-full overflow-hidden rounded-r-[4px] bg-brand-50">
              <div
                className="h-full rounded-r-[4px] bg-brand-500 transition-[width] duration-500 ease-out group-hover:bg-brand-600"
                style={{ width: `${width}%` }}
              />
            </div>
          </>
        )
        const rowClass = 'group block rounded-lg px-2 py-2 transition-colors hover:bg-stone-50'
        return (
          <li key={item.id}>
            {item.to ? (
              <Link to={item.to} className={cx(rowClass, 'focus-ring')}>
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
