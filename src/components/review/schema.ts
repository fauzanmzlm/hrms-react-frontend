import { z } from 'zod'
import { isIsoDate } from '@/lib/dates'

const DECISIONS: readonly string[] = ['APPROVED', 'REJECTED']

export function reviewSchema(requireEffectiveDate: boolean) {
  return z
    .object({
      decision: z.string().refine((v) => DECISIONS.includes(v), 'Choose to approve or reject'),
      remarks: z.string().trim(),
      effective_date: z.string(),
    })
    .superRefine((v, ctx) => {
      if (v.decision === 'REJECTED' && !v.remarks) {
        ctx.addIssue({
          code: 'custom',
          path: ['remarks'],
          message: 'Remarks are required when rejecting',
        })
      }
      if (requireEffectiveDate && v.decision === 'APPROVED' && !isIsoDate(v.effective_date)) {
        ctx.addIssue({
          code: 'custom',
          path: ['effective_date'],
          message: 'Effective date is required when approving',
        })
      }
    })
}

export type ReviewFormValues = z.infer<ReturnType<typeof reviewSchema>>
