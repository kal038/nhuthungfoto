import { describe, it, expect } from 'vitest'
import { updateProfileSchema } from '@/schema/profile'

describe('updateProfileSchema', () => {
  describe('username', () => {
    it('should reject username field (read-only)', () => {
      const result = updateProfileSchema.safeParse({ username: 'newuser' })
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
        phone: '0912345678',
        avatarUrl: 'https://example.com/a.jpg',
      })
      expect(result.success).toBe(true)
    })

    it('should reject unknown fields', () => {
      const result = updateProfileSchema.safeParse({
        phone: '0912345678',
        unknownField: 'value',
      })
      expect(result.success).toBe(false)
    })
  })
})
