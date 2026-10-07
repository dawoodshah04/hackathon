import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getProject } from '../api'
import { useAuth } from '../context/AuthContext'
import { formatHours, pluralize } from '../lib/format'
import { STATUS, deadlineStatus, toDay, todayDay } from '../lib/schedule'
import { prefetch } from '../lib/useAsync'
import { Person } from './Avatar'
import DueDate from './DueDate'
import Skeleton from './Skeleton'
import StatusBadge from './StatusBadge'

/** Share of the time between creation and deadline that has already passed, 0–100. */
function elapsedPercent(project) {
  const start = toDay(project.createdAt)
  const end = toDay(project.deadline)
  if (start === null || end === null || end <= start) return null
  return Math.min(100, Math.max(0, ((todayDay() - start) / (end - start)) * 100))
}

export default function ProjectCard({ project }) {
  const { user } = useAuth()
  const status = deadlineStatus(project.deadline)
  const elapsed = elapsedPercent(project)
  const warm = () => prefetch(`project:${user.id}:${project.id}`, () => getProject(project.id))

  return (
    <Link
      to={`/projects/${project.id}`}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className="group focus-ring flex w-full flex-col rounded-xl border border-stone-200 bg-white shadow-xs transition hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/[0.04]"
    >
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-xs font-medium text-stone-500">{project.clientName}</p>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge deadline={project.deadline} />
            <ArrowUpRight
              className="size-4 shrink-0 text-stone-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700"
              aria-hidden="true"
            />
          </div>
        </div>
        <h3 className="mt-1 text-base leading-snug font-semibold tracking-tight text-stone-900">{project.name}</h3>
        {project.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-stone-600">{project.description}</p>
        )}
      </div>

      {elapsed !== null && (
        <div className="px-5 pb-3">
          <div className="flex justify-between text-[11px] text-stone-500">
            <span>Schedule</span>
            <span className="tabular-nums">{Math.round(elapsed)}% elapsed</span>
          </div>
          <div
            role="meter"
            aria-label="Share of schedule elapsed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(elapsed)}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100"
          >
            <div className="h-full rounded-full" style={{ width: `${elapsed}%`, backgroundColor: STATUS[status].color }} />
          </div>
        </div>
      )}

      <dl className="grid grid-cols-[1.4fr_1fr_1fr] gap-3 border-t border-stone-100 px-5 py-3.5 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-stone-500">Deadline</dt>
          <dd className="mt-0.5 font-medium text-stone-900">
            <DueDate value={project.deadline} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Tasks</dt>
          <dd className="mt-0.5 font-medium text-stone-900 tabular-nums">{project.taskCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Estimate</dt>
          <dd className="mt-0.5 font-medium text-stone-900 tabular-nums">{formatHours(project.totalHours)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-5 py-3">
        <Person person={project.manager} detail="Project manager" />
        <span className="sr-only">
          {pluralize(project.taskCount, 'task')}, open project
        </span>
      </div>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-xs">
      <div className="space-y-3 p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-stone-100 px-5 py-4">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
      <div className="flex items-center gap-2 border-t border-stone-100 px-5 py-3">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  )
}
