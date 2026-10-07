import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'
import Spinner from './Spinner'

const VARIANTS = {
  primary:
    'bg-brand-700 text-white shadow-xs hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/50',
  secondary:
    'bg-white text-stone-800 ring-1 ring-inset ring-stone-300 shadow-xs hover:bg-stone-50 active:bg-stone-100 disabled:text-stone-400',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:bg-stone-200 disabled:text-stone-300',
  danger: 'text-red-700 hover:bg-red-50 active:bg-red-100 disabled:text-red-300',
}

const SIZES = {
  sm: 'h-8 gap-1.5 rounded-md px-2.5 text-[13px]',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-lg px-5 text-[15px]',
  icon: 'size-8 rounded-md',
}

export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return cx(
    'focus-ring inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

const Button = forwardRef(function Button(
  { variant, size, loading = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner size="sm" className={variant === 'primary' || !variant ? 'text-white' : undefined} />}
      {children}
    </button>
  )
})

export default Button

export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />
}
