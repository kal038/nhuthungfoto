import { describe, it, expect } from 'vitest'
import { gradeSubmissionSchema, creditHistoryQuerySchema } from '@/schema/credit'

describe('Credit Schemas', () => {
  describe('gradeSubmissionSchema', () => {
    it('accepts valid review types', () => {
      expect(gradeSubmissionSchema.parse({ reviewType: 'AI' })).toEqual({ reviewType: 'AI' })
      expect(gradeSubmissionSchema.parse({ reviewType: 'HUNG' })).toEqual({ reviewType: 'HUNG' })
    })

    it('rejects invalid review types', () => {
      const result = gradeSubmissionSchema.safeParse({ reviewType: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('creditHistoryQuerySchema', () => {
    it('applies defaults', () => {
      const result = creditHistoryQuerySchema.parse({})
      expect(result).toEqual({ limit: 20, offset: 0 })
    })

    it('coerces strings to numbers', () => {
      const result = creditHistoryQuerySchema.parse({ limit: '10', offset: '5' })
      expect(result).toEqual({ limit: 10, offset: 5 })
    })

    it('respects min and max bounds', () => {
      expect(creditHistoryQuerySchema.safeParse({ limit: 0 }).success).toBe(false)
      expect(creditHistoryQuerySchema.safeParse({ limit: 101 }).success).toBe(false)
      expect(creditHistoryQuerySchema.safeParse({ offset: -1 }).success).toBe(false)
    })
  })
})
