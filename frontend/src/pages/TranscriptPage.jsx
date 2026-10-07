import { AlertTriangle, ArrowRight, FileUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { USE_MOCK, commitDraft, createDraft, getTeam } from '../api'
import Button from '../components/Button'
import ErrorBanner from '../components/ErrorBanner'
import { Label, Textarea } from '../components/Field'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/Toast'
import CommitSuccess from '../components/transcript/CommitSuccess'
import DraftEditor from '../components/transcript/DraftEditor'
import ProcessingSteps from '../components/transcript/ProcessingSteps'
import { useAuth } from '../context/AuthContext'
import {
  normalizeDraft,
  reindexIssuesAfterProjectRemoval,
  reindexIssuesAfterTaskRemoval,
  removeDraftProject,
  removeDraftTask,
  updateDraftField,
  buildPath,
} from '../lib/draft'
import { countWords, pluralize } from '../lib/format'
import { useAsync } from '../lib/useAsync'
import { useDocumentTitle } from '../lib/useDocumentTitle'

// Stage indexes into PROCESSING_STEPS.
const STAGE = { READING: 0, EXTRACTING: 1, VALIDATING: 2, SAVING: 3 }

const GUIDANCE = [
  'Paste the whole meeting. Later corrections and the final recap take priority over earlier statements.',
  'People are matched against the team directory. Anyone the AI cannot match is flagged for you to choose.',
  'Every date and assignment is validated on the server. Nothing is saved unless the whole draft is valid.',
]

function friendlyError(error) {
  if (error?.code === 'EMPTY_TRANSCRIPT') return { title: 'The transcript is empty', message: 'Paste the meeting transcript, then try again.' }
  if (error?.code === 'NETWORK') return { title: 'Cannot reach the server', message: 'Check your connection, then try again.' }
  if (error?.code === 'TIMEOUT') return { title: 'This is taking too long', message: 'The server did not answer in time. Try again in a moment.' }
  if (error?.code === 'BUSY') return { title: 'Another save is in progress', message: 'Wait a few seconds, then save again.' }
  return { title: 'Something went wrong', message: error?.message }
}

export default function TranscriptPage() {
  useDocumentTitle('Create from Transcript')
  const { user } = useAuth()
  const toast = useToast()
  const team = useAsync(getTeam, [user.id])

  const [transcript, setTranscript] = useState('')
  const [view, setView] = useState('compose') // compose | processing | review | success | failed
  const [stage, setStage] = useState(STAGE.READING)
  const [draft, setDraft] = useState(null)
  const [issues, setIssues] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const busy = useRef(false)
  const stageTimer = useRef(null)
  const fileInput = useRef(null)
  const words = countWords(transcript)
  const canSubmit = transcript.trim().length > 0 && view === 'compose'

  useEffect(() => () => clearTimeout(stageTimer.current), [])

  // Warn before a reload or tab close would throw away an unsaved draft.
  useEffect(() => {
    if (view !== 'review' && view !== 'processing') return undefined
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [view])

  const finish = useCallback(
    (response) => {
      setResult(response)
      setView('success')
      window.scrollTo({ top: 0 })
      setDraft(null)
      setIssues([])
      toast.success('Projects created', {
        description: `${pluralize(response.totals.projects, 'project')} and ${pluralize(response.totals.tasks, 'task')} saved.`,
      })
    },
    [toast],
  )

  const openReview = useCallback((nextDraft, nextIssues) => {
    setDraft(normalizeDraft(nextDraft))
    setIssues(nextIssues)
    setView('review')
    window.scrollTo({ top: 0 })
  }, [])

  async function generate() {
    if (busy.current || !transcript.trim()) return
    busy.current = true
    setError(null)
    setView('processing')
    setStage(STAGE.READING)
    stageTimer.current = setTimeout(() => setStage(STAGE.EXTRACTING), 900)

    let generated = null
    try {
      const response = await createDraft(transcript)
      generated = response.draft
      clearTimeout(stageTimer.current)
      setStage(STAGE.VALIDATING)

      if (response.issues?.length) {
        openReview(generated, response.issues)
        toast.info('Draft needs a few corrections', { description: pluralize(response.issues.length, 'issue') + ' to review.' })
        return
      }

      setStage(STAGE.SAVING)
      finish(await commitDraft(generated))
    } catch (err) {
      clearTimeout(stageTimer.current)
      if (err.code === 'VALIDATION_FAILED' && generated) {
        openReview(generated, err.issues)
      } else if (generated) {
        // The draft exists but saving failed (busy, network): keep it so nothing is lost.
        openReview(generated, [])
        setError(err)
      } else if (err.code === 'AI_FAILED' || err.status === 502) {
        setError(err)
        setView('failed')
      } else {
        setError(err)
        setView('compose')
      }
    } finally {
      busy.current = false
    }
  }

  async function save() {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError(null)
    try {
      finish(await commitDraft(draft))
    } catch (err) {
      if (err.code === 'VALIDATION_FAILED') {
        setIssues(err.issues)
        toast.error('Still not valid', { description: `${pluralize(err.issues.length, 'issue')} left to fix.` })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setError(err)
      }
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  function editField(project, task, field, value) {
    setDraft((current) => updateDraftField(current, project, task, field, value))
    // Editing a flagged field clears its flag; the server re-checks everything on save.
    const path = buildPath(project, task, field)
    setIssues((current) => current.filter((issue) => String(issue.path).replace(/^draft\./, '') !== path))
  }

  function restorable(message) {
    const snapshot = { draft, issues }
    toast.info(message, {
      action: {
        label: 'Undo',
        onClick: () => {
          setDraft(snapshot.draft)
          setIssues(snapshot.issues)
          setView('review')
        },
      },
    })
  }

  function removeTask(project, task) {
    restorable('Task removed')
    setDraft((current) => removeDraftTask(current, project, task))
    setIssues((current) => reindexIssuesAfterTaskRemoval(current, project, task))
  }

  function removeProject(project) {
    restorable('Project removed')
    setDraft((current) => removeDraftProject(current, project))
    setIssues((current) => reindexIssuesAfterProjectRemoval(current, project))
  }

  function discard() {
    restorable('Draft discarded')
    setDraft(null)
    setIssues([])
    setError(null)
    setView('compose')
  }

  function startOver() {
    setTranscript('')
    setResult(null)
    setError(null)
    setView('compose')
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      setTranscript(await file.text())
      setError(null)
    } catch {
      toast.error("Couldn't read that file", { description: 'Use a plain text (.txt) transcript.' })
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      generate()
    }
  }

  const teamMembers = team.data?.users ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title={view === 'review' ? 'Review the draft' : view === 'success' ? 'Projects created' : 'Create from Transcript'}
        description={
          view === 'review'
            ? 'The AI draft has problems that would make the saved data wrong. Correct them here, then save.'
            : view === 'success'
              ? 'The draft passed validation and was saved in a single transaction.'
              : 'Paste a meeting transcript. The AI drafts the projects and tasks, the server validates them, and they are saved only when everything checks out.'
        }
      />

      {view === 'processing' && <ProcessingSteps stage={stage} />}

      {view === 'success' && result && <CommitSuccess result={result} team={teamMembers} onStartOver={startOver} />}

      {view === 'failed' && (
        <div className="mx-auto max-w-lg rounded-xl border border-stone-200 bg-white p-6 text-center shadow-xs sm:p-8">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold">The AI couldn&apos;t produce a draft</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            This is usually temporary, for example a busy model or an unreadable response. Your transcript is kept, so you
            can try again right away.
          </p>
          {error?.message && <p className="mt-3 font-mono text-xs text-stone-500">{error.message}</p>}
          <div className="mt-6 flex justify-center gap-2">
            <Button
              onClick={() => {
                setView('compose')
                generate()
              }}
            >
              Retry
            </Button>
            <Button variant="secondary" onClick={() => setView('compose')}>
              Edit transcript
            </Button>
          </div>
        </div>
      )}

      {view === 'review' && draft && (
        <DraftEditor
          draft={draft}
          issues={issues}
          team={teamMembers}
          teamError={team.error}
          onRetryTeam={team.reload}
          error={error && { ...error, message: friendlyError(error).message }}
          onDismissError={() => setError(null)}
          saving={saving}
          onField={editField}
          onRemoveTask={removeTask}
          onRemoveProject={removeProject}
          onSave={save}
          onDiscard={discard}
        />
      )}

      {view === 'compose' && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            {error && (
              <ErrorBanner title={friendlyError(error).title} message={friendlyError(error).message} onDismiss={() => setError(null)} />
            )}
            <div className="rounded-xl border border-stone-200 bg-white shadow-xs">
              <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                <Label htmlFor="transcript" hint={words > 0 ? pluralize(words, 'word') : undefined}>
                  Meeting transcript
                </Label>
                <Textarea
                  id="transcript"
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={18}
                  spellCheck={false}
                  placeholder="Paste the full meeting transcript here…"
                  className="min-h-72 resize-y text-[14px]"
                />
                {USE_MOCK && (
                  <p className="mt-2 text-xs text-amber-800">
                    Mock mode: include <code className="font-mono">TEST_ISSUES</code> to get a draft that needs corrections, or{' '}
                    <code className="font-mono">TEST_AI_FAIL</code> to simulate an AI failure.
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 sm:px-5">
                <div className="flex gap-1">
                  <input ref={fileInput} type="file" accept=".txt,.md,text/plain" className="sr-only" tabIndex={-1} onChange={importFile} />
                  <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                    <FileUp className="size-3.5" aria-hidden="true" />
                    Import .txt
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setTranscript('')} disabled={!transcript}>
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="hidden font-sans text-xs text-stone-400 sm:inline">Ctrl / ⌘ + Enter</kbd>
                  <Button onClick={generate} disabled={!canSubmit}>
                    Create from Transcript
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <aside aria-labelledby="how-it-works" className="lg:pt-1">
            <h2 id="how-it-works" className="text-sm font-semibold">
              How it works
            </h2>
            <ol className="mt-4 space-y-4">
              {GUIDANCE.map((text, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-stone-600">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-stone-200/70 font-mono text-[11px] text-stone-600">
                    {index + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </div>
  )
}
