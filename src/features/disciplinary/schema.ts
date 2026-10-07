import { z } from 'zod'
import {
  OFFENSE_CATEGORIES,
  PENALTY_TYPES,
  SERIOUS_ONLY_PENALTIES,
  type OffenseCategory,
  type PenaltyType,
} from '@/lib/api/types'
import { isIsoDate, todayIsoDate } from '@/lib/dates'

const required = 'This field is required'

/** Demotion and dismissal are reserved for SERIOUS cases. */
export function penaltiesFor(category: string): readonly PenaltyType[] {
  if (!(OFFENSE_CATEGORIES as readonly string[]).includes(category)) return []
  return category === 'SERIOUS'
    ? PENALTY_TYPES
    : PENALTY_TYPES.filter((p) => !SERIOUS_ONLY_PENALTIES.includes(p))
}

export const caseSchema = z
  .object({
    employee_id: z.string().min(1, 'Choose an employee'),
    case_no: z.string().trim().min(1, required).max(50, 'At most 50 characters'),
    category: z.string().min(1, 'Choose a category'),
    description: z.string().trim().min(1, required),
    incident_date: z
      .string()
      .refine(isIsoDate, 'Enter a valid date')
      .refine((d) => d <= todayIsoDate(), 'Must not be in the future'),
    penalty: z.string().min(1, 'Choose a proposed penalty'),
  })
  .superRefine((v, ctx) => {
    if (v.penalty && v.category && !penaltiesFor(v.category).includes(v.penalty as PenaltyType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['penalty'],
        message: 'Only allowed for serious cases',
      })
    }
  })

export type CaseFormValues = z.infer<typeof caseSchema>

export function isOffenseCategory(value: string): value is OffenseCategory {
  return (OFFENSE_CATEGORIES as readonly string[]).includes(value)
}
