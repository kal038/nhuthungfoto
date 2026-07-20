import { z } from 'zod/v4'

export const gradeSubmissionSchema = z.object({
  reviewType: z.enum(['AI', 'HUNG']),
})

export const creditHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const CREDIT_COST = {
  AI: 1,
  HUNG: 3,
} as const satisfies Record<string, number>
