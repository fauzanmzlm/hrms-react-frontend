import { PlusIcon, XIcon } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { columnHelper } from '@/components/data-table/columns'
import { DataTable } from '@/components/data-table/DataTable'
import { Pagination } from '@/components/data-table/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { ApprovalStatusBadge, CategoryBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAuth } from '@/features/auth/auth-context'
import { EmployeeCombobox } from '@/features/employees/EmployeeField'
import { EmployeeName } from '@/features/employees/EmployeeName'
import { useSearchParamState } from '@/hooks/use-search-param-state'
import {
  APPROVAL_STATUSES,
  DEFAULT_PAGE_SIZE,
  OFFENSE_CATEGORIES,
  type ApprovalStatus,
  type DisciplinaryRecord,
} from '@/lib/api/types'
import { formatDate } from '@/lib/dates'
import { APPROVAL_STATUS_LABELS, OFFENSE_CATEGORY_LABELS, PENALTY_LABELS } from '@/lib/labels'
import { useCases } from './hooks'
import { isOffenseCategory } from './schema'

const helper = columnHelper<DisciplinaryRecord>()
const columns = helper.columns([
  helper.accessor('case_no', {
    header: 'Case no.',
    cell: ({ row }) => (
      <Link
        to={`/disciplinary/${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.case_no}
      </Link>
    ),
  }),
  helper.accessor('employee_id', {
    header: 'Employee',
    cell: (info) => <EmployeeName id={info.getValue()} showNumber />,
  }),
  helper.accessor('category', {
    header: 'Category',
    cell: (info) => <CategoryBadge category={info.getValue()} />,
  }),
  helper.accessor('penalty', {
    header: 'Proposed penalty',
    cell: (info) => PENALTY_LABELS[info.getValue()],
  }),
  helper.accessor('incident_date', {
    header: 'Incident date',
    cell: (info) => formatDate(info.getValue()),
  }),
  helper.accessor('status', {
    header: 'Status',
    cell: (info) => <ApprovalStatusBadge status={info.getValue()} />,
  }),
])

export function CaseListPage() {
  const { user, can } = useAuth()
  const [params] = useSearchParams()
  const setParam = useSearchParamState()
  const statusId = useId()
  const categoryId = useId()
  const employeeFilterId = useId()
  const isEmployee = user?.role === 'EMPLOYEE'

  const page = Math.max(1, Number(params.get('page')) || 1)
  const employeeId = Number(params.get('employee_id')) || undefined
  const statusParam = params.get('status') ?? ''
  const status = (APPROVAL_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as ApprovalStatus)
    : undefined
  const categoryParam = params.get('category') ?? ''
  const category = isOffenseCategory(categoryParam) ? categoryParam : undefined

  const filter = useMemo(
    () => ({
      employee_id: isEmployee ? undefined : employeeId,
      status,
      category,
      page,
      page_size: DEFAULT_PAGE_SIZE,
    }),
    [isEmployee, employeeId, status, category, page],
  )
  const cases = useCases(filter)
  const hasFilters = Boolean(status || category || filter.employee_id)

  return (
    <>
      <PageHeader
        eyebrow="Tatatertib"
        title={isEmployee ? 'My disciplinary cases' : 'Disciplinary cases'}
        description="Cases and proposed penalties. Only approved cases count against an employee."
        actions={
          can('disciplinary.create') && (
            <Button asChild>
              <Link to="/disciplinary/new">
                <PlusIcon aria-hidden="true" />
                Open case
              </Link>
            </Button>
          )
        }
      />

      <div
        role="search"
        aria-label="Filter disciplinary cases"
        className="mb-4 grid gap-3 md:grid-cols-4"
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={categoryId}>Category</Label>
          <NativeSelect
            id={categoryId}
            className="w-full"
            value={category ?? ''}
            onChange={(e) => setParam({ category: e.target.value })}
          >
            <NativeSelectOption value="">All categories</NativeSelectOption>
            {OFFENSE_CATEGORIES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {OFFENSE_CATEGORY_LABELS[c]}
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

      {cases.isPending ? (
        <LoadingState rows={6} />
      ) : cases.isError ? (
        <ErrorState error={cases.error} onRetry={() => void cases.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Disciplinary cases"
            columns={columns}
            data={cases.data.items}
            isFetching={cases.isPlaceholderData}
            empty={
              <EmptyState
                title={hasFilters ? 'No cases match these filters' : 'No disciplinary cases'}
                description={hasFilters ? 'Try clearing the filters.' : undefined}
              />
            }
          />
          {cases.data.total > 0 && (
            <Pagination
              page={cases.data.page}
              pageSize={cases.data.page_size}
              total={cases.data.total}
              onPageChange={(p) => setParam({ page: String(p) })}
            />
          )}
        </>
      )}
    </>
  )
}
