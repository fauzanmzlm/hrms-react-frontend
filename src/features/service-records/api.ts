import { apiFetch } from '@/lib/api/client'
import type {
  AppointmentType,
  Employee,
  ServiceRecord,
  ServiceRecordRequest,
} from '@/lib/api/types'
import { toDateOnly } from '@/lib/dates'
import type { ServiceRecordFormValues } from './schema'

export function toServiceRecordRequest(values: ServiceRecordFormValues): ServiceRecordRequest {
  return {
    grade_id: Number(values.grade_id),
    position: values.position.trim(),
    department: values.department.trim(),
    appointment_type: values.appointment_type as AppointmentType,
    effective_from: values.effective_from,
    effective_to: values.effective_to || null,
    remarks: values.remarks.trim(),
  }
}

export function toServiceRecordFormValues(
  record: ServiceRecord | undefined,
  employee: Employee,
): ServiceRecordFormValues {
  return {
    grade_id: String(record?.grade_id ?? employee.current_grade_id),
    position: record?.position ?? employee.position,
    department: record?.department ?? employee.department,
    appointment_type: record?.appointment_type ?? '',
    effective_from: toDateOnly(record?.effective_from),
    effective_to: toDateOnly(record?.effective_to),
    remarks: record?.remarks ?? '',
  }
}

export const serviceRecordsApi = {
  listByEmployee: (employeeId: number, signal?: AbortSignal) =>
    apiFetch<ServiceRecord[]>(`/employees/${employeeId}/service-records`, { signal }),
  create: (employeeId: number, values: ServiceRecordFormValues) =>
    apiFetch<ServiceRecord>(`/employees/${employeeId}/service-records`, {
      method: 'POST',
      body: toServiceRecordRequest(values),
    }),
  update: (id: number, values: ServiceRecordFormValues) =>
    apiFetch<ServiceRecord>(`/service-records/${id}`, {
      method: 'PUT',
      body: toServiceRecordRequest(values),
    }),
  remove: (id: number) => apiFetch<void>(`/service-records/${id}`, { method: 'DELETE' }),
}
