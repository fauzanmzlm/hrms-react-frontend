import { z } from 'zod'
import { ROLES } from '@/lib/api/types'

const byteLength = (s: string) => new TextEncoder().encode(s).length

export const userSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Must be 3 to 50 characters')
      .max(50, 'Must be 3 to 50 characters'),
    password: z
      .string()
      .refine((p) => byteLength(p) >= 8, 'At least 8 characters')
      .refine((p) => byteLength(p) <= 72, 'At most 72 bytes'),
    confirm_password: z.string(),
    role: z.string().refine((r) => (ROLES as readonly string[]).includes(r), 'Choose a role'),
    employee_id: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.confirm_password !== v.password) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirm_password'],
        message: 'Passwords do not match',
      })
    }
    if (v.role === 'EMPLOYEE' && !v.employee_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['employee_id'],
        message: 'Employee accounts must be linked to an employee record',
      })
    }
  })

export type UserFormValues = z.infer<typeof userSchema>
