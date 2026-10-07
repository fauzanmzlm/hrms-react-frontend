import type { ReactNode } from 'react'

/** One term/value pair; render inside a <dl>. */
export function DetailItem({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}
