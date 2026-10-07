import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { toastError } from '@/lib/api/errors'
import type { Employee, ServiceRecord } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { APPOINTMENT_TYPE_LABELS } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { useDeleteServiceRecord, useServiceRecords } from './hooks'
import { ServiceRecordFormDialog } from './ServiceRecordFormDialog'

/** The employee's service history (rekod perkhidmatan), newest first. */
export function ServiceHistory({ employee }: { employee: Employee }) {
  const { can } = useAuth()
  const canWrite = can('serviceRecords.write')
  const records = useServiceRecords(employee.id)
  const remove = useDeleteServiceRecord(employee.id)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceRecord | undefined>()
  const [deleting, setDeleting] = useState<ServiceRecord | undefined>()

  const current = records.data?.find((r) => !r.effective_to)

  function openForm(record?: ServiceRecord) {
    setEditing(record)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Service record deleted')
    } catch (error) {
      toastError(error, 'Could not delete the service record')
    } finally {
      setDeleting(undefined)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Service history</h2>
        </CardTitle>
        <CardDescription>Appointments, transfers and promotions over time.</CardDescription>
        {canWrite && (records.data?.length ?? 0) > 0 && (
          <CardAction>
            <Button size="sm" onClick={() => openForm()}>
              <PlusIcon aria-hidden="true" />
              Add record
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {records.isPending ? (
          <LoadingState rows={3} />
        ) : records.isError ? (
          <ErrorState error={records.error} onRetry={() => void records.refetch()} />
        ) : records.data.length === 0 ? (
          <EmptyState
            title="No service records yet"
            description="The service history starts with the first appointment."
            action={
              canWrite && (
                <Button size="sm" onClick={() => openForm()}>
                  <PlusIcon aria-hidden="true" />
                  Add first service record
                </Button>
              )
            }
          />
        ) : (
          <ol className="relative ml-2 border-l" aria-label="Service records, newest first">
            {records.data.map((record) => {
              const isCurrent = !record.effective_to
              return (
                <li key={record.id} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute top-1.5 -left-[5px] size-2.5 rounded-full border-2 border-background',
                      isCurrent ? 'bg-emerald-600' : 'bg-muted-foreground/50',
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <GradeLabel id={record.grade_id} withTitle />
                        {isCurrent && (
                          <Badge className="bg-emerald-100 text-emerald-800" variant="secondary">
                            Current
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {APPOINTMENT_TYPE_LABELS[record.appointment_type]}
                        </Badge>
                      </p>
                      <p className="text-sm">
                        {record.position} · {record.department}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(record.effective_from)} –{' '}
                        {isCurrent ? 'present' : formatDate(record.effective_to)}
                      </p>
                      {record.remarks && (
                        <p className="mt-1 text-sm text-muted-foreground">{record.remarks}</p>
                      )}
                    </div>
                    {canWrite && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit record from ${formatDate(record.effective_from)}`}
                          onClick={() => openForm(record)}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete record from ${formatDate(record.effective_from)}`}
                          onClick={() => setDeleting(record)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>

      <ServiceRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={employee}
        record={editing}
        current={current}
      />
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Delete this service record?"
        description="The record is removed from the history. This does not change the employee's current grade."
        confirmLabel="Delete record"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </Card>
  )
}
