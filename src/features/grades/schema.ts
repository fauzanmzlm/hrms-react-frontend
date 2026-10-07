import { z } from 'zod'

export const gradeSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(10, 'Code must be at most 10 characters'),
  scheme: z.string().trim().min(1, 'Scheme is required'),
  level: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'Level must be a whole number greater than 0'),
  title: z.string().trim().min(1, 'Title is required'),
})

export type GradeFormValues = z.infer<typeof gradeSchema>
