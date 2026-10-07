import { ArrowUpRight, CalendarCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getMyTasks } from '../api'
import { Person } from '../components/Avatar'
import BarList from '../components/charts/BarList'
import ChartCard, { StatusLegend } from '../components/charts/ChartCard'
import Timeline from '../components/charts/Timeline'
import DueDate from '../components/DueDate'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import ExpandableText from '../components/ExpandableText'
import PageHeader from '../components/PageHeader'
import Skeleton, { SkeletonGroup } from '../components/Skeleton'
import StatStrip from '../components/StatStrip'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatHours, pluralize, sumBy } from '../lib/format'
import { statusCounts, taskRows } from '../lib/insights'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Groups deadline-sorted tasks by project; groups keep the order of their earliest task. */
function groupByProject(tasks) {
  const sorted = [...tasks].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
  const groups = new Map()
  for (const task of sorted) {
    if (!groups.has(task.project.id)) groups.set(task.project.id, { project: task.project, tasks: [] })
    groups.get(task.project.id).tasks.push(task)
  }
  return [...groups.values()]
}

function ProjectGroup({ project, tasks }) {
  const headingId = `project-${project.id}`
  return (
    <section aria-labelledby={headingId} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-stone-200 bg-stone-50/60 px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-stone-500">{project.clientName}</p>
          <h2 id={headingId} className="mt-0.5 text-[15px] font-semibold tracking-tight">
            <Link
              to={`/projects/${project.id}`}
              className="focus-ring group inline-flex items-center gap-1 rounded-sm hover:text-brand-800"
            >
              {project.name}
              <ArrowUpRight className="size-3.5 text-stone-400 group-hover:text-brand-700" aria-hidden="true" />
            </Link>
          </h2>
        </div>
        <Person person={project.manager} detail="Project manager" />
      </header>
      <ul className="divide-y divide-stone-100">
        {tasks.map((task) => (
          <li key={task.id} className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="font-medium text-stone-900">{task.title}</p>
              <ExpandableText text={task.description} className="mt-0.5" />
            </div>
            <dl className="flex items-start gap-6 text-sm sm:justify-end sm:text-right">
              <div>
                <dt className="sr-only">Deadline</dt>
                <dd className="text-stone-800">
                  <DueDate value={task.deadline} withHint className="sm:flex-col sm:items-end sm:gap-1" />
                </dd>
              </div>
              <div className="min-w-12">
                <dt className="sr-only">Estimate</dt>
                <dd className="font-medium text-stone-900 tabular-nums">{formatHours(task.estimatedHours)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <footer className="flex justify-between border-t border-stone-100 px-5 py-2.5 text-xs text-stone-500">
        <span>{pluralize(tasks.length, 'task')}</span>
        <span className="tabular-nums">{formatHours(sumBy(tasks, 'estimatedHours'))} in this project</span>
      </footer>
    </section>
  )
}

export default function MyTasksPage() {
  useDocumentTitle('My tasks')
  const { user } = useAuth()
  const { data, error, loading, reload } = useAsync(getMyTasks, [user.id], { cacheKey: `mine:${user.id}` })
  const tasks = data?.tasks ?? []
  const groups = groupByProject(tasks)
  const next = groups[0]?.tasks[0]
  const counts = statusCounts(tasks)
  const byProject = groups
    .map((group) => ({ ...group, hours: sumBy(group.tasks, 'estimatedHours') }))
    .sort((a, b) => b.hours - a.hours)

  return (
    <div className="space-y-8">
      <PageHeader
        title="My tasks"
        description={`Everything assigned to you, ${user.name.split(' ')[0]}, ordered by deadline.`}
      />

      {loading && (
        <SkeletonGroup label="Loading your tasks" className="space-y-8">
          <Skeleton className="h-[74px] rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </SkeletonGroup>
      )}

      {error && <ErrorBanner title="Couldn't load your tasks" error={error} onRetry={reload} />}

      {data && tasks.length === 0 && (
        <EmptyState
          icon={CalendarCheck}
          title="No tasks assigned to you"
          description="When a project includes work for you, your tasks will appear here."
        />
      )}

      {data && tasks.length > 0 && (
        <>
          <StatStrip
            items={[
              { label: 'Assigned tasks', value: tasks.length },
              { label: 'Total estimate', value: formatHours(data.totalHours ?? sumBy(tasks, 'estimatedHours')) },
              { label: 'Next deadline', value: next ? formatDate(next.deadline) : '—' },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ChartCard
              id="my-timeline"
              title="My timeline"
              description="Each bar is a task's estimated effort at 8 h/day, ending on its deadline."
              legend={<StatusLegend statuses={['overdue', 'soon', 'ontrack'].filter((key) => counts[key] > 0)} />}
            >
              <Timeline
                rows={taskRows(tasks, { sublabel: (task) => task.project?.name })}
                ariaLabel="My tasks by deadline"
                labelHeading="Task"
              />
            </ChartCard>
            <ChartCard id="by-project" title="Hours by project" description="Where your estimated effort goes.">
              <BarList
                ariaLabel="Hours per project"
                items={byProject.map((group) => ({
                  id: group.project.id,
                  label: group.project.name,
                  value: group.hours,
                  valueLabel: formatHours(group.hours),
                  detail: `${group.project.clientName ?? ''} · ${pluralize(group.tasks.length, 'task')}`,
                  to: `/projects/${group.project.id}`,
                }))}
              />
            </ChartCard>
          </div>
          <div className="space-y-5">
            {groups.map((group) => (
              <ProjectGroup key={group.project.id} project={group.project} tasks={group.tasks} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
