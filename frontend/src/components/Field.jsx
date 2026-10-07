import { forwardRef } from 'react'
import { cx } from '../lib/cx'

const CONTROL =
  'block w-full rounded-lg bg-white text-sm text-stone-900 shadow-xs ring-1 ring-inset transition-shadow placeholder:text-stone-400 focus:outline-none focus:ring-2 disabled:bg-stone-50 disabled:text-stone-500'

function controlClasses(invalid, className) {
  return cx(
    CONTROL,
    invalid
      ? 'bg-red-50/40 ring-red-400 focus:ring-red-500'
      : 'ring-stone-300 hover:ring-stone-400 focus:ring-brand-600',
    className,
  )
}

export function Label({ htmlFor, children, hint, className }) {
  return (
    <label htmlFor={htmlFor} className={cx('mb-1.5 flex items-baseline justify-between gap-2', className)}>
      <span className="text-[13px] font-medium text-stone-700">{children}</span>
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef(function Input({ invalid, className, ...props }, ref) {
  return (
    <input ref={ref} aria-invalid={invalid || undefined} className={controlClasses(invalid, cx('h-9 px-3', className))} {...props} />
  )
})

export const Select = forwardRef(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={controlClasses(invalid, cx('h-9 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%2378716c%27%3E%3Cpath%20d%3D%27M5.23%207.21a.75.75%200%20011.06.02L10%2011.1l3.71-3.87a.75.75%200%20111.08%201.04l-4.25%204.43a.75.75%200%2001-1.08%200L5.21%208.27a.75.75%200%2001.02-1.06z%27/%3E%3C/svg%3E")] bg-[length:1.1rem] bg-[right_0.5rem_center] bg-no-repeat pr-8 pl-3', className))}
      {...props}
    >
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ invalid, className, ...props }, ref) {
  return (
    <textarea ref={ref} aria-invalid={invalid || undefined} className={controlClasses(invalid, cx('px-3 py-2 leading-relaxed', className))} {...props} />
  )
})

export function FieldError({ id, messages }) {
  if (!messages?.length) return null
  return (
    <p id={id} className="mt-1.5 text-xs leading-snug text-red-700">
      {messages.join(' ')}
    </p>
  )
}
