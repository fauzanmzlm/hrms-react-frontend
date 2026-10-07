import { AlertTriangleIcon } from 'lucide-react'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { useIdParam } from '@/hooks/use-id-param'
import { DetailItem } from '@/components/DetailItem'
import { PageHeader } from '@/components/PageHeader'
import { ReviewOutcome } from '@/components/review/ReviewOutcome'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import { ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge, CategoryBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserLabel } from '@/components/UserLabel'
import { useAuth, useCurrentUser } from '@/features/auth/auth-context'
import { EmployeeName } from '@/features/employees/EmployeeName'
import type { DisciplinaryRecord } from '@/lib/api/types'
import { formatDate, formatDateTime } from '@/lib/dates'
import { PENALTY_LABELS } from '@/lib/labels'
import { useCase, useReviewCase } from './hooks'

export function CaseDetailPage() {
  const id = useIdParam('caseId') ?? 0
  const record = useCase(id)

  if (!id) return <NotFoundPage />
  if (record.isPending) return <LoadingState rows={6} />
  if (record.isError)
    return <ErrorState error={record.error} onRetry={() => void record.refetch()} />

  const c = record.data
  return (
    <>
      <PageHeader
        eyebrow="Tatatertib"
        title={`Case ${c.case_no}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Opened {formatDateTime(c.created_at)}
            <CategoryBadge category={c.category} />
            <ApprovalStatusBadge status={c.status} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CaseSummary record={c} />
        <div className="flex flex-col gap-6">
          {c.status === 'PENDING' ? (
            <PendingReview record={c} />
          ) : (
            <ReviewOutcome
              status={c.status}
              reviewedBy={c.reviewed_by}
              reviewedAt={c.reviewed_at}
              remarks={c.review_remarks}
            >
              {c.status === 'APPROVED' && (
                <DetailItem label="Penalty imposed">{PENALTY_LABELS[c.penalty]}</DetailItem>
              )}
            </ReviewOutcome>
          )}
        </div>
      </div>
    </>
  )
}

function CaseSummary({ record }: { record: DisciplinaryRecord }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Case</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Employee" className="sm:col-span-2">
            <EmployeeName id={record.employee_id} link showNumber />
          </DetailItem>
          <DetailItem label="Incident date">{formatDate(record.incident_date)}</DetailItem>
          <DetailItem label="Proposed penalty">{PENALTY_LABELS[record.penalty]}</DetailItem>
          <DetailItem label="Reported by">
            <UserLabel id={record.reported_by} />
          </DetailItem>
          <DetailItem label="Description" className="sm:col-span-2">
            <p className="whitespace-pre-line">{record.description}</p>
          </DetailItem>
        </dl>
      </CardContent>
    </Card>
  )
}

function PendingReview({ record }: { record: DisciplinaryRecord }) {
  const { can } = useAuth()
  const user = useCurrentUser()
  const review = useReviewCase(record.id, record.employee_id)

  if (!can('disciplinary.review')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Decision</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Waiting for an approver to review this case.
        </CardContent>
      </Card>
    )
  }

  const blockedReason =
    record.reported_by === user.id
      ? 'You reported this case. Another approver must review it.'
      : user.employee_id !== undefined && user.employee_id === record.employee_id
        ? 'You cannot review a case about yourself.'
        : undefined

  return (
    <>
      {record.penalty === 'DISMISSAL' && !blockedReason && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Approving dismisses the employee</AlertTitle>
          <AlertDescription>
            Their service status will change to Terminated. This cannot be undone here.
          </AlertDescription>
        </Alert>
      )}
      <ReviewPanel
        itemLabel="disciplinary case"
        blockedReason={blockedReason}
        approveWarning={
          <p>
            The penalty ({PENALTY_LABELS[record.penalty]}) is confirmed and blocks promotion for the
            configured period.
            {record.penalty === 'DISMISSAL' && (
              <strong className="block text-destructive">
                The employee will be marked as Terminated.
              </strong>
            )}
          </p>
        }
        onSubmit={(values) => review.mutateAsync(values)}
      />
    </>
  )
}
