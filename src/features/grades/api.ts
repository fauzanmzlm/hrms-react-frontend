import { apiFetch } from '@/lib/api/client'
import type { Grade, GradeRequest } from '@/lib/api/types'
import type { GradeFormValues } from './schema'

export function toGradeRequest(values: GradeFormValues): GradeRequest {
  return {
    code: values.code.trim(),
    scheme: values.scheme.trim(),
    level: Number(values.level),
    title: values.title.trim(),
  }
}

export const gradesApi = {
  list: (signal?: AbortSignal) => apiFetch<Grade[]>('/grades', { signal }),
  create: (values: GradeFormValues) =>
    apiFetch<Grade>('/grades', { method: 'POST', body: toGradeRequest(values) }),
  update: (id: number, values: GradeFormValues) =>
    apiFetch<Grade>(`/grades/${id}`, { method: 'PUT', body: toGradeRequest(values) }),
  remove: (id: number) => apiFetch<void>(`/grades/${id}`, { method: 'DELETE' }),
}
