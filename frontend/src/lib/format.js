// Dates travel through the API as plain "YYYY-MM-DD" strings. We never pass them
// through `new Date(string)` so the UI cannot shift a deadline across timezones.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAY_MS = 24 * 60 * 60 * 1000

/** Parses a strict, real calendar date. Returns null for anything else. */
export function parseISODate(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const check = new Date(utc)
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null
  }
  return { year, month, day, utc }
}

/** "2026-10-20" -> "20 Oct 2026" */
export function formatDate(value) {
  const date = parseISODate(value)
  if (!date) return '—'
  return `${date.day} ${MONTHS[date.month - 1]} ${date.year}`
}

/** 12 -> "12 h", 7.5 -> "7.5 h" */
export function formatHours(value) {
  const hours = Number(value)
  if (value === null || value === undefined || !Number.isFinite(hours)) return '—'
  const rounded = Math.round(hours * 10) / 10
  return `${rounded.toLocaleString('en-GB')} h`
}

/** "Ayesha Khan" -> "AK", "Admin" -> "AD" */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function todayISO() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whole calendar days from today until `value`; negative when overdue. */
export function daysUntil(value) {
  const target = parseISODate(value)
  const today = parseISODate(todayISO())
  if (!target || !today) return null
  return Math.round((target.utc - today.utc) / DAY_MS)
}

/** Short relative hint shown next to a deadline, with a tone for colouring. */
export function dueHint(value) {
  const days = daysUntil(value)
  if (days === null) return null
  if (days < 0) return { label: `${pluralize(-days, 'day')} overdue`, tone: 'red' }
  if (days === 0) return { label: 'Due today', tone: 'amber' }
  if (days === 1) return { label: 'Due tomorrow', tone: 'amber' }
  if (days <= 3) return { label: `In ${days} days`, tone: 'amber' }
  return { label: `In ${days} days`, tone: 'neutral' }
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count.toLocaleString('en-GB')} ${count === 1 ? singular : plural}`
}

export function countWords(text) {
  const trimmed = String(text ?? '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function sumBy(items, key) {
  return items.reduce((total, item) => total + (Number(item?.[key]) || 0), 0)
}
