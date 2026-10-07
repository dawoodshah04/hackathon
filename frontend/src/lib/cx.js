/** Joins truthy class names. Tiny stand-in for clsx. */
export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
