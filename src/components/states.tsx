import { AlertTriangleIcon, InboxIcon, LockIcon, SearchXIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/lib/api/client'
import { errorMessage, errorReference } from '@/lib/api/errors'

export function LoadingState({ rows = 4, label = 'Loading…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <InboxIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  /** Overrides the title for the error. */
  title?: string
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const status = isApiError(error) ? error.status : undefined
  const reference = errorReference(error)
  let Icon = AlertTriangleIcon
  let heading = title ?? 'Something went wrong'
  if (status === 403) {
    Icon = LockIcon
    heading = title ?? 'You do not have access to this'
  } else if (status === 404) {
    Icon = SearchXIcon
    heading = title ?? 'Not found'
  }
  const canRetry = onRetry && status !== 403 && status !== 404

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border px-6 py-10 text-center"
    >
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">{heading}</p>
      <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      {reference && <p className="text-xs text-muted-foreground">Reference: {reference}</p>}
      {canRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
