import type { Role } from '@/lib/api/types'

/**
 * Which roles may perform each action. Mirrors the role middleware in the
 * backend router (internal/delivery/http/router.go); the backend still
 * enforces every rule, this only decides what the UI offers.
 */
const PERMISSIONS = {
  'users.create': ['ADMIN'],
  'grades.view': ['ADMIN', 'HR_OFFICER'],
  'grades.write': ['ADMIN', 'HR_OFFICER'],
  'grades.delete': ['ADMIN'],
  'employees.list': ['ADMIN', 'HR_OFFICER', 'APPROVER'],
  'employees.write': ['ADMIN', 'HR_OFFICER'],
  'employees.delete': ['ADMIN'],
  'serviceRecords.write': ['ADMIN', 'HR_OFFICER'],
  'promotions.submit': ['ADMIN', 'HR_OFFICER', 'EMPLOYEE'],
  'promotions.review': ['ADMIN', 'APPROVER'],
  'disciplinary.create': ['ADMIN', 'HR_OFFICER'],
  'disciplinary.review': ['ADMIN', 'APPROVER'],
} as const satisfies Record<string, readonly Role[]>

export type Action = keyof typeof PERMISSIONS

export function can(role: Role | undefined, action: Action): boolean {
  if (!role) return false
  return (PERMISSIONS[action] as readonly Role[]).includes(role)
}
