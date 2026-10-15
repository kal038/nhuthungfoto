import { describe, expect, it } from 'vitest'
import { safeSecretCompare } from '@/lib/utils'

describe('safeSecretCompare', () => {
  it('returns true for identical secrets', async () => {
    expect(await safeSecretCompare('super-secret-token', 'super-secret-token')).toBe(true)
  })

  it('returns false for different secrets of equal length', async () => {
    expect(await safeSecretCompare('super-secret-token', 'super-secret-tokeN')).toBe(false)
  })

  it('returns false for secrets of different length', async () => {
    expect(await safeSecretCompare('short', 'a-much-longer-secret')).toBe(false)
  })

  it('returns false when either side is missing or empty', async () => {
    expect(await safeSecretCompare(undefined, 'expected')).toBe(false)
    expect(await safeSecretCompare('provided', undefined)).toBe(false)
    expect(await safeSecretCompare('', 'expected')).toBe(false)
    expect(await safeSecretCompare('provided', '')).toBe(false)
  })
})
