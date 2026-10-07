import { apiFetch } from '@/lib/api/client'
import type { CreateUserRequest, Role, User } from '@/lib/api/types'
import type { UserFormValues } from './schema'

/** confirm_password is client-only; employee_id is omitted when not linked. */
export function toCreateUserRequest(values: UserFormValues): CreateUserRequest {
  return {
    username: values.username.trim(),
    password: values.password,
    role: values.role as Role,
    ...(values.employee_id ? { employee_id: Number(values.employee_id) } : {}),
  }
}

export const usersApi = {
  create: (values: UserFormValues) =>
    apiFetch<User>('/users', { method: 'POST', body: toCreateUserRequest(values) }),
}
