import { cx } from '../lib/cx'

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="grid size-11 place-items-center rounded-full bg-stone-100 text-stone-500">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <h2 className="mt-4 text-base font-semibold text-stone-900">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
