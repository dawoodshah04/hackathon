import { cx } from '../lib/cx'

export default function Logo({ className, withWordmark = true, inverted = false }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" className={inverted ? 'fill-white' : 'fill-brand-700'} />
        <path
          d="M11 21.5v-11l10 11v-11"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={inverted ? 'stroke-brand-800' : 'stroke-white'}
        />
      </svg>
      {withWordmark && (
        <span className="leading-none">
          <span className={cx('block text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-stone-900')}>
            NovaWorks
          </span>
          <span className={cx('mt-0.5 block text-[11px] font-medium', inverted ? 'text-brand-200' : 'text-stone-500')}>
            Projects
          </span>
        </span>
      )}
    </span>
  )
}
