// Date arithmetic for charts. Everything works on "YYYY-MM-DD" strings and UTC
// day numbers, never local Date parsing, so nothing shifts across timezones.

import { parseISODate, todayISO } from './format'

const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "YYYY-MM-DD" -> whole days since the epoch, or null. */
export function toDay(value) {
  const date = parseISODate(value)
  return date ? Math.round(date.utc / DAY_MS) : null
}

/** Whole days since the epoch -> "YYYY-MM-DD". */
export function fromDay(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

export function todayDay() {
  return toDay(todayISO())
}

/** "2026-10-20" -> "20 Oct" */
export function shortDate(value) {
  const date = parseISODate(value)
  return date ? `${date.day} ${MONTHS[date.month - 1]}` : '—'
}

/** Hours of effort -> calendar days of work at 8 h/day, at least one. */
export function effortDays(hours) {
  const value = Number(hours)
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.ceil(value / 8)) : 1
}

// ---------------------------------------------------------------- status

export const STATUS = {
  overdue: { label: 'Overdue', color: '#c0262d', text: 'text-red-700' },
  soon: { label: 'Due within 7 days', short: 'Due soon', color: '#e0a106', text: 'text-amber-800' },
  ontrack: { label: 'On track', color: '#2a9178', text: 'text-brand-800' },
}

/** Delivery status of a deadline relative to today. */
export function deadlineStatus(deadline, today = todayDay()) {
  const day = toDay(deadline)
  if (day === null) return 'ontrack'
  if (day < today) return 'overdue'
  if (day - today <= 7) return 'soon'
  return 'ontrack'
}

// ---------------------------------------------------------------- axis

/**
 * Clean tick marks for a day range: every few days for short spans, Mondays for
 * medium spans and the first of each month for long ones.
 */
export function axisTicks(startDay, endDay) {
  const span = endDay - startDay
  const ticks = []
  if (span > 100) {
    let { year, month } = parseISODate(fromDay(startDay))
    for (;;) {
      const tickDay = toDay(`${year}-${String(month).padStart(2, '0')}-01`)
      if (tickDay > endDay) break
      if (tickDay >= startDay) ticks.push({ day: tickDay, label: MONTHS[month - 1] })
      month += 1
      if (month > 12) {
        month = 1
        year += 1
      }
    }
    return ticks
  }
  const step = span > 45 ? 14 : span > 12 ? 7 : span > 6 ? 2 : 1
  // 1970-01-05 was a Monday: align weekly steps to Mondays.
  let day = step >= 7 ? startDay + ((((4 - startDay) % 7) + 7) % 7) : startDay
  for (; day <= endDay; day += step) ticks.push({ day, label: shortDate(fromDay(day)) })
  return ticks
}

/** Monday on or before `day`. */
export function weekStart(day) {
  // Day 0 (1970-01-01) was a Thursday; Monday is offset 4 in that cycle.
  return day - ((((day - 4) % 7) + 7) % 7)
}
