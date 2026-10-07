import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import { cx } from '../../lib/cx'
import { buildPath, describeIssuePath, draftTotals, fieldDomId, focusTargetId, groupIssues } from '../../lib/draft'
import { formatHours, pluralize, sumBy } from '../../lib/format'
import Badge from '../Badge'
import Button from '../Button'
import ErrorBanner from '../ErrorBanner'
import { FieldError, Input, Label, Select, Textarea } from '../Field'

function focusIssue(path) {
  const element = document.getElementById(focusTargetId(path))
  if (!element) return
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  element.focus({ preventScroll: true })
}

/** Label + control + inline issue messages, wired together for screen readers. */
function DraftField({ path, label, issueMap, className, children }) {
  const id = fieldDomId(path)
  const messages = issueMap.get(path)
  const errorId = messages ? `${id}-error` : undefined
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, invalid: Boolean(messages), 'aria-describedby': errorId })}
      <FieldError id={errorId} messages={messages} />
    </div>
  )
}

function PersonSelect({ value, people, placeholder, onChange, ...props }) {
  const known = people.some((person) => person.id === value)
  return (
    <Select value={value ?? ''} onChange={(event) => onChange(event.target.value || null)} {...props}>
      <option value="">{placeholder}</option>
      {value && !known && <option value={value}>{value} (not in team)</option>}
      {people.map((person) => (
        <option key={person.id} value={person.id}>
          {person.name} · {person.specialization}
        </option>
      ))}
    </Select>
  )
}

function countIssuesWithin(issueMap, prefix) {
  let count = 0
  for (const [path, messages] of issueMap) {
    if (path === prefix || path.startsWith(`${prefix}.`)) count += messages.length
  }
  return count
}

