import { describe, it, expect } from 'vitest'
import { gradingRequestSchema } from '@/schema/grading'

describe('gradingRequestSchema', () => {
  const validBody = {
    overallScore: 85,
    categoryScores: {
      composition: 80,
      exposure: 90,
      creativity: 75,
      storytelling: 70,
      focus: 85,
    },
    comment: 'Bố cục tốt, ánh sáng đẹp.',
  }

  it('accepts a valid grading request', () => {
    const result = gradingRequestSchema.safeParse(validBody)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.overallScore).toBe(85)
      expect(result.data.categoryScores.composition).toBe(80)
      expect(result.data.comment).toBe('Bố cục tốt, ánh sáng đẹp.')
    }
  })

  it('applies default of 50 for missing category scores', () => {
    const body = {
      overallScore: 70,
      categoryScores: {},
      comment: 'Good work',
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.categoryScores.composition).toBe(50)
      expect(result.data.categoryScores.exposure).toBe(50)
      expect(result.data.categoryScores.creativity).toBe(50)
      expect(result.data.categoryScores.storytelling).toBe(50)
      expect(result.data.categoryScores.focus).toBe(50)
    }
  })

  it('applies default of 50 for overallScore when not provided', () => {
    const body = {
      categoryScores: {
        composition: 80,
        exposure: 90,
        creativity: 75,
        storytelling: 70,
        focus: 85,
      },
      comment: 'Nice',
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.overallScore).toBe(50)
    }
  })

  it('rejects overallScore below 1', () => {
    const body = { ...validBody, overallScore: 0 }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects overallScore above 100', () => {
    const body = { ...validBody, overallScore: 101 }
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

  it('rejects category score above 100', () => {
    const body = {
      ...validBody,
      categoryScores: { ...validBody.categoryScores, exposure: 101 },
    }
    const result = gradingRequestSchema.safeParse(body)
    expect(result.success).toBe(false)
  })

  it('rejects non-integer scores', () => {
    const body = { ...validBody, overallScore: 85.5 }
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
