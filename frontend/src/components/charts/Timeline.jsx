import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../../lib/cx'
import { formatDate } from '../../lib/format'
import { STATUS, axisTicks, toDay, todayDay } from '../../lib/schedule'

/**
 * A horizontal time chart: one row per item, a bar from `start` to `end`
 * (both inclusive "YYYY-MM-DD"), optional milestone dots, a "today" line and
 * labelled reference lines (e.g. the project deadline).
 *
 * rows: [{ id, label, sublabel?, start, end, status, markers?: [{ date, label }], to?, details?: string[] }]
 * references: [{ date, label }]
 */
export default function Timeline({ rows, references = [], ariaLabel, labelHeading = 'Item' }) {
  const container = useRef(null)
  const [tip, setTip] = useState(null)

  const today = todayDay()
  const days = [today]
  for (const row of rows) {
    days.push(toDay(row.start), toDay(row.end))
    for (const marker of row.markers ?? []) days.push(toDay(marker.date))
  }
  for (const reference of references) days.push(toDay(reference.date))
  const known = days.filter((day) => day !== null)
  const minDay = Math.min(...known)
  const maxDay = Math.max(...known) + 1
  const pad = Math.max(1, Math.round((maxDay - minDay) * 0.03))
  const startDay = minDay - pad
  const endDay = maxDay + pad
  const pct = (day) => ((day - startDay) / (endDay - startDay)) * 100
  const ticks = axisTicks(startDay, endDay)
  const todayPct = pct(today + 0.5)

  function showTip(event, row) {
    const box = container.current?.getBoundingClientRect()
    if (!box) return
    const target = event.currentTarget.getBoundingClientRect()
    const x = event.clientX ? event.clientX - box.left : target.left + target.width / 2 - box.left
    const y = target.top - box.top
    setTip({ row, x: Math.min(Math.max(x, 110), box.width - 110), y })
  }

  const grid = 'grid gap-x-4 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]'

  return (
    <div ref={container} className="relative" onMouseLeave={() => setTip(null)}>
      {/* Axis */}
      <div className={grid} aria-hidden="true">
        <div className="hidden pb-2 text-xs font-medium text-stone-500 sm:block">{labelHeading}</div>
        <div className="relative h-6">
          {ticks.map((tick, index) => {
            const left = pct(tick.day)
            if (left < 0 || left > 100) return null
            return (
              <span
                key={tick.day}
                className={cx(
                  'absolute top-0 text-[11px] whitespace-nowrap text-stone-500 tabular-nums',
                  index % 2 === 1 && 'max-sm:hidden',
                  left > 88 ? '-translate-x-full pr-1' : 'pl-1',
                )}
                style={{ left: `${left}%` }}
              >
                {tick.label}
              </span>
            )
          })}
        </div>
      </div>

      <ul aria-label={ariaLabel} className="border-t border-stone-100">
        {rows.map((row) => {
          const startDayRow = toDay(row.start) ?? toDay(row.end)
          const endDayRow = toDay(row.end) ?? startDayRow
          const left = pct(startDayRow)
          const width = Math.max(pct(endDayRow + 1) - left, 0.9)
          const color = STATUS[row.status]?.color ?? STATUS.ontrack.color
          const description = `${row.label}: ${formatDate(row.start)} to ${formatDate(row.end)}, ${STATUS[row.status]?.label ?? ''}`

          const bar = (
            <span
              className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-[4px] transition-[filter] group-hover/row:brightness-95"
              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
            />
          )

          return (
            <li key={row.id} className={cx(grid, 'group/row border-b border-stone-100 last:border-b-0')}>
              <div className="min-w-0 pt-2.5 sm:py-2.5">
                {row.to ? (
                  <Link to={row.to} className="focus-ring block truncate rounded-sm text-sm font-medium text-stone-900 hover:text-brand-800">
                    {row.label}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-medium text-stone-900">{row.label}</p>
                )}
                {row.sublabel && <p className="truncate text-xs text-stone-500">{row.sublabel}</p>}
              </div>
              <div
                role="img"
                aria-label={description}
                tabIndex={0}
                className="focus-ring relative h-9 cursor-default self-stretch rounded-sm sm:h-auto sm:min-h-11"
                onMouseEnter={(event) => showTip(event, row)}
                onMouseMove={(event) => showTip(event, row)}
                onFocus={(event) => showTip(event, row)}
                onBlur={() => setTip(null)}
              >
                {ticks.map((tick) => {
                  const x = pct(tick.day)
                  return x >= 0 && x <= 100 ? (
                    <span key={tick.day} aria-hidden="true" className="absolute inset-y-0 w-px bg-stone-100" style={{ left: `${x}%` }} />
                  ) : null
                })}
                {references.map((reference) => (
                  <span
                    key={reference.label}
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-stone-400"
                    style={{ left: `${pct(toDay(reference.date) + 1)}%` }}
                  />
                ))}
                <span aria-hidden="true" className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-stone-800" style={{ left: `${todayPct}%` }} />
                {bar}
                {(row.markers ?? []).map((marker, index) => (
                  <span
                    key={`${marker.date}-${index}`}
                    aria-hidden="true"
                    className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                    style={{ left: `${pct(toDay(marker.date) + 0.5)}%`, boxShadow: `0 0 0 2px ${color}` }}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Labels for the vertical lines, kept below the rows so they never collide with bars. */}
      <div className={grid} aria-hidden="true">
        <div className="hidden sm:block" />
        <div className="relative h-6">
          <span
            className={cx(
              'absolute top-1.5 rounded bg-stone-800 px-1.5 py-px text-[10px] font-medium whitespace-nowrap text-white',
              todayPct > 85 ? '-translate-x-full' : todayPct < 15 ? '' : '-translate-x-1/2',
            )}
            style={{ left: `${todayPct}%` }}
          >
            Today
          </span>
          {references.map((reference) => {
            const x = pct(toDay(reference.date) + 1)
            if (Math.abs(x - todayPct) < 12) return null
            return (
              <span
                key={reference.label}
                className={cx(
                  'absolute top-1.5 text-[10px] font-medium whitespace-nowrap text-stone-600',
                  x > 85 ? '-translate-x-full pr-1' : 'pl-1',
                )}
                style={{ left: `${x}%` }}
              >
                {reference.label}
              </span>
            )
          })}
        </div>
      </div>

      {tip && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-20 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-lg bg-stone-900 px-3 py-2 text-xs text-stone-100 shadow-lg"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <p className="font-medium text-white">{tip.row.label}</p>
          <p className="mt-0.5 tabular-nums">
            {tip.row.start === tip.row.end ? formatDate(tip.row.end) : `${formatDate(tip.row.start)} → ${formatDate(tip.row.end)}`}
          </p>
          {(tip.row.details ?? []).map((line) => (
            <p key={line} className="text-stone-300">
              {line}
            </p>
          ))}
          <p className="mt-1 inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: STATUS[tip.row.status]?.color }} />
            {STATUS[tip.row.status]?.label}
          </p>
        </div>
      )}
    </div>
  )
}
