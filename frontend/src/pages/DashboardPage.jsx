import { FileText, FolderOpen, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getInsights, getProjects } from '../api'
import Avatar from '../components/Avatar'
import Button, { ButtonLink } from '../components/Button'
import BarList from '../components/charts/BarList'
import ChartCard, { StatusLegend } from '../components/charts/ChartCard'
import Timeline from '../components/charts/Timeline'
import WeekColumns from '../components/charts/WeekColumns'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import { Input, Select } from '../components/Field'
import PageHeader from '../components/PageHeader'
import ProjectCard, { ProjectCardSkeleton } from '../components/ProjectCard'
import Skeleton, { SkeletonGroup } from '../components/Skeleton'
import StatStrip from '../components/StatStrip'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'
import { formatDate, formatHours, pluralize, sumBy } from '../lib/format'
import { hoursByWeek, projectRows, statusCounts, workloadByPerson } from '../lib/insights'
import { STATUS, deadlineStatus, fromDay } from '../lib/schedule'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const TIMELINE_PREVIEW = 8

const SORTS = {
  deadline: { label: 'Deadline (soonest)', compare: (a, b) => String(a.deadline).localeCompare(String(b.deadline)) },
  recent: { label: 'Recently created', compare: (a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')) },
  effort: { label: 'Most effort', compare: (a, b) => (b.totalHours ?? 0) - (a.totalHours ?? 0) },
  name: { label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
}

function CreateFromTranscriptButton() {
  return (
    <ButtonLink to="/transcript">
      <FileText className="size-4" aria-hidden="true" />
      Create from Transcript
    </ButtonLink>
  )
}

function StatusFilter({ value, onChange, counts, total }) {
  const options = [
    { key: 'all', label: 'All', count: total },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'soon', label: STATUS.soon.short, count: counts.soon },
    { key: 'ontrack', label: 'On track', count: counts.ontrack },
  ]
  return (
    <div role="radiogroup" aria-label="Filter by status" className="inline-flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          onClick={() => onChange(option.key)}
          className={cx(
            'focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] transition-colors',
            value === option.key ? 'bg-white font-medium text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900',
          )}
        >
          {option.key !== 'all' && (
            <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: STATUS[option.key].color }} />
          )}
          {option.label}
          <span className="text-stone-400 tabular-nums">{option.count}</span>
        </button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user.role === 'ADMIN'
  useDocumentTitle(isAdmin ? 'Projects' : 'My projects')
  const { data, error, loading, reload } = useAsync(getProjects, [user.id], { cacheKey: `projects:${user.id}` })
  const insights = useAsync(getInsights, [user.id], { cacheKey: `insights:${user.id}` })
  const projects = useMemo(() => data?.projects ?? [], [data])
  const tasks = useMemo(() => insights.data?.tasks ?? [], [insights.data])

  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('deadline')
  const [showAllTimeline, setShowAllTimeline] = useState(false)

  const counts = useMemo(() => statusCounts(projects), [projects])
  const timeline = useMemo(() => projectRows(projects, tasks), [projects, tasks])
  const workload = useMemo(() => workloadByPerson(tasks), [tasks])
  const weeks = useMemo(() => hoursByWeek(tasks), [tasks])
  const busiest = weeks.reduce((top, week) => (week.hours > (top?.hours ?? 0) ? week : top), null)
  const taskCounts = useMemo(() => statusCounts(tasks), [tasks])

  const visibleProjects = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects
      .filter((project) => status === 'all' || deadlineStatus(project.deadline) === status)
      .filter(
        (project) =>
          !needle ||
          [project.name, project.clientName, project.manager?.name].some((text) => String(text ?? '').toLowerCase().includes(needle)),
      )
      .sort(SORTS[sort].compare)
  }, [projects, status, query, sort])

  const nextDeadline = [...projects]
    .filter((project) => deadlineStatus(project.deadline) !== 'overdue')
    .sort(SORTS.deadline.compare)[0]
  const statuses = ['overdue', 'soon', 'ontrack'].filter((key) => counts[key] > 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? 'Projects' : 'My projects'}
        description={
          isAdmin
            ? 'Every active project at NovaWorks: delivery timeline, team workload and estimated effort.'
            : 'Projects you manage, when they are due and who is carrying the work.'
        }
        actions={isAdmin && <CreateFromTranscriptButton />}
      />

      {loading && (
        <SkeletonGroup label="Loading projects" className="space-y-8">
          <Skeleton className="h-[86px] rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
            <ProjectCardSkeleton />
          </div>
        </SkeletonGroup>
      )}

      {error && <ErrorBanner title="Couldn't load projects" error={error} onRetry={reload} />}

      {data && projects.length === 0 && (
        <EmptyState
          icon={isAdmin ? FileText : FolderOpen}
          title="No projects yet"
          description={
            isAdmin
              ? 'Paste a meeting transcript to create your first projects.'
              : 'Projects you manage will appear here once they are created.'
          }
          action={isAdmin && <CreateFromTranscriptButton />}
        />
      )}

      {data && projects.length > 0 && (
        <>
          <StatStrip
            items={[
              { label: 'Projects', value: projects.length, detail: `${pluralize(new Set(projects.map((p) => p.clientName)).size, 'client')}` },
              { label: 'Tasks', value: sumBy(projects, 'taskCount'), detail: workload.length ? `across ${pluralize(workload.length, 'developer')}` : undefined },
              { label: 'Estimated effort', value: formatHours(sumBy(projects, 'totalHours')), detail: `≈ ${Math.round(sumBy(projects, 'totalHours') / 8)} working days` },
              {
                label: counts.overdue ? 'Overdue projects' : 'Next deadline',
                value: counts.overdue ? counts.overdue : nextDeadline ? formatDate(nextDeadline.deadline) : '—',
                detail: counts.overdue
                  ? `${counts.soon} more due within 7 days`
                  : nextDeadline?.name,
              },
            ]}
          />

          <ChartCard
            id="delivery"
            title="Delivery timeline"
            description="Each bar runs from when the project was created to its deadline. Dots are task deadlines."
            legend={<StatusLegend statuses={statuses} />}
          >
            <Timeline
              rows={showAllTimeline ? timeline : timeline.slice(0, TIMELINE_PREVIEW)}
              ariaLabel="Projects by deadline"
              labelHeading="Project"
            />
            {timeline.length > TIMELINE_PREVIEW && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAllTimeline((value) => !value)}>
                {showAllTimeline ? 'Show fewer' : `Show all ${timeline.length} projects`}
              </Button>
            )}
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              id="workload"
              title="Workload by developer"
              description={isAdmin ? 'Estimated hours assigned to each developer.' : 'Estimated hours each developer has in your projects.'}
            >
              {insights.loading && <Skeleton className="h-56 rounded-lg" />}
              {insights.error && <ErrorBanner error={insights.error} title="Couldn't load workload" onRetry={insights.reload} />}
              {insights.data && workload.length === 0 && <p className="text-sm text-stone-500">No assigned tasks yet.</p>}
              {insights.data && workload.length > 0 && (
                <BarList
                  ariaLabel="Hours per developer"
                  items={workload.map((person) => ({
                    id: person.id,
                    label: person.name,
                    leading: <Avatar id={person.id} name={person.name} size="xs" />,
                    value: person.hours,
                    valueLabel: formatHours(person.hours),
                    detail: `${pluralize(person.count, 'task')} · next due ${formatDate(person.next)}`,
                  }))}
                />
              )}
            </ChartCard>

            <ChartCard
              id="weekly"
              title="Upcoming work"
              description={
                taskCounts.overdue
                  ? `${pluralize(taskCounts.overdue, 'task')} already past deadline are not shown.`
                  : 'Hours due in each of the next eight weeks.'
              }
            >
              {insights.loading && <Skeleton className="h-56 rounded-lg" />}
              {insights.data && <WeekColumns buckets={weeks} ariaLabel="Hours due per week" />}
              {insights.data && busiest && busiest.hours > 0 && (
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-stone-500">Busiest week</dt>
                    <dd className="mt-0.5 font-medium text-stone-900">
                      {formatDate(fromDay(busiest.day))} · {formatHours(busiest.hours)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-stone-500">Next 8 weeks</dt>
                    <dd className="mt-0.5 font-medium text-stone-900">
                      {formatHours(sumBy(weeks, 'hours'))} · {pluralize(sumBy(weeks, 'count'), 'task')}
                    </dd>
                  </div>
                </dl>
              )}
            </ChartCard>
          </div>

          <section aria-labelledby="projects-heading" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="projects-heading" className="text-base font-semibold">
                All projects <span className="font-normal text-stone-400 tabular-nums">{visibleProjects.length}</span>
              </h2>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                  <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects, clients…"
                    aria-label="Search projects"
                    className="pl-8"
                  />
                </div>
                <Select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort projects" className="!w-auto">
                  {Object.entries(SORTS).map(([key, option]) => (
                    <option key={key} value={key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <StatusFilter value={status} onChange={setStatus} counts={counts} total={projects.length} />

            {visibleProjects.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No matching projects"
                description="Try a different search or status filter."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      setStatus('all')
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleProjects.map((project) => (
                  <li key={project.id} className="flex">
                    <ProjectCard project={project} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
