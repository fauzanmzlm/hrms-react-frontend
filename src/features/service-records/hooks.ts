import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { serviceRecordsApi } from './api'
import type { ServiceRecordFormValues } from './schema'

export function useServiceRecords(employeeId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.byEmployee(employeeId ?? 0),
    queryFn: ({ signal }) => serviceRecordsApi.listByEmployee(employeeId as number, signal),
    enabled: employeeId !== undefined && employeeId > 0,
  })
}

/**
 * A current service record is copied onto the employee (grade, position,
 * department), so history changes also refresh the employee.
 */
export function invalidateEmployeeHistory(queryClient: QueryClient, employeeId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.byEmployee(employeeId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() }),
  ])
}

export function useCreateServiceRecord(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ServiceRecordFormValues) => serviceRecordsApi.create(employeeId, values),
    onSuccess: () => invalidateEmployeeHistory(queryClient, employeeId),
  })
}

export function useUpdateServiceRecord(employeeId: number, recordId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ServiceRecordFormValues) => serviceRecordsApi.update(recordId, values),
    onSuccess: () => invalidateEmployeeHistory(queryClient, employeeId),
  })
}

export function useDeleteServiceRecord(employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recordId: number) => serviceRecordsApi.remove(recordId),
    onSuccess: () => invalidateEmployeeHistory(queryClient, employeeId),
  })
}
