import { Badge } from '@/components/ui/badge'
import type { ApprovalStatus, OffenseCategory, ServiceStatus } from '@/lib/api/types'
import {
  APPROVAL_STATUS_LABELS,
  OFFENSE_CATEGORY_LABELS,
  SERVICE_STATUS_LABELS,
} from '@/lib/labels'
import { cn } from '@/lib/utils'

const tone = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  neutral: 'bg-muted text-muted-foreground',
} as const

const APPROVAL_TONE: Record<ApprovalStatus, keyof typeof tone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
}

const SERVICE_TONE: Record<ServiceStatus, keyof typeof tone> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  RETIRED: 'neutral',
  RESIGNED: 'neutral',
  TERMINATED: 'danger',
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <Badge variant="secondary" className={cn(tone[APPROVAL_TONE[status]])}>
      {APPROVAL_STATUS_LABELS[status]}
    </Badge>
  )
}

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <Badge variant="secondary" className={cn(tone[SERVICE_TONE[status]])}>
      {SERVICE_STATUS_LABELS[status]}
    </Badge>
  )
}

export function CategoryBadge({ category }: { category: OffenseCategory }) {
  return (
    <Badge
      variant="outline"
      className={cn(category === 'SERIOUS' && 'border-red-300 text-red-800')}
    >
      {OFFENSE_CATEGORY_LABELS[category]}
    </Badge>
  )
}
