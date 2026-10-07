import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '../../lib/cx'
import Spinner from '../Spinner'

const PROCESSING_STEPS = ['Reading transcript', 'Extracting projects and tasks', 'Validating', 'Saving']

/** Staged progress while the draft is generated and saved. The stages are indicative, not measured. */
export default function ProcessingSteps({ stage }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Working on your transcript</h2>
          <p className="mt-1 text-sm text-stone-600">Nothing is saved until the draft passes validation.</p>
        </div>
        <span className="font-mono text-xs text-stone-400 tabular-nums" aria-hidden="true">
          {seconds}s
        </span>
      </div>

      <span role="status" className="sr-only">
        {PROCESSING_STEPS[stage]}
      </span>

      <ol className="mt-7 space-y-4">
        {PROCESSING_STEPS.map((label, index) => {
          const done = index < stage
          const active = index === stage
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-full',
                  done && 'bg-brand-700 text-white',
                  active && 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
                  !done && !active && 'ring-1 ring-stone-200',
                )}
              >
                {done && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                {active && <Spinner size="sm" />}
              </span>
              <span className={cx(active ? 'font-medium text-stone-900' : done ? 'text-stone-700' : 'text-stone-400')}>
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
