// Turns API responses into chart rows. Pure functions, no React.

import { formatHours, pluralize } from './format'
import { deadlineStatus, effortDays, fromDay, toDay, todayDay, weekStart } from './schedule'

/** Hours, task count and next deadline per assignee, largest load first. */
export function workloadByPerson(tasks) {
  const byPerson = new Map()
  for (const task of tasks) {
    if (!task.assignee?.id) continue
    const entry = byPerson.get(task.assignee.id) ?? { ...task.assignee, hours: 0, count: 0, next: null }
    entry.hours += Number(task.estimatedHours) || 0
    entry.count += 1
    if (!entry.next || String(task.deadline) < entry.next) entry.next = task.deadline
    byPerson.set(task.assignee.id, entry)
  }
  return [...byPerson.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))
}

/** One timeline row per project: creation to deadline, task deadlines as milestones. */
export function projectRows(projects, tasks = []) {
  const today = todayDay()
  const tasksByProject = new Map()
  for (const task of tasks) {
    if (!tasksByProject.has(task.projectId)) tasksByProject.set(task.projectId, [])
    tasksByProject.get(task.projectId).push(task)
  }
  return [...projects]
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .map((project) => {
      const projectTasks = tasksByProject.get(project.id) ?? []
      const deadlineDay = toDay(project.deadline)
      const createdDay = toDay(project.createdAt)
      // Fall back to a two-week window when the creation date is unknown or after the deadline.
      const start = createdDay !== null && createdDay <= deadlineDay ? project.createdAt : fromDay(Math.min(deadlineDay - 14, today))
      return {
        id: project.id,
        label: project.name,
        sublabel: `${project.clientName} · ${formatHours(project.totalHours)}`,
        start,
        end: project.deadline,
        status: deadlineStatus(project.deadline, today),
        to: `/projects/${project.id}`,
        markers: projectTasks.map((task) => ({ date: task.deadline, label: task.title })),
        details: [
          `Manager: ${project.manager?.name || '—'}`,
          `${pluralize(project.taskCount ?? projectTasks.length, 'task')} · ${formatHours(project.totalHours)}`,
        ],
      }
    })
}

/**
 * One timeline row per task. Without start dates in the data, each bar shows the
 * task's effort (8 h/day) ending on its deadline, which is when the work must happen.
 */
export function taskRows(tasks, { sublabel } = {}) {
  const today = todayDay()
  return [...tasks]
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .map((task) => {
      const end = toDay(task.deadline)
      return {
        id: task.id,
        label: task.title,
        sublabel: sublabel ? sublabel(task) : task.assignee?.name,
        start: end === null ? task.deadline : fromDay(end - effortDays(task.estimatedHours) + 1),
        end: task.deadline,
        status: deadlineStatus(task.deadline, today),
        details: [
          `${formatHours(task.estimatedHours)} of effort`,
          task.assignee?.name ? `Assignee: ${task.assignee.name}` : null,
        ].filter(Boolean),
      }
    })
}

/** Counts of projects (or tasks) per delivery status. */
export function statusCounts(items) {
  const today = todayDay()
  const counts = { overdue: 0, soon: 0, ontrack: 0 }
  for (const item of items) counts[deadlineStatus(item.deadline, today)] += 1
  return counts
}

/** Buckets tasks by the week of their deadline, starting with the current week. */
export function hoursByWeek(tasks, weeks = 8) {
  const thisWeek = weekStart(todayDay())
  const buckets = Array.from({ length: weeks }, (_, index) => ({
    day: thisWeek + index * 7,
    hours: 0,
    count: 0,
  }))
  for (const task of tasks) {
    const day = toDay(task.deadline)
    if (day === null) continue
    const index = Math.floor((day - thisWeek) / 7)
    if (index < 0 || index >= weeks) continue
    buckets[index].hours += Number(task.estimatedHours) || 0
    buckets[index].count += 1
  }
  return buckets
}
