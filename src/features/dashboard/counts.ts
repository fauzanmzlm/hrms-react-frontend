import { useCases } from '@/features/disciplinary/hooks'
import { useEmployees } from '@/features/employees/hooks'
import { usePromotions } from '@/features/promotions/hooks'
import type { DisciplinaryFilter, EmployeeFilter, PromotionFilter } from '@/lib/api/types'

/** Totals come from a one-row page; only `total` is used. */
export function useEmployeeCount(filter: EmployeeFilter = {}) {
  const q = useEmployees({ ...filter, page_size: 1 })
  return { value: q.data?.total, isError: q.isError }
}
export function usePromotionCount(filter: PromotionFilter = {}) {
  const q = usePromotions({ ...filter, page_size: 1 })
  return { value: q.data?.total, isError: q.isError }
}
export function useCaseCount(filter: DisciplinaryFilter = {}) {
  const q = useCases({ ...filter, page_size: 1 })
  return { value: q.data?.total, isError: q.isError }
}
