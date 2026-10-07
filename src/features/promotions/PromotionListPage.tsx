import { PlusIcon, XIcon } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { columnHelper } from '@/components/data-table/columns'
import { DataTable } from '@/components/data-table/DataTable'
import { Pagination } from '@/components/data-table/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAuth } from '@/features/auth/auth-context'
import { EmployeeCombobox } from '@/features/employees/EmployeeField'
import { EmployeeName } from '@/features/employees/EmployeeName'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { useSearchParamState } from '@/hooks/use-search-param-state'
import {
  APPROVAL_STATUSES,
  DEFAULT_PAGE_SIZE,
  type ApprovalStatus,
  type PromotionApplication,
} from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { APPROVAL_STATUS_LABELS } from '@/lib/labels'
import { usePromotions } from './hooks'

const helper = columnHelper<PromotionApplication>()
const columns = helper.columns([
  helper.accessor('id', {
    header: 'Application',
    cell: (info) => (
      <Link
        to={`/promotions/${info.getValue()}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        #{info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('employee_id', {
    header: 'Employee',
    cell: (info) => <EmployeeName id={info.getValue()} showNumber />,
  }),
  helper.display({
    id: 'grades',
    header: 'Grade change',
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        <GradeLabel id={row.original.current_grade_id} /> →{' '}
        <GradeLabel id={row.original.proposed_grade_id} />
      </span>
    ),
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: (info) => <ApprovalStatusBadge status={info.getValue()} />,
  }),
  helper.accessor('submitted_at', {
    header: 'Submitted',
    cell: (info) => formatDate(info.getValue()),
  }),
])

export function PromotionListPage() {
  const { user, can } = useAuth()
  const [params] = useSearchParams()
  const setParam = useSearchParamState()
  const statusId = useId()
  const employeeFilterId = useId()
  const isEmployee = user?.role === 'EMPLOYEE'

  const page = Math.max(1, Number(params.get('page')) || 1)
  const employeeId = Number(params.get('employee_id')) || undefined
  const statusParam = params.get('status') ?? ''
  const status = (APPROVAL_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as ApprovalStatus)
    : undefined

  const filter = useMemo(
    () => ({
      employee_id: isEmployee ? undefined : employeeId,
      status,
      page,
      page_size: DEFAULT_PAGE_SIZE,
    }),
    [isEmployee, employeeId, status, page],
  )
  const promotions = usePromotions(filter)
  const hasFilters = Boolean(status || filter.employee_id)

  return (
    <>
      <PageHeader
        eyebrow="Naik Pangkat"
        title={isEmployee ? 'My promotion applications' : 'Promotion applications'}
        description={
          isEmployee
            ? 'Applications you have submitted and their outcome.'
            : 'Applications to move employees to a higher grade.'
        }
        actions={
          can('promotions.submit') && (
            <Button asChild>
              <Link to="/promotions/new">
                <PlusIcon aria-hidden="true" />
                {isEmployee ? 'Apply for promotion' : 'New application'}
              </Link>
            </Button>
          )
        }
      />

      <div
        role="search"
        aria-label="Filter promotion applications"
        className="mb-4 grid gap-3 md:grid-cols-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={statusId}>Status</Label>
          <NativeSelect
            id={statusId}
            className="w-full"
            value={status ?? ''}
            onChange={(e) => setParam({ status: e.target.value })}
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {APPROVAL_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {APPROVAL_STATUS_LABELS[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {!isEmployee && (
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <Label htmlFor={employeeFilterId}>Employee</Label>
            <div className="flex gap-2">
              <EmployeeCombobox
                id={employeeFilterId}
                value={employeeId ? String(employeeId) : ''}
                onChange={(v) => setParam({ employee_id: v })}
              />
              {employeeId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setParam({ employee_id: '' })}
                  aria-label="Clear employee filter"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {promotions.isPending ? (
        <LoadingState rows={6} />
      ) : promotions.isError ? (
        <ErrorState error={promotions.error} onRetry={() => void promotions.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Promotion applications"
            columns={columns}
            data={promotions.data.items}
            isFetching={promotions.isPlaceholderData}
            empty={
              <EmptyState
                title={
                  hasFilters ? 'No applications match these filters' : 'No promotion applications'
                }
                description={hasFilters ? 'Try clearing the filters.' : undefined}
              />
            }
          />
          {promotions.data.total > 0 && (
            <Pagination
              page={promotions.data.page}
              pageSize={promotions.data.page_size}
              total={promotions.data.total}
              onPageChange={(p) => setParam({ page: String(p) })}
            />
          )}
        </>
      )}
    </>
  )
}
