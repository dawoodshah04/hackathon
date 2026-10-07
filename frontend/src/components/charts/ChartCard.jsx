import { cx } from '../../lib/cx'
import { STATUS } from '../../lib/schedule'

/** The frame every chart sits in: title, one-line explanation, optional legend and action. */
export default function ChartCard({ title, description, action, legend, children, className, id }) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      aria-labelledby={headingId}
      className={cx('flex min-w-0 flex-col rounded-xl border border-stone-200 bg-white shadow-xs', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 pt-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[15px] font-semibold tracking-tight text-stone-900">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-stone-500">{description}</p>}
        </div>
        {action}
      </header>
      {legend && <div className="px-5 pt-3">{legend}</div>}
      <div className="min-w-0 flex-1 px-5 pt-3 pb-5">{children}</div>
    </section>
  )
}

/** Swatch + label for each delivery status shown, plus the "today" line key. */
export function StatusLegend({ statuses, showToday = true, extra }) {
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600">
      {statuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-4 rounded-[3px]" style={{ backgroundColor: STATUS[status].color }} />
          {STATUS[status].label}
        </li>
      ))}
      {showToday && (
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-stone-800" />
          Today
        </li>
      )}
      {extra}
    </ul>
  )
}
