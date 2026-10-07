import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReviewFormValues } from '@/components/review/schema'
import { isApiError } from '@/lib/api/client'
import type { DisciplinaryFilter } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'
import { disciplinaryApi } from './api'
import type { CaseFormValues } from './schema'

export function useCases(filter: DisciplinaryFilter, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.disciplinary.list(filter),
    queryFn: ({ signal }) => disciplinaryApi.list(filter, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function useCase(id: number) {
  return useQuery({
    queryKey: queryKeys.disciplinary.detail(id),
    queryFn: ({ signal }) => disciplinaryApi.get(id, signal),
    enabled: id > 0,
  })
}

export function useCreateCase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CaseFormValues) => disciplinaryApi.create(values),
    onSuccess: (record) => {
      queryClient.setQueryData(queryKeys.disciplinary.detail(record.id), record)
      return queryClient.invalidateQueries({ queryKey: queryKeys.disciplinary.lists() })
    },
  })
}

export function useReviewCase(id: number, employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ReviewFormValues) => disciplinaryApi.review(id, values),
    onSuccess: async (record) => {
      queryClient.setQueryData(queryKeys.disciplinary.detail(id), record)
      await queryClient.invalidateQueries({ queryKey: queryKeys.disciplinary.lists() })
      if (record.status === 'APPROVED') {
        // An approved DISMISSAL terminates the employee, and any approved
        // penalty affects promotion eligibility.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(employeeId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() }),
        ])
      }
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 409) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.disciplinary.detail(id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.disciplinary.lists() }),
        ])
      }
    },
  })
}
