import { describe, it, expect } from 'vitest'
import { updateProfileSchema } from '../../../src/schema/profile'

describe('updateProfileSchema', () => {
  describe('fullName', () => {
    it('should accept valid fullName with 2 characters', () => {
      const result = updateProfileSchema.safeParse({ fullName: 'An' })
      expect(result.success).toBe(true)
    })

    it('should accept valid fullName with 100 characters', () => {
      const result = updateProfileSchema.safeParse({ fullName: 'A'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('should reject fullName with less than 2 characters', () => {
      const result = updateProfileSchema.safeParse({ fullName: 'A' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2')
      }
    })

    it('should reject fullName with more than 100 characters', () => {
      const result = updateProfileSchema.safeParse({ fullName: 'A'.repeat(101) })
      expect(result.success).toBe(false)
    })
  })

  describe('phone', () => {
    it('should accept valid Vietnamese phone number starting with 0', () => {
      const result = updateProfileSchema.safeParse({ phone: '0912345678' })
      expect(result.success).toBe(true)
    })

    it('should accept empty string for phone', () => {
      const result = updateProfileSchema.safeParse({ phone: '' })
      expect(result.success).toBe(true)
    })

    it('should reject phone without leading 0', () => {
      const result = updateProfileSchema.safeParse({ phone: '1234567890' })
      expect(result.success).toBe(false)
    })

    it('should reject phone that is too short', () => {
      const result = updateProfileSchema.safeParse({ phone: '091234567' })
      expect(result.success).toBe(false)
    })

    it('should reject phone that is too long', () => {
      const result = updateProfileSchema.safeParse({ phone: '09123456789' })
      expect(result.success).toBe(false)
    })

    it('should reject phone with letters', () => {
      const result = updateProfileSchema.safeParse({ phone: '09123abcde' })
      expect(result.success).toBe(false)
    })
  })

  describe('avatarUrl', () => {
    it('should accept valid URL', () => {
      const result = updateProfileSchema.safeParse({ avatarUrl: 'https://example.com/avatar.png' })
      expect(result.success).toBe(true)
    })

    it('should accept empty string for avatarUrl', () => {
      const result = updateProfileSchema.safeParse({ avatarUrl: '' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid URL', () => {
      const result = updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' })
      expect(result.success).toBe(false)
    })
  })

  describe('partial updates', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = updateProfileSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept only fullName', () => {
      const result = updateProfileSchema.safeParse({ fullName: 'John Doe' })
      expect(result.success).toBe(true)
    })

    it('should accept only phone', () => {
      const result = updateProfileSchema.safeParse({ phone: '0912345678' })
      expect(result.success).toBe(true)
    })

    it('should accept only avatarUrl', () => {
      const result = updateProfileSchema.safeParse({ avatarUrl: 'https://example.com/a.jpg' })
      expect(result.success).toBe(true)
    })

    it('should accept all fields together', () => {
      const result = updateProfileSchema.safeParse({
        fullName: 'John Doe',
        phone: '0912345678',
        avatarUrl: 'https://example.com/a.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('should strip unknown fields', () => {
      const result = updateProfileSchema.safeParse({
        fullName: 'John',
        unknownField: 'value',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField')
      }
    })
  })
})
