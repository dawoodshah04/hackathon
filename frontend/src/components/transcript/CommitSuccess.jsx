import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatHours, pluralize } from '../../lib/format'
import { Person } from '../Avatar'
import Button, { ButtonLink } from '../Button'
import DueDate from '../DueDate'

export default function CommitSuccess({ result, team, onStartOver }) {
  const { projects, totals } = result
  const findPerson = (id) => team.find((member) => member.id === id) ?? null

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-200">
          <Check className="size-5" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          {pluralize(totals.projects, 'project')}, {pluralize(totals.tasks, 'task')} created
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">
          {formatHours(totals.hours)} of estimated work is saved and assigned. Managers and developers can see their part
          as soon as they sign in.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink to="/">View all projects</ButtonLink>
          <Button variant="secondary" onClick={onStartOver}>
            Process another transcript
          </Button>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <Link
              to={`/projects/${project.id}`}
              className="focus-ring group flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-xs transition hover:border-stone-300 hover:shadow-md hover:shadow-stone-900/[0.04]"
            >
              <p className="truncate text-xs font-medium text-stone-500">{project.clientName}</p>
              <h3 className="mt-1 font-semibold tracking-tight">{project.name}</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500">Manager</dt>
                  <dd className="min-w-0">
                    <Person person={findPerson(project.managerId)} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500">Deadline</dt>
                  <dd className="font-medium">
                    <DueDate value={project.deadline} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-stone-500">Work</dt>
                  <dd className="font-medium tabular-nums">
                    {pluralize(project.taskCount, 'task')} · {formatHours(project.totalHours)}
                  </dd>
                </div>
              </dl>
              <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-brand-700 group-hover:text-brand-900">
                Open project
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
