import { AlertTriangle, Clock } from 'lucide-react'
import { STATUS, deadlineStatus } from '../lib/schedule'
import Badge from './Badge'

/** "Overdue" / "Due soon" badge for a deadline; nothing when it is on track. */
export default function StatusBadge({ deadline }) {
  const status = deadlineStatus(deadline)
  if (status === 'ontrack') return null
  const Icon = status === 'overdue' ? AlertTriangle : Clock
  return (
    <Badge tone={status === 'overdue' ? 'red' : 'amber'}>
      <Icon className="size-3" aria-hidden="true" />
      {status === 'overdue' ? 'Overdue' : STATUS.soon.short}
    </Badge>
  )
}
