import { ArrowLeft, Info, Lock } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getProject } from '../api'
import Avatar, { Person } from '../components/Avatar'
import { ButtonLink } from '../components/Button'
import DueDate from '../components/DueDate'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Skeleton, { SkeletonGroup } from '../components/Skeleton'
import TaskTable, { TaskTableSkeleton } from '../components/TaskTable'
import { useAuth } from '../context/AuthContext'
import { formatHours, pluralize, sumBy } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

function backLinkFor(role) {
  return role === 'AGENT' ? { to: '/my-tasks', label: 'My tasks' } : { to: '/', label: role === 'ADMIN' ? 'Projects' : 'My projects' }
}

/** Hours per assignee, largest first. */
function workload(tasks) {
  const byPerson = new Map()
  for (const task of tasks) {
    if (!task.assignee) continue
    const entry = byPerson.get(task.assignee.id) ?? { ...task.assignee, hours: 0, count: 0 }
    entry.hours += Number(task.estimatedHours) || 0
    entry.count += 1
    byPerson.set(task.assignee.id, entry)
  }
  return [...byPerson.values()].sort((a, b) => b.hours - a.hours)
}

// 403 and 404 deliberately look the same, so the page never confirms that a
// project the user cannot open exists.
function NoAccess({ back }) {
  return (
    <EmptyState
      icon={Lock}
      title="You don't have access to this project"
      description="It may have been removed, or it isn't one of the projects shared with you."
      action={
        <ButtonLink to={back.to} variant="secondary">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to {back.label.toLowerCase()}
        </ButtonLink>
      }
      className="mt-6"
    />
  )
}

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-stone-900">{children}</dd>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const back = backLinkFor(user.role)
  const { data, error, loading, reload } = useAsync(() => getProject(id), [id, user.id])
  useDocumentTitle(data?.project?.name ?? 'Project')

  const noAccess = error && (error.status === 403 || error.status === 404)
  const project = data?.project
  const tasks = data?.tasks ?? []
  const people = workload(tasks)

  return (
    <div>
      <Link
        to={back.to}
        className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-[13px] text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {back.label}
      </Link>

      {noAccess && <NoAccess back={back} />}
      {error && !noAccess && <ErrorBanner className="mt-6" title="Couldn't load this project" error={error} onRetry={reload} />}

      {loading && (
        <SkeletonGroup label="Loading project" className="mt-4 space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-7 w-80 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <Skeleton className="h-20 rounded-xl" />
          <TaskTableSkeleton />
        </SkeletonGroup>
      )}

      {project && (
        <>
          <header className="mt-4">
            <p className="text-[13px] font-medium text-stone-500">{project.clientName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.625rem]">{project.name}</h1>
            {project.description && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">{project.description}</p>
            )}
          </header>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-xs sm:grid-cols-4">
            <Meta label="Project manager">
              <Person person={project.manager} />
            </Meta>
            <Meta label="Deadline">
              <DueDate value={project.deadline} withHint />
            </Meta>
            <Meta label={user.role === 'AGENT' ? 'Your tasks' : 'Tasks'}>
              <span className="tabular-nums">{tasks.length}</span>
            </Meta>
            <Meta label={user.role === 'AGENT' ? 'Your estimate' : 'Estimated effort'}>
              <span className="tabular-nums">{formatHours(sumBy(tasks, 'estimatedHours'))}</span>
            </Meta>
          </dl>

          <section aria-labelledby="tasks-heading" className="mt-10">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <h2 id="tasks-heading" className="text-base font-semibold">
                  Tasks
                </h2>
                {user.role === 'AGENT' && (
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-stone-500">
                    <Info className="size-3.5" aria-hidden="true" />
                    You only see tasks assigned to you.
                  </p>
                )}
              </div>
              {user.role !== 'AGENT' && people.length > 0 && (
                <ul aria-label="Effort by developer" className="flex flex-wrap gap-1.5">
                  {people.map((person) => (
                    <li
                      key={person.id}
                      title={`${person.name}: ${pluralize(person.count, 'task')}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white py-0.5 pr-2.5 pl-0.5 text-xs text-stone-700"
                    >
                      <Avatar id={person.id} name={person.name} size="xs" />
                      {person.name.split(' ')[0]}
                      <span className="font-medium text-stone-900 tabular-nums">{formatHours(person.hours)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {tasks.length > 0 ? (
              <TaskTable tasks={tasks} />
            ) : (
              <EmptyState title="No tasks yet" description="This project doesn't have any tasks." />
            )}
          </section>
        </>
      )}
    </div>
  )
}
