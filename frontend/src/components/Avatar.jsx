import { cx } from '../lib/cx'
import { initials } from '../lib/format'

// Muted tints so a wall of avatars stays calm. Chosen by a stable hash of the user id.
const TINTS = [
  'bg-brand-100 text-brand-800',
  'bg-amber-100 text-amber-900',
  'bg-sky-100 text-sky-900',
  'bg-rose-100 text-rose-900',
  'bg-violet-100 text-violet-900',
  'bg-lime-100 text-lime-900',
  'bg-orange-100 text-orange-900',
]

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
}

function hash(value) {
  let h = 0
  for (const char of String(value)) h = (h * 31 + char.charCodeAt(0)) >>> 0
  return h
}

export default function Avatar({ id, name, size = 'sm', className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide select-none',
        TINTS[hash(id ?? name) % TINTS.length],
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

/** Avatar + name, the standard way a person is shown in lists. */
export function Person({ person, size = 'xs', className, detail }) {
  if (!person) return <span className="text-sm text-stone-400">Unassigned</span>
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar id={person.id} name={person.name} size={size} />
      <span className="min-w-0">
        <span className="block truncate text-sm text-stone-800">{person.name}</span>
        {detail && <span className="block truncate text-xs text-stone-500">{detail}</span>}
      </span>
    </span>
  )
}
