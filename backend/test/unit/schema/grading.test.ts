import { describe, it, expect } from 'vitest'
import { gradingRequestSchema } from '@/schema/grading'

describe('gradingRequestSchema', () => {
  const validBody = {
    overallScore: 8,
    categoryScores: {
      composition: 8,
      exposure: 9,
      creativity: 7,
      storytelling: 7,
      focus: 8,
    },
    comment: 'Bố cục tốt, ánh sáng đẹp.',
  }

  it('accepts a valid grading request', () => {
    const result = gradingRequestSchema.safeParse(validBody)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.overallScore).toBe(8)
      expect(result.data.categoryScores.composition).toBe(8)
      expect(result.data.comment).toBe('Bố cục tốt, ánh sáng đẹp.')
    }
  })

  it('applies default of 5 for missing category scores', () => {
    const body = {
      overallScore: 7,
      categoryScores: {},
      comment: 'Good work',
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categoryScores.composition).toBe(5)
      expect(result.data.categoryScores.exposure).toBe(5)
      expect(result.data.categoryScores.creativity).toBe(5)
      expect(result.data.categoryScores.storytelling).toBe(5)
      expect(result.data.categoryScores.focus).toBe(5)
    }
  })

  it('applies default of 5 for overallScore when not provided', () => {
    const body = {
      categoryScores: {
        composition: 8,
        exposure: 9,
        creativity: 7,
        storytelling: 7,
        focus: 8,
      },
      comment: 'Nice',
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.overallScore).toBe(5)
    }
  })

  it('rejects overallScore below 1', () => {
    const body = { ...validBody, overallScore: 0 }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects overallScore above 10', () => {
    const body = { ...validBody, overallScore: 11 }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects category score below 1', () => {
    const body = {
      ...validBody,
      categoryScores: { ...validBody.categoryScores, composition: 0 },
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects category score above 10', () => {
    const body = {
      ...validBody,
      categoryScores: { ...validBody.categoryScores, exposure: 11 },
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects non-integer scores', () => {
    const body = { ...validBody, overallScore: 8.5 }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects empty comment', () => {
    const body = { ...validBody, comment: '' }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only comment', () => {
    const body = { ...validBody, comment: '   ' }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('trims comment whitespace', () => {
    const body = { ...validBody, comment: '  Good work  ' }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comment).toBe('Good work')
    }
  })

  it('rejects extra fields due to .strict()', () => {
    const body = { ...validBody, extraField: 'nope' }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects missing comment field', () => {
    const { comment, ...noComment } = validBody
    const result = gradingRequestSchema.safeParse(noComment)
    expect(result.success).toBe(false)
  })

  it('rejects missing categoryScores field', () => {
    const { categoryScores, ...noCat } = validBody
    const result = gradingRequestSchema.safeParse(noCat)
    expect(result.success).toBe(false)
  })
})
