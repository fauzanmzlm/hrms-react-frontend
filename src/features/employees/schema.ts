import { z } from 'zod'
import { GENDERS, SERVICE_STATUSES } from '@/lib/api/types'
import { isIsoDate } from '@/lib/dates'

/** Strips the dashes and spaces commonly used in MyKad numbers ("900101-14-5678"). */
export function normalizeIc(value: string): string {
  return value.replace(/[-\s]/g, '')
}

/**
 * Hint matching the backend check: 12 digits whose first six form a valid
 * YYMMDD date (YY 69-99 is 19xx, 00-68 is 20xx, as Go parses "06").
 */
export function isValidIcNumber(value: string): boolean {
  const ic = normalizeIc(value)
  if (!/^\d{12}$/.test(ic)) return false
  const yy = Number(ic.slice(0, 2))
  const year = yy >= 69 ? 1900 + yy : 2000 + yy
  return isIsoDate(`${year}-${ic.slice(2, 4)}-${ic.slice(4, 6)}`)
}

const required = (label: string) => z.string().trim().min(1, `${label} is required`)
const date = (label: string) => z.string().refine(isIsoDate, `${label} is required`)
const optionalDate = z.string().refine((v) => v === '' || isIsoDate(v), 'Enter a valid date')
const oneOf = (values: readonly string[], message: string) =>
  z.string().refine((v) => values.includes(v), message)

export function employeeSchema(mode: 'create' | 'edit') {
  return z
    .object({
      employee_no: required('Employee number'),
      ic_number: z
        .string()
        .trim()
        .refine(isValidIcNumber, 'Enter a 12-digit MyKad number, e.g. 900101-14-5678'),
      full_name: required('Full name'),
      email: z
        .string()
        .trim()
        .pipe(z.email({ message: 'Enter a valid email address' })),
      phone: z.string().trim(),
      date_of_birth: date('Date of birth'),
      gender: oneOf(GENDERS, 'Select a gender'),
      current_grade_id:
        mode === 'create' ? z.string().min(1, 'Select the starting grade') : z.string(),
      position: required('Position'),
      department: required('Department'),
      service_status: oneOf(SERVICE_STATUSES, 'Select a service status'),
      date_joined: date('Date joined'),
      confirmed_at: optionalDate,
    })
    .superRefine((v, ctx) => {
      if (
        isIsoDate(v.date_of_birth) &&
        isIsoDate(v.date_joined) &&
        v.date_joined <= v.date_of_birth
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['date_joined'],
          message: 'Must be after the date of birth',
        })
      }
      if (v.confirmed_at && isIsoDate(v.date_joined) && v.confirmed_at < v.date_joined) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmed_at'],
          message: 'Must not be before the date joined',
        })
      }
    })
}

export type EmployeeFormValues = z.infer<ReturnType<typeof employeeSchema>>
