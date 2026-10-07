import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { GradeLabel } from '@/features/grades/GradeLabel'
import type { Employee } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { usePromotions } from './hooks'

const LIMIT = 5

/** The latest promotion applications for one employee. */
export function EmployeePromotions({ employee }: { employee: Employee }) {
  const { user, can } = useAuth()
  const promotions = usePromotions({ employee_id: employee.id, page_size: LIMIT })
  const canApply =
    can('promotions.submit') &&
    employee.service_status === 'ACTIVE' &&
    (user?.role !== 'EMPLOYEE' || user.employee_id === employee.id)
  const applyTo =
    user?.role === 'EMPLOYEE' ? '/promotions/new' : `/promotions/new?employee_id=${employee.id}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Promotion applications</h2>
        </CardTitle>
        {canApply && (
          <CardAction>
            <Button asChild size="sm" variant="outline">
              <Link to={applyTo}>
                <PlusIcon aria-hidden="true" />
                {user?.role === 'EMPLOYEE' ? 'Apply' : 'New application'}
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {promotions.isPending ? (
          <LoadingState rows={2} />
        ) : promotions.isError ? (
          <ErrorState error={promotions.error} onRetry={() => void promotions.refetch()} />
        ) : promotions.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No promotion applications.</p>
        ) : (
          <ul className="divide-y">
            {promotions.data.items.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link
                  to={`/promotions/${app.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  #{app.id}
                </Link>
                <span>
                  <GradeLabel id={app.current_grade_id} /> →{' '}
                  <GradeLabel id={app.proposed_grade_id} />
                </span>
                <span className="text-muted-foreground">{formatDate(app.submitted_at)}</span>
                <span className="ml-auto">
                  <ApprovalStatusBadge status={app.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {promotions.data && promotions.data.total > LIMIT && (
          <Link
            to={`/promotions?employee_id=${employee.id}`}
            className="mt-2 inline-block text-sm underline underline-offset-4"
          >
            View all {promotions.data.total}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
