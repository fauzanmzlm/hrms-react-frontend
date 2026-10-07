import { ArrowRightIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ErrorState, LoadingState } from '@/components/states'
import { CategoryBadge, ServiceStatusBadge } from '@/components/StatusBadge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCases } from '@/features/disciplinary/hooks'
import { EmployeeName } from '@/features/employees/EmployeeName'
import { useEmployees } from '@/features/employees/hooks'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { usePromotions } from '@/features/promotions/hooks'
import { formatDate } from '@/lib/dates'
import { PENALTY_LABELS } from '@/lib/labels'

const QUEUE_SIZE = 5

interface StatCardProps {
  label: string
  value: number | undefined
  isError?: boolean
  to: string
  icon: LucideIcon
}

export function StatCard({ label, value, isError, to, icon: Icon }: StatCardProps) {
  return (
    <Card size="sm" className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
          {/* The link covers the card so the whole tile is clickable. */}
          <Link to={to} className="after:absolute after:inset-0 hover:underline">
            {label}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-sm text-destructive">Unavailable</p>
        ) : value === undefined ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  )
}

function QueueCard({
  title,
  viewAll,
  children,
}: {
  title: string
  viewAll: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardAction>
          <Link
            to={viewAll}
            className="inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
          >
            View all
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function PendingPromotionsQueue({ title = 'Pending promotion applications' }) {
  const q = usePromotions({ status: 'PENDING', page_size: QUEUE_SIZE })
  return (
    <QueueCard title={title} viewAll="/promotions?status=PENDING">
      {q.isPending ? (
        <LoadingState rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <ul className="divide-y" aria-label={title}>
          {q.data.items.map((app) => (
            <li key={app.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Link
                to={`/promotions/${app.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                #{app.id}
              </Link>
              <EmployeeName id={app.employee_id} />
              <span className="text-muted-foreground">
                <GradeLabel id={app.current_grade_id} /> → <GradeLabel id={app.proposed_grade_id} />
              </span>
              <span className="ml-auto text-muted-foreground">{formatDate(app.submitted_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {q.data && q.data.total > QUEUE_SIZE && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the {QUEUE_SIZE} most recent of {q.data.total}.
        </p>
      )}
    </QueueCard>
  )
}

export function PendingCasesQueue({ title = 'Pending disciplinary cases' }) {
  const q = useCases({ status: 'PENDING', page_size: QUEUE_SIZE })
  return (
    <QueueCard title={title} viewAll="/disciplinary?status=PENDING">
      {q.isPending ? (
        <LoadingState rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
      ) : (
        <ul className="divide-y" aria-label={title}>
          {q.data.items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Link
                to={`/disciplinary/${c.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {c.case_no}
              </Link>
              <EmployeeName id={c.employee_id} />
              <CategoryBadge category={c.category} />
              <span className="ml-auto text-muted-foreground">{PENALTY_LABELS[c.penalty]}</span>
            </li>
          ))}
        </ul>
      )}
    </QueueCard>
  )
}

export function DirectoryPreview() {
  const q = useEmployees({ page_size: 8 })
  return (
    <QueueCard title="Directory (A–Z)" viewAll="/employees">
      {q.isPending ? (
        <LoadingState rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No employees yet.</p>
      ) : (
        <ul className="divide-y" aria-label="Directory">
          {q.data.items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              <Link
                to={`/employees/${e.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {e.full_name}
              </Link>
              <span className="text-muted-foreground">
                <GradeLabel id={e.current_grade_id} /> · {e.department}
              </span>
              <span className="ml-auto">
                <ServiceStatusBadge status={e.service_status} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </QueueCard>
  )
}
