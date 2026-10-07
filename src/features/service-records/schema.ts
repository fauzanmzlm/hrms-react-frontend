import { z } from 'zod'
import { APPOINTMENT_TYPES } from '@/lib/api/types'
import { isIsoDate } from '@/lib/dates'

export const serviceRecordSchema = z
  .object({
    grade_id: z.string().min(1, 'Select a grade'),
    position: z.string().trim().min(1, 'Position is required'),
    department: z.string().trim().min(1, 'Department is required'),
    appointment_type: z
      .string()
      .refine(
        (v) => (APPOINTMENT_TYPES as readonly string[]).includes(v),
        'Select an appointment type',
      ),
    effective_from: z.string().refine(isIsoDate, 'Start date is required'),
    effective_to: z.string().refine((v) => v === '' || isIsoDate(v), 'Enter a valid date'),
    remarks: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.effective_to && isIsoDate(v.effective_from) && v.effective_to < v.effective_from) {
      ctx.addIssue({
        code: 'custom',
        path: ['effective_to'],
        message: 'Must not be before the start date',
      })
    }
  })

export type ServiceRecordFormValues = z.infer<typeof serviceRecordSchema>
