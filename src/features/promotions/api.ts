import type { ReviewFormValues } from '@/components/review/schema'
import { apiFetch } from '@/lib/api/client'
import type {
  Page,
  PromotionApplication,
  PromotionFilter,
  PromotionReviewRequest,
  ReviewStatus,
  SubmitPromotionRequest,
} from '@/lib/api/types'
import type { PromotionFormValues } from './schema'

/** EMPLOYEE callers must omit employee_id; the backend uses their own record. */
export function toSubmitPromotionRequest(
  values: PromotionFormValues,
  forSelf: boolean,
): SubmitPromotionRequest {
  return {
    ...(forSelf ? {} : { employee_id: Number(values.employee_id) }),
    proposed_grade_id: Number(values.proposed_grade_id),
    justification: values.justification.trim(),
  }
}

/** effective_date is only sent when approving. */
export function toPromotionReviewRequest(values: ReviewFormValues): PromotionReviewRequest {
  const status = values.decision as ReviewStatus
  return {
    status,
    remarks: values.remarks.trim(),
    ...(status === 'APPROVED' ? { effective_date: values.effective_date } : {}),
  }
}

export const promotionsApi = {
  list: (filter: PromotionFilter, signal?: AbortSignal) =>
    apiFetch<Page<PromotionApplication>>('/promotions', { query: { ...filter }, signal }),
  get: (id: number, signal?: AbortSignal) =>
    apiFetch<PromotionApplication>(`/promotions/${id}`, { signal }),
  submit: (values: PromotionFormValues, forSelf: boolean) =>
    apiFetch<PromotionApplication>('/promotions', {
      method: 'POST',
      body: toSubmitPromotionRequest(values, forSelf),
    }),
  review: (id: number, values: ReviewFormValues) =>
    apiFetch<PromotionApplication>(`/promotions/${id}/review`, {
      method: 'POST',
      body: toPromotionReviewRequest(values),
    }),
}
