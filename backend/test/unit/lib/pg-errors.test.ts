import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors'
import { PG_ERRCODE, mapPgError } from '@/lib/pg-errors'

const MAPPING = {
  [PG_ERRCODE.UNIQUE_VIOLATION]: { status: 409, message: 'Request already processed' },
  [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'User not found' },
}

describe('mapPgError', () => {
  it('maps a known SQLSTATE to its AppError', () => {
    expect(mapPgError({ code: '23505', message: 'duplicate key' }, MAPPING, 'fallback')).toEqual(
      new AppError('Request already processed', 409),
    )
  })

  it('allows the same SQLSTATE to map differently per callsite mapping', () => {
    const submissionMapping = {
      ...MAPPING,
      [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Submission not found' },
    }
    expect(mapPgError({ code: 'P0002', message: 'x' }, submissionMapping, 'fallback')).toEqual(
      new AppError('Submission not found', 404),
    )
  })

  it('falls back to 500 with the callsite message for an unmapped code', () => {
    expect(mapPgError({ code: '22023', message: 'non-positive' }, MAPPING, 'Failed to add credits')).toEqual(
      new AppError('Failed to add credits', 500),
    )
  })

  it('falls back to 500 when the error has no code', () => {
    expect(mapPgError({ message: 'DB Down' }, MAPPING, 'Failed to add credits')).toEqual(
      new AppError('Failed to add credits', 500),
    )
  })
})