function IssueSummary({ issues, draft }) {
  if (issues.length === 0) {
    return (
      <div className="flex gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
        <p className="text-brand-900">
          Every flagged field has been edited. Revalidate to check the draft again and save it.
        </p>
      </div>
    )
  }

  return (
    <section aria-labelledby="issues-heading" className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="issues-heading" className="text-sm font-semibold text-amber-950">
            Needs correction · {pluralize(issues.length, 'issue')}
          </h2>
          <p className="mt-0.5 text-sm text-amber-900">
            Nothing has been saved. Fix the highlighted fields below, then revalidate.
          </p>
          <ul className="mt-3 space-y-1.5">
            {issues.map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                <button
                  type="button"
                  onClick={() => focusIssue(issue.path)}
                  className="focus-ring group w-full rounded-md text-left text-sm"
                >
                  <span className="font-medium text-amber-950 underline decoration-amber-300 underline-offset-2 group-hover:decoration-amber-600">
                    {describeIssuePath(issue.path, draft)}
                  </span>
                  <span className="text-amber-900">: {issue.message}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function TaskEditor({ task, project, index, issueMap, agents, onField, onRemove }) {
  const at = buildPath(project, index)
  const issueCount = countIssuesWithin(issueMap, at)
  const set = (field) => (value) => onField(project, index, field, value)

  return (
    <li
      id={fieldDomId(at)}
      tabIndex={-1}
      className={cx(
        'rounded-lg border p-4 outline-none',
        issueCount ? 'border-red-200 bg-red-50/30' : 'border-stone-200 bg-stone-50/50',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-stone-500">
          Task {index + 1}
          {issueCount > 0 && (
            <Badge tone="red" className="ml-2">
              {pluralize(issueCount, 'issue')}
            </Badge>
          )}
        </p>
        <Button variant="danger" size="sm" onClick={onRemove} aria-label={`Remove task ${task.title || index + 1}`}>
          <Trash2 className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Remove</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_96px]">
        <DraftField path={`${at}.title`} label="Title" issueMap={issueMap} className="sm:col-span-2 lg:col-span-1">
          {(props) => <Input {...props} value={task.title} onChange={(event) => set('title')(event.target.value)} />}
        </DraftField>
        <DraftField path={`${at}.assigneeId`} label="Assignee" issueMap={issueMap}>
          {(props) => (
            <PersonSelect {...props} value={task.assigneeId} people={agents} placeholder="Choose a developer" onChange={set('assigneeId')} />
          )}
        </DraftField>
        <DraftField path={`${at}.deadline`} label="Deadline" issueMap={issueMap}>
          {(props) => (
            <Input {...props} type="date" value={task.deadline ?? ''} onChange={(event) => set('deadline')(event.target.value || null)} />
          )}
        </DraftField>
        <DraftField path={`${at}.estimatedHours`} label="Hours" issueMap={issueMap}>
          {(props) => (
            <Input
              {...props}
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              className="tabular-nums"
              value={task.estimatedHours ?? ''}
              onChange={(event) => set('estimatedHours')(event.target.value === '' ? null : Number(event.target.value))}
            />
          )}
        </DraftField>
        <DraftField path={`${at}.description`} label="Description" issueMap={issueMap} className="sm:col-span-2 lg:col-span-4">
          {(props) => (
            <Textarea {...props} rows={2} value={task.description} onChange={(event) => set('description')(event.target.value)} />
          )}
        </DraftField>
      </div>
    </li>
  )
}

function ProjectEditor({ project, index, issueMap, managers, agents, canRemove, onField, onRemoveTask, onRemoveProject }) {
  const at = buildPath(index)
  const issueCount = countIssuesWithin(issueMap, at)
  const set = (field) => (value) => onField(index, null, field, value)

  return (
    <section
      id={fieldDomId(at)}
      tabIndex={-1}
      aria-label={`Project ${index + 1}: ${project.name || 'untitled'}`}
      className="rounded-xl border border-stone-200 bg-white shadow-xs outline-none"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-mono text-xs text-stone-400">P{index + 1}</span>
          <h3 className="truncate font-semibold tracking-tight">{project.name || 'Untitled project'}</h3>
          {issueCount > 0 && <Badge tone="red">{pluralize(issueCount, 'issue')}</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500 tabular-nums">
            {pluralize(project.tasks.length, 'task')} · {formatHours(sumBy(project.tasks, 'estimatedHours'))}
          </span>
          {canRemove && (
            <Button variant="danger" size="sm" onClick={onRemoveProject} aria-label={`Remove project ${project.name || index + 1}`}>
              <Trash2 className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Remove project</span>
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DraftField path={`${at}.name`} label="Project name" issueMap={issueMap}>
            {(props) => <Input {...props} value={project.name} onChange={(event) => set('name')(event.target.value)} />}
          </DraftField>
          <DraftField path={`${at}.clientName`} label="Client" issueMap={issueMap}>
            {(props) => <Input {...props} value={project.clientName} onChange={(event) => set('clientName')(event.target.value)} />}
          </DraftField>
          <DraftField path={`${at}.managerId`} label="Project manager" issueMap={issueMap}>
            {(props) => (
              <PersonSelect {...props} value={project.managerId} people={managers} placeholder="Choose a manager" onChange={set('managerId')} />
            )}
          </DraftField>
          <DraftField path={`${at}.deadline`} label="Deadline" issueMap={issueMap}>
            {(props) => (
              <Input {...props} type="date" value={project.deadline ?? ''} onChange={(event) => set('deadline')(event.target.value || null)} />
            )}
          </DraftField>
          <DraftField path={`${at}.description`} label="Description" issueMap={issueMap} className="sm:col-span-2">
            {(props) => (
              <Textarea {...props} rows={2} value={project.description} onChange={(event) => set('description')(event.target.value)} />
            )}
          </DraftField>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-stone-900">Tasks</h4>
          {project.tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
              This project has no tasks.
            </p>
          ) : (
            <ol className="space-y-3">
              {project.tasks.map((task, taskIndex) => (
                <TaskEditor
                  key={taskIndex}
                  task={task}
                  project={index}
                  index={taskIndex}
                  issueMap={issueMap}
                  agents={agents}
                  onField={onField}
                  onRemove={() => onRemoveTask(index, taskIndex)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  )
}

export default function DraftEditor({
  draft,
  issues,
  team,
  teamError,
  onRetryTeam,
  error,
  onDismissError,
  saving,
  onField,
  onRemoveTask,
  onRemoveProject,
  onSave,
  onDiscard,
}) {
  const issueMap = groupIssues(issues)
  const managers = team.filter((member) => member.role === 'MANAGER')
  const agents = team.filter((member) => member.role === 'AGENT')
  const totals = draftTotals(draft)

  function handleSubmit(event) {
    event.preventDefault()
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <IssueSummary issues={issues} draft={draft} />
      {teamError && (
        <ErrorBanner
          title="Couldn't load the team directory"
          message="Manager and developer lists may be incomplete."
          onRetry={onRetryTeam}
        />
      )}
      {error && <ErrorBanner title="The draft wasn't saved" error={error} onDismiss={onDismissError} />}

      <p className="text-sm text-stone-600">
        The AI drafted <strong className="font-medium text-stone-900">{pluralize(totals.projects, 'project')}</strong> with{' '}
        <strong className="font-medium text-stone-900">{pluralize(totals.tasks, 'task')}</strong> (
        {formatHours(totals.hours)}). Remove anything that shouldn&apos;t become work.
      </p>

      {draft.projects.map((project, index) => (
        <ProjectEditor
          key={index}
          project={project}
          index={index}
          issueMap={issueMap}
          managers={managers}
          agents={agents}
          canRemove={draft.projects.length > 1}
          onField={onField}
          onRemoveTask={onRemoveTask}
          onRemoveProject={() => onRemoveProject(index)}
        />
      ))}

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-lg shadow-stone-900/5 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pl-5">
        <p className="text-sm text-stone-600">
          {issues.length > 0 ? (
            <>
              <span className="font-medium text-amber-800">{pluralize(issues.length, 'open issue')}</span>
              <span className="hidden sm:inline"> · the server checks everything again on save</span>
            </>
          ) : (
            'Ready to revalidate and save'
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            Discard draft
          </Button>
          <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
            Revalidate and Save
          </Button>
        </div>
      </div>
    </form>
  )
}
