import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { useIdParam } from '@/hooks/use-id-param'
import { DetailItem } from '@/components/DetailItem'
import { PageHeader } from '@/components/PageHeader'
import { ReviewOutcome } from '@/components/review/ReviewOutcome'
import { ReviewPanel } from '@/components/review/ReviewPanel'
import { ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth, useCurrentUser } from '@/features/auth/auth-context'
import { EmployeeName } from '@/features/employees/EmployeeName'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { useServiceRecords } from '@/features/service-records/hooks'
import type { PromotionApplication } from '@/lib/api/types'
import { addDays, formatDate, formatDateTime } from '@/lib/dates'
import { usePromotion, useReviewPromotion } from './hooks'

export function PromotionDetailPage() {
  const id = useIdParam('promotionId') ?? 0
  const promotion = usePromotion(id)

  if (!id) return <NotFoundPage />
  if (promotion.isPending) return <LoadingState rows={6} />
  if (promotion.isError)
    return <ErrorState error={promotion.error} onRetry={() => void promotion.refetch()} />

  const app = promotion.data
  return (
    <>
      <PageHeader
        eyebrow="Naik Pangkat"
        title={`Promotion application #${app.id}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            Submitted {formatDateTime(app.submitted_at)}
            <ApprovalStatusBadge status={app.status} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ApplicationSummary app={app} />
        <div className="flex flex-col gap-6">
          {app.status === 'PENDING' ? (
            <PendingReview app={app} />
          ) : (
            <ReviewOutcome
              status={app.status}
              reviewedBy={app.reviewed_by}
              reviewedAt={app.reviewed_at}
              remarks={app.review_remarks}
            >
              {app.effective_date && (
                <DetailItem label="Effective date">{formatDate(app.effective_date)}</DetailItem>
              )}
            </ReviewOutcome>
          )}
        </div>
      </div>
    </>
  )
}

function ApplicationSummary({ app }: { app: PromotionApplication }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Application</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Employee" className="sm:col-span-2">
            <EmployeeName id={app.employee_id} link showNumber />
          </DetailItem>
          <DetailItem label="Grade at submission">
            <GradeLabel id={app.current_grade_id} withTitle />
          </DetailItem>
          <DetailItem label="Proposed grade">
            <GradeLabel id={app.proposed_grade_id} withTitle />
          </DetailItem>
          <DetailItem label="Justification" className="sm:col-span-2">
            <p className="whitespace-pre-line">{app.justification}</p>
          </DetailItem>
        </dl>
      </CardContent>
    </Card>
  )
}

function PendingReview({ app }: { app: PromotionApplication }) {
  const { can } = useAuth()
  const user = useCurrentUser()
  const canReview = can('promotions.review')
  const review = useReviewPromotion(app.id, app.employee_id)
  const records = useServiceRecords(canReview ? app.employee_id : undefined)

  if (!canReview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Decision</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Waiting for an approver to review this application.
        </CardContent>
      </Card>
    )
  }

  const current = records.data?.find((r) => !r.effective_to)
  const ownApplication = user.employee_id !== undefined && user.employee_id === app.employee_id

  return (
    <ReviewPanel
      itemLabel="promotion application"
      blockedReason={ownApplication ? 'You cannot review your own application.' : undefined}
      requireEffectiveDate
      effectiveDateMin={current ? addDays(current.effective_from, 1) : undefined}
      effectiveDateHint={
        current
          ? `Must be after ${formatDate(current.effective_from)}, when the current service record started.`
          : 'The date the new grade takes effect.'
      }
      approveWarning={
        <p>
          The employee moves to <GradeLabel id={app.proposed_grade_id} withTitle /> and a promotion
          service record is added from the effective date.
        </p>
      }
      onSubmit={(values) => review.mutateAsync(values)}
    />
  )
}
