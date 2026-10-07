import type { ReviewFormValues } from '@/components/review/schema'
import { apiFetch } from '@/lib/api/client'
import type {
  DisciplinaryFilter,
  DisciplinaryRecord,
  DisciplinaryRequest,
  DisciplinaryReviewRequest,
  OffenseCategory,
  Page,
  PenaltyType,
  ReviewStatus,
} from '@/lib/api/types'
import type { CaseFormValues } from './schema'

export function toDisciplinaryRequest(values: CaseFormValues): DisciplinaryRequest {
  return {
    employee_id: Number(values.employee_id),
    case_no: values.case_no.trim(),
    category: values.category as OffenseCategory,
    description: values.description.trim(),
    incident_date: values.incident_date,
    penalty: values.penalty as PenaltyType,
  }
}

/** Never includes effective_date: the backend rejects it for disciplinary reviews. */
export function toDisciplinaryReviewRequest(values: ReviewFormValues): DisciplinaryReviewRequest {
  return { status: values.decision as ReviewStatus, remarks: values.remarks.trim() }
}

export const disciplinaryApi = {
  list: (filter: DisciplinaryFilter, signal?: AbortSignal) =>
    apiFetch<Page<DisciplinaryRecord>>('/disciplinary-records', { query: { ...filter }, signal }),
  get: (id: number, signal?: AbortSignal) =>
    apiFetch<DisciplinaryRecord>(`/disciplinary-records/${id}`, { signal }),
  create: (values: CaseFormValues) =>
    apiFetch<DisciplinaryRecord>('/disciplinary-records', {
      method: 'POST',
      body: toDisciplinaryRequest(values),
    }),
  review: (id: number, values: ReviewFormValues) =>
    apiFetch<DisciplinaryRecord>(`/disciplinary-records/${id}/review`, {
      method: 'POST',
      body: toDisciplinaryReviewRequest(values),
    }),
}
