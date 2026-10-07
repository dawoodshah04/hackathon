import { ROLE_LABELS } from '../lib/roles'
import { cx } from '../lib/cx'

const TONES = {
  neutral: 'bg-stone-100 text-stone-700 ring-stone-200',
  dark: 'bg-stone-800 text-stone-50 ring-stone-800',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
}

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const ROLE_TONES = { ADMIN: 'dark', MANAGER: 'amber', AGENT: 'sky' }

export function RoleBadge({ role, className }) {
  return (
    <Badge tone={ROLE_TONES[role] ?? 'neutral'} className={className}>
      {ROLE_LABELS[role] ?? role}
    </Badge>
  )
}
