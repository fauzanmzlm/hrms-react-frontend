import { PlusIcon } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge, CategoryBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import type { Employee } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { PENALTY_LABELS } from '@/lib/labels'
import { useCases } from './hooks'

const LIMIT = 5

/** The latest disciplinary cases for one employee. */
export function EmployeeCases({ employee }: { employee: Employee }) {
  const { can } = useAuth()
  const cases = useCases({ employee_id: employee.id, page_size: LIMIT })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Disciplinary cases</h2>
        </CardTitle>
        {can('disciplinary.create') && (
          <CardAction>
            <Button asChild size="sm" variant="outline">
              <Link to={`/disciplinary/new?employee_id=${employee.id}`}>
                <PlusIcon aria-hidden="true" />
                Open case
              </Link>
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {cases.isPending ? (
          <LoadingState rows={2} />
        ) : cases.isError ? (
          <ErrorState error={cases.error} onRetry={() => void cases.refetch()} />
        ) : cases.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No disciplinary cases.</p>
        ) : (
          <ul className="divide-y">
            {cases.data.items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                <Link
                  to={`/disciplinary/${c.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {c.case_no}
                </Link>
                <CategoryBadge category={c.category} />
                <span>{PENALTY_LABELS[c.penalty]}</span>
                <span className="text-muted-foreground">{formatDate(c.incident_date)}</span>
                <span className="ml-auto">
                  <ApprovalStatusBadge status={c.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {cases.data && cases.data.total > LIMIT && (
          <Link
            to={`/disciplinary?employee_id=${employee.id}`}
            className="mt-2 inline-block text-sm underline underline-offset-4"
          >
            View all {cases.data.total}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
