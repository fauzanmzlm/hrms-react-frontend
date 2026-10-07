import { PlusIcon, SearchIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { columnHelper } from '@/components/data-table/columns'
import { DataTable } from '@/components/data-table/DataTable'
import { Pagination } from '@/components/data-table/Pagination'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { ServiceStatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAuth } from '@/features/auth/auth-context'
import { GradeLabel } from '@/features/grades/GradeLabel'
import { useGrades } from '@/features/grades/hooks'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useSearchParamState } from '@/hooks/use-search-param-state'
import {
  DEFAULT_PAGE_SIZE,
  SERVICE_STATUSES,
  type Employee,
  type ServiceStatus,
} from '@/lib/api/types'
import { SERVICE_STATUS_LABELS } from '@/lib/labels'
import { useEmployees } from './hooks'

const helper = columnHelper<Employee>()
const columns = helper.columns([
  helper.accessor('employee_no', { header: 'Employee no.' }),
  helper.accessor('full_name', {
    header: 'Name',
    cell: ({ row }) => (
      <Link
        to={`/employees/${row.original.id}`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.full_name}
      </Link>
    ),
  }),
  helper.accessor('current_grade_id', {
    header: 'Grade',
    cell: (info) => <GradeLabel id={info.getValue()} />,
  }),
  helper.accessor('position', { header: 'Position' }),
  helper.accessor('department', { header: 'Department' }),
  helper.accessor('service_status', {
    header: 'Status',
    cell: (info) => <ServiceStatusBadge status={info.getValue()} />,
  }),
])

/** Text input whose value is debounced into a URL search parameter. */
function DebouncedSearchInput({
  label,
  value,
  onCommit,
  placeholder,
  icon = false,
}: {
  label: string
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  icon?: boolean
}) {
  const id = useId()
  const [text, setText] = useState(value)
  const debounced = useDebouncedValue(text.trim(), 300)
  useEffect(() => {
    if (debounced !== value) onCommit(debounced)
  }, [debounced, value, onCommit])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon && (
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Input
          id={id}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className={icon ? 'pl-8' : undefined}
        />
      </div>
    </div>
  )
}

export function EmployeeListPage() {
  const { can } = useAuth()
  const grades = useGrades()
  const [params] = useSearchParams()
  const setParam = useSearchParamState()
  const statusFilterId = useId()
  const gradeFilterId = useId()

  const page = Math.max(1, Number(params.get('page')) || 1)
  const search = params.get('search') ?? ''
  const department = params.get('department') ?? ''
  const gradeId = Number(params.get('grade_id')) || undefined
  const statusParam = params.get('status') ?? ''
  const status = (SERVICE_STATUSES as readonly string[]).includes(statusParam)
    ? (statusParam as ServiceStatus)
    : undefined

  const filter = useMemo(
    () => ({
      search: search || undefined,
      department: department || undefined,
      grade_id: gradeId,
      status,
      page,
      page_size: DEFAULT_PAGE_SIZE,
    }),
    [search, department, gradeId, status, page],
  )
  const employees = useEmployees(filter)
  const hasFilters = Boolean(search || department || gradeId || status)

  return (
    <>
      <PageHeader
        eyebrow="Perkhidmatan"
        title="Employees"
        description="Personnel records and service history."
        actions={
          can('employees.write') && (
            <Button asChild>
              <Link to="/employees/new">
                <PlusIcon aria-hidden="true" />
                New employee
              </Link>
            </Button>
          )
        }
      />

      <div role="search" aria-label="Filter employees" className="mb-4 grid gap-3 md:grid-cols-4">
        <DebouncedSearchInput
          label="Search"
          value={search}
          onCommit={(v) => setParam({ search: v })}
          placeholder="Name, employee no. or IC"
          icon
        />
        <DebouncedSearchInput
          label="Department"
          value={department}
          onCommit={(v) => setParam({ department: v })}
          placeholder="Any department"
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={gradeFilterId}>Grade</Label>
          <NativeSelect
            id={gradeFilterId}
            className="w-full"
            value={gradeId ? String(gradeId) : ''}
            onChange={(e) => setParam({ grade_id: e.target.value })}
          >
            <NativeSelectOption value="">All grades</NativeSelectOption>
            {(grades.data ?? []).map((g) => (
              <NativeSelectOption key={g.id} value={String(g.id)}>
                {g.code} — {g.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={statusFilterId}>Status</Label>
          <NativeSelect
            id={statusFilterId}
            className="w-full"
            value={status ?? ''}
            onChange={(e) => setParam({ status: e.target.value })}
          >
            <NativeSelectOption value="">All statuses</NativeSelectOption>
            {SERVICE_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {SERVICE_STATUS_LABELS[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {employees.isPending ? (
        <LoadingState rows={6} />
      ) : employees.isError ? (
        <ErrorState error={employees.error} onRetry={() => void employees.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Employees"
            columns={columns}
            data={employees.data.items}
            isFetching={employees.isPlaceholderData}
            empty={
              <EmptyState
                title={hasFilters ? 'No employees match these filters' : 'No employees yet'}
                description={
                  hasFilters ? 'Try a different search or clear the filters.' : undefined
                }
              />
            }
          />
          {employees.data.total > 0 && (
            <Pagination
              page={employees.data.page}
              pageSize={employees.data.page_size}
              total={employees.data.total}
              onPageChange={(p) => setParam({ page: String(p) })}
            />
          )}
        </>
      )}
    </>
  )
}
