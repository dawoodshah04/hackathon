import { useId, useState } from 'react'
import { cx } from '../lib/cx'

const CLAMP_THRESHOLD = 120

/** Clamps long text to two lines with an accessible "Show more" toggle. */
export default function ExpandableText({ text, className }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  if (!text) return null
  const long = text.length > CLAMP_THRESHOLD

  return (
    <div className={className}>
      <p id={id} className={cx('text-sm leading-relaxed text-stone-600', long && !expanded && 'line-clamp-2')}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="focus-ring mt-0.5 rounded-sm text-xs font-medium text-brand-700 hover:text-brand-900"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
