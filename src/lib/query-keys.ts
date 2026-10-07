import type { DisciplinaryFilter, EmployeeFilter, PromotionFilter } from '@/lib/api/types'

export const queryKeys = {
  me: ['auth', 'me'] as const,
  grades: {
    all: ['grades'] as const,
  },
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filter: EmployeeFilter) => [...queryKeys.employees.lists(), filter] as const,
    detail: (id: number) => [...queryKeys.employees.all, 'detail', id] as const,
  },
  serviceRecords: {
    all: ['service-records'] as const,
    byEmployee: (employeeId: number) =>
      [...queryKeys.serviceRecords.all, 'employee', employeeId] as const,
  },
  promotions: {
    all: ['promotions'] as const,
    lists: () => [...queryKeys.promotions.all, 'list'] as const,
    list: (filter: PromotionFilter) => [...queryKeys.promotions.lists(), filter] as const,
    detail: (id: number) => [...queryKeys.promotions.all, 'detail', id] as const,
  },
  disciplinary: {
    all: ['disciplinary'] as const,
    lists: () => [...queryKeys.disciplinary.all, 'list'] as const,
    list: (filter: DisciplinaryFilter) => [...queryKeys.disciplinary.lists(), filter] as const,
    detail: (id: number) => [...queryKeys.disciplinary.all, 'detail', id] as const,
  },
}
