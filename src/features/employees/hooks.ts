import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EmployeeFilter } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'
import { employeesApi } from './api'
import type { EmployeeFormValues } from './schema'

export function useEmployees(filter: EmployeeFilter, options: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.employees.list(filter),
    queryFn: async ({ signal }) => {
      const page = await employeesApi.list(filter, signal)
      // Seed the per-id cache so name lookups elsewhere need no extra request.
      for (const employee of page.items) {
        queryClient.setQueryData(queryKeys.employees.detail(employee.id), employee)
      }
      return page
    },
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useEmployee(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id ?? 0),
    queryFn: ({ signal }) => employeesApi.get(id as number, signal),
    enabled: id !== undefined && id > 0,
    staleTime: 60_000,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeFormValues) => employeesApi.create(values),
    onSuccess: (employee) => {
      queryClient.setQueryData(queryKeys.employees.detail(employee.id), employee)
      return queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() })
    },
  })
}

export function useUpdateEmployee(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: EmployeeFormValues) => employeesApi.update(id, values),
    onSuccess: (employee) => {
      queryClient.setQueryData(queryKeys.employees.detail(employee.id), employee)
      return queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => employeesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.employees.detail(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() })
    },
  })
}
