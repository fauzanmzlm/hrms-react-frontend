import { z } from 'zod'

const required = 'This field is required'

/** `forSelf`: EMPLOYEE callers apply for themselves, so no employee is picked. */
export function promotionSchema(forSelf: boolean) {
  return z.object({
    employee_id: forSelf ? z.string() : z.string().min(1, 'Choose an employee'),
    proposed_grade_id: z.string().min(1, 'Choose the proposed grade'),
    justification: z.string().trim().min(1, required).max(2000, 'Keep it under 2000 characters'),
  })
}

export type PromotionFormValues = z.infer<ReturnType<typeof promotionSchema>>
