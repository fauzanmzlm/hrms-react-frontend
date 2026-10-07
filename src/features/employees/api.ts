import { apiFetch } from '@/lib/api/client'
import type {
  Employee,
  EmployeeFilter,
  EmployeeRequest,
  Gender,
  Page,
  ServiceStatus,
} from '@/lib/api/types'
import { toDateOnly } from '@/lib/dates'
import type { EmployeeFormValues } from './schema'

/**
 * Builds the request body. On update the backend ignores current_grade_id
 * (grades only change through service records and promotions), so it is
 * only sent on create.
 */
export function toEmployeeRequest(
  values: EmployeeFormValues,
  mode: 'create' | 'edit',
): EmployeeRequest {
  return {
    employee_no: values.employee_no.trim(),
    ic_number: values.ic_number.trim(),
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    date_of_birth: values.date_of_birth,
    gender: values.gender as Gender,
    ...(mode === 'create' ? { current_grade_id: Number(values.current_grade_id) } : {}),
    position: values.position.trim(),
    department: values.department.trim(),
    service_status: values.service_status as ServiceStatus,
    date_joined: values.date_joined,
    confirmed_at: values.confirmed_at || null,
  }
}

export function toEmployeeFormValues(employee?: Employee): EmployeeFormValues {
  return {
    employee_no: employee?.employee_no ?? '',
    ic_number: employee?.ic_number ?? '',
    full_name: employee?.full_name ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    date_of_birth: toDateOnly(employee?.date_of_birth),
    gender: employee?.gender ?? '',
    current_grade_id: employee ? String(employee.current_grade_id) : '',
    position: employee?.position ?? '',
    department: employee?.department ?? '',
    service_status: employee?.service_status ?? 'ACTIVE',
    date_joined: toDateOnly(employee?.date_joined),
    confirmed_at: toDateOnly(employee?.confirmed_at),
  }
}

export const employeesApi = {
  list: (filter: EmployeeFilter, signal?: AbortSignal) =>
    apiFetch<Page<Employee>>('/employees', { query: { ...filter }, signal }),
  get: (id: number, signal?: AbortSignal) => apiFetch<Employee>(`/employees/${id}`, { signal }),
  create: (values: EmployeeFormValues) =>
    apiFetch<Employee>('/employees', {
      method: 'POST',
      body: toEmployeeRequest(values, 'create'),
    }),
  update: (id: number, values: EmployeeFormValues) =>
    apiFetch<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: toEmployeeRequest(values, 'edit'),
    }),
  remove: (id: number) => apiFetch<void>(`/employees/${id}`, { method: 'DELETE' }),
}
