import { z } from 'zod/v4'

const scoreSchema = z.number().int().min(1).max(100).default(50)

const jsonSchema = z.object({
  composition: scoreSchema,
  exposure: scoreSchema,
  creativity: scoreSchema,
  storytelling: scoreSchema,
  focus: scoreSchema,
})

export const gradingRequestSchema = z
  .object({
    overallScore: scoreSchema,
    categoryScores: jsonSchema,
    comment: z.string().trim().min(1),
  })
  .strict()
