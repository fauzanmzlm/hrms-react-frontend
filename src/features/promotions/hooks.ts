import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReviewFormValues } from '@/components/review/schema'
import { invalidateEmployeeHistory } from '@/features/service-records/hooks'
import { isApiError } from '@/lib/api/client'
import type { PromotionFilter } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'
import { promotionsApi } from './api'
import type { PromotionFormValues } from './schema'

export function usePromotions(filter: PromotionFilter, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.promotions.list(filter),
    queryFn: ({ signal }) => promotionsApi.list(filter, signal),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export function usePromotion(id: number) {
  return useQuery({
    queryKey: queryKeys.promotions.detail(id),
    queryFn: ({ signal }) => promotionsApi.get(id, signal),
    enabled: id > 0,
  })
}

export function useSubmitPromotion(forSelf: boolean) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: PromotionFormValues) => promotionsApi.submit(values, forSelf),
    onSuccess: (app) => {
      queryClient.setQueryData(queryKeys.promotions.detail(app.id), app)
      return queryClient.invalidateQueries({ queryKey: queryKeys.promotions.lists() })
    },
  })
}

export function useReviewPromotion(id: number, employeeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: ReviewFormValues) => promotionsApi.review(id, values),
    onSuccess: async (app) => {
      queryClient.setQueryData(queryKeys.promotions.detail(id), app)
      await queryClient.invalidateQueries({ queryKey: queryKeys.promotions.lists() })
      // Approval opens a PROMOTION service record and moves the employee's grade.
      if (app.status === 'APPROVED') await invalidateEmployeeHistory(queryClient, employeeId)
    },
    onError: (error) => {
      if (isApiError(error) && error.status === 409) {
        return Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.promotions.detail(id) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.promotions.lists() }),
        ])
      }
    },
  })
}
