// Helpers for editing an AI draft (contract section 8) and the validation
// issues that point into it by path, e.g. "projects[0].tasks[2].assigneeId".

const PATH_PATTERN = /^projects\[(\d+)\](?:\.tasks\[(\d+)\])?(?:\.(\w+))?$/

const FIELD_LABELS = {
  name: 'Name',
  clientName: 'Client',
  description: 'Description',
  managerId: 'Manager',
  deadline: 'Deadline',
  title: 'Title',
  assigneeId: 'Assignee',
  estimatedHours: 'Hours',
}

export function parseIssuePath(path) {
  const match = PATH_PATTERN.exec(String(path ?? '').replace(/^draft\./, ''))
  if (!match) return null
  return {
    project: Number(match[1]),
    task: match[2] === undefined ? null : Number(match[2]),
    field: match[3] ?? null,
  }
}

export function buildPath(project, task, field) {
  let path = `projects[${project}]`
  if (task !== null && task !== undefined) path += `.tasks[${task}]`
  if (field) path += `.${field}`
  return path
}

/** Stable DOM id for the control (or card) an issue path points at. */
export function fieldDomId(path) {
  return `draft-${String(path).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

/** Map of normalised path -> list of messages. */
export function groupIssues(issues) {
  const map = new Map()
  for (const issue of issues) {
    const parsed = parseIssuePath(issue.path)
    const key = parsed ? buildPath(parsed.project, parsed.task, parsed.field) : issue.path
    map.set(key, [...(map.get(key) ?? []), issue.message])
  }
  return map
}

/** "UrbanCart Website › Product and cart APIs › Assignee" */
export function describeIssuePath(path, draft) {
  const parsed = parseIssuePath(path)
  if (!parsed) return 'Draft'
  const project = draft?.projects?.[parsed.project]
  const parts = [project?.name?.trim() || `Project ${parsed.project + 1}`]
  if (parsed.task !== null) parts.push(project?.tasks?.[parsed.task]?.title?.trim() || `Task ${parsed.task + 1}`)
  if (parsed.field) parts.push(FIELD_LABELS[parsed.field] ?? parsed.field)
  return parts.join(' › ')
}

/** Where to send keyboard focus for an issue: the field, else its task or project card. */
export function focusTargetId(path) {
  const parsed = parseIssuePath(path)
  if (!parsed) return null
  return fieldDomId(buildPath(parsed.project, parsed.task, parsed.field))
}

/** Guarantees the shape the editor relies on, whatever the AI returned. */
export function normalizeDraft(draft) {
  const projects = Array.isArray(draft?.projects) ? draft.projects : []
  return {
    projects: projects.map((project) => ({
      name: project?.name ?? '',
      clientName: project?.clientName ?? '',
      description: project?.description ?? '',
      managerId: project?.managerId ?? null,
      deadline: project?.deadline ?? null,
      tasks: (Array.isArray(project?.tasks) ? project.tasks : []).map((task) => ({
        title: task?.title ?? '',
        description: task?.description ?? '',
        assigneeId: task?.assigneeId ?? null,
        deadline: task?.deadline ?? null,
        estimatedHours: task?.estimatedHours ?? null,
      })),
    })),
  }
}

export function updateDraftField(draft, project, task, field, value) {
  return {
    ...draft,
    projects: draft.projects.map((current, p) => {
      if (p !== project) return current
      if (task === null) return { ...current, [field]: value }
      return {
        ...current,
        tasks: current.tasks.map((currentTask, t) => (t === task ? { ...currentTask, [field]: value } : currentTask)),
      }
    }),
  }
}

export function removeDraftTask(draft, project, task) {
  return {
    ...draft,
    projects: draft.projects.map((current, p) =>
      p === project ? { ...current, tasks: current.tasks.filter((_, t) => t !== task) } : current,
    ),
  }
}

export function removeDraftProject(draft, project) {
  return { ...draft, projects: draft.projects.filter((_, p) => p !== project) }
}

/** Drops issues for a removed task and shifts later task indexes down by one. */
export function reindexIssuesAfterTaskRemoval(issues, project, task) {
  return issues.flatMap((issue) => {
    const parsed = parseIssuePath(issue.path)
    if (!parsed || parsed.project !== project || parsed.task === null) return [issue]
    if (parsed.task === task) return []
    if (parsed.task < task) return [issue]
    return [{ ...issue, path: buildPath(parsed.project, parsed.task - 1, parsed.field) }]
  })
}

/** Drops issues for a removed project and shifts later project indexes down by one. */
export function reindexIssuesAfterProjectRemoval(issues, project) {
  return issues.flatMap((issue) => {
    const parsed = parseIssuePath(issue.path)
    if (!parsed) return [issue]
    if (parsed.project === project) return []
    if (parsed.project < project) return [issue]
    return [{ ...issue, path: buildPath(parsed.project - 1, parsed.task, parsed.field) }]
  })
}

export function draftTotals(draft) {
  const tasks = draft.projects.flatMap((project) => project.tasks)
  return {
    projects: draft.projects.length,
    tasks: tasks.length,
    hours: tasks.reduce((total, task) => total + (Number(task.estimatedHours) || 0), 0),
  }
}
