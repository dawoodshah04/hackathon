import { formatHours, pluralize, sumBy } from '../lib/format'
import { Person } from './Avatar'
import DueDate from './DueDate'
import ExpandableText from './ExpandableText'
import Skeleton from './Skeleton'

const byDeadline = (a, b) => String(a.deadline).localeCompare(String(b.deadline))

export default function TaskTable({ tasks }) {
  const rows = [...tasks].sort(byDeadline)
  const totalHours = sumBy(rows, 'estimatedHours')

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
      {/* Desktop and tablet: a real table. */}
      <table className="hidden w-full text-left text-sm md:table">
        <caption className="sr-only">Project tasks, ordered by deadline</caption>
        <thead className="border-b border-stone-200 bg-stone-50/70 text-xs text-stone-500">
          <tr>
            <th scope="col" className="py-2.5 pr-3 pl-5 font-medium">Task</th>
            <th scope="col" className="w-48 px-3 py-2.5 font-medium">Assignee</th>
            <th scope="col" className="w-36 px-3 py-2.5 font-medium">Deadline</th>
            <th scope="col" className="w-24 py-2.5 pr-5 pl-3 text-right font-medium">Estimate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((task) => (
            <tr key={task.id} className="align-top transition-colors hover:bg-stone-50/60">
              <td className="py-3.5 pr-3 pl-5">
                <p className="font-medium text-stone-900">{task.title}</p>
                <ExpandableText text={task.description} className="mt-0.5 max-w-xl" />
              </td>
              <td className="px-3 py-3.5">
                <Person person={task.assignee} />
              </td>
              <td className="px-3 py-3.5 text-stone-800">
                <DueDate value={task.deadline} />
              </td>
              <td className="py-3.5 pr-5 pl-3 text-right font-medium text-stone-900 tabular-nums">
                {formatHours(task.estimatedHours)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-stone-200 bg-stone-50/70">
          <tr>
            <th scope="row" colSpan={3} className="py-3 pr-3 pl-5 text-sm font-medium text-stone-600">
              Total · {pluralize(rows.length, 'task')}
            </th>
            <td className="py-3 pr-5 pl-3 text-right font-semibold text-stone-900 tabular-nums">{formatHours(totalHours)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Mobile: stacked rows keep every field readable without horizontal scrolling. */}
      <ul className="divide-y divide-stone-100 md:hidden">
        {rows.map((task) => (
          <li key={task.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-stone-900">{task.title}</p>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatHours(task.estimatedHours)}</span>
            </div>
            <ExpandableText text={task.description} className="mt-1" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-700">
              <Person person={task.assignee} />
              <DueDate value={task.deadline} />
            </div>
          </li>
        ))}
        <li className="flex justify-between bg-stone-50/70 px-4 py-3 text-sm">
          <span className="font-medium text-stone-600">Total · {pluralize(rows.length, 'task')}</span>
          <span className="font-semibold tabular-nums">{formatHours(totalHours)}</span>
        </li>
      </ul>
    </div>
  )
}

export function TaskTableSkeleton({ rows = 4 }) {
  return (
    <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white shadow-xs">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-6 px-5 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="hidden h-6 w-32 md:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}
