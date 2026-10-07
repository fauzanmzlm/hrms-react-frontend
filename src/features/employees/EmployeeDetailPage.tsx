import { PencilIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { useIdParam } from '@/hooks/use-id-param'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DetailItem } from '@/components/DetailItem'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState, LoadingState } from '@/components/states'
import { ServiceStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-context'
import { EmployeeCases } from '@/features/disciplinary/EmployeeCases'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { EmployeePromotions } from '@/features/promotions/EmployeePromotions'
import { ServiceHistory } from '@/features/service-records/ServiceHistory'
import { toastError } from '@/lib/api/errors'
import type { Employee } from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { GENDER_LABELS } from '@/lib/labels'
import { useDeleteEmployee, useEmployee } from './hooks'

export function EmployeeProfile({ employee }: { employee: Employee }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Profile</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Employee number">{employee.employee_no}</DetailItem>
          <DetailItem label="IC number">{employee.ic_number}</DetailItem>
          <DetailItem label="Gender">{GENDER_LABELS[employee.gender]}</DetailItem>
          <DetailItem label="Date of birth">{formatDate(employee.date_of_birth)}</DetailItem>
          <DetailItem label="Email">{employee.email}</DetailItem>
          <DetailItem label="Phone">{employee.phone || '—'}</DetailItem>
          <DetailItem label="Grade">
            <GradeLabel id={employee.current_grade_id} withTitle />
          </DetailItem>
          <DetailItem label="Position">{employee.position}</DetailItem>
          <DetailItem label="Department">{employee.department}</DetailItem>
          <DetailItem label="Date joined">{formatDate(employee.date_joined)}</DetailItem>
          <DetailItem label="Confirmed in service">
            {formatDate(employee.confirmed_at, 'Not yet confirmed')}
          </DetailItem>
          <DetailItem label="Service status">
            <ServiceStatusBadge status={employee.service_status} />
          </DetailItem>
        </dl>
      </CardContent>
    </Card>
  )
}

export function EmployeeDetailPage() {
  const id = useIdParam('employeeId') ?? 0
  const navigate = useNavigate()
  const { can } = useAuth()
  const employee = useEmployee(id)
  const remove = useDeleteEmployee()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!id) return <NotFoundPage />
  if (employee.isPending) return <LoadingState rows={8} />
  if (employee.isError)
    return <ErrorState error={employee.error} onRetry={() => void employee.refetch()} />

  const e = employee.data

  async function confirmDelete() {
    try {
      await remove.mutateAsync(e.id)
      toast.success(`${e.full_name} deleted`)
      navigate('/employees', { replace: true })
    } catch (error) {
      setConfirmingDelete(false)
      toastError(error, 'Could not delete the employee')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Perkhidmatan"
        title={e.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {e.employee_no} · {e.position}, {e.department}
            <ServiceStatusBadge status={e.service_status} />
          </span>
        }
        actions={
          <>
            {can('employees.write') && (
              <Button asChild variant="outline">
                <Link to={`/employees/${e.id}/edit`}>
                  <PencilIcon aria-hidden="true" />
                  Edit
                </Link>
              </Button>
            )}
            {can('employees.delete') && (
              <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
                <Trash2Icon aria-hidden="true" />
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <EmployeeProfile employee={e} />
        <ServiceHistory employee={e} />
        <div className="grid gap-6 xl:grid-cols-2">
          <EmployeePromotions employee={e} />
          <EmployeeCases employee={e} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Delete ${e.full_name}?`}
        description="Employees with service records, applications or disciplinary cases cannot be deleted. Consider changing the service status instead."
        confirmLabel="Delete employee"
        destructive
        pending={remove.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
