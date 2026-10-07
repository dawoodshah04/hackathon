import { cx } from '../lib/cx'

export default function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-[13px] text-stone-500">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-[1.625rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
