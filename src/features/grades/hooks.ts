import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Grade } from '@/lib/api/types'
import { queryKeys } from '@/lib/query-keys'
import { gradesApi } from './api'
import type { GradeFormValues } from './schema'

/** All grades, fetched once and shared as a lookup across the app. */
export function useGrades() {
  return useQuery({
    queryKey: queryKeys.grades.all,
    queryFn: ({ signal }) => gradesApi.list(signal),
    staleTime: 10 * 60_000,
  })
}

export function useGradeMap(): Map<number, Grade> {
  const { data } = useGrades()
  return useMemo(() => new Map((data ?? []).map((g) => [g.id, g])), [data])
}

export function useCreateGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: GradeFormValues) => gradesApi.create(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  })
}

export function useUpdateGrade(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: GradeFormValues) => gradesApi.update(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  })
}

export function useDeleteGrade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => gradesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.grades.all }),
  })
}
