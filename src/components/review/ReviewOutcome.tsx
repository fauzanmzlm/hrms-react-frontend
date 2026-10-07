import type { ReactNode } from 'react'
import { DetailItem } from '@/components/DetailItem'
import { ApprovalStatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserLabel } from '@/components/UserLabel'
import type { ApprovalStatus } from '@/lib/api/types'
import { formatDateTime } from '@/lib/dates'

interface ReviewOutcomeProps {
  status: ApprovalStatus
  reviewedBy?: number
  reviewedAt?: string
  remarks: string
  children?: ReactNode
}

/** The decision on an item that is no longer pending. */
export function ReviewOutcome({
  status,
  reviewedBy,
  reviewedAt,
  remarks,
  children,
}: ReviewOutcomeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Decision</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailItem label="Outcome">
            <ApprovalStatusBadge status={status} />
          </DetailItem>
          <DetailItem label="Reviewed by">
            <UserLabel id={reviewedBy} />
          </DetailItem>
          <DetailItem label="Reviewed at">{formatDateTime(reviewedAt)}</DetailItem>
          {children}
          <DetailItem label="Remarks" className="sm:col-span-2">
            {remarks ? <p className="whitespace-pre-line">{remarks}</p> : '—'}
          </DetailItem>
        </dl>
      </CardContent>
    </Card>
  )
}
