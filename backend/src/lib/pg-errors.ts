import { AppError } from '@/lib/errors'

/**
 * PostgreSQL SQLSTATE codes raised by our RPCs / constraints.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_ERRCODE = {
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  INVALID_PARAMETER_VALUE: '22023',
  INSUFFICIENT_PRIVILEGE: '42501',
  NO_DATA_FOUND: 'P0002',
  OBJECT_NOT_IN_PREREQUISITE_STATE: '55000',
} as const

export type SqlState = (typeof PG_ERRCODE)[keyof typeof PG_ERRCODE]

/** The `error` shape returned by supabase-js when an RPC fails. */
export type PgErrorLike = {
  code?: string
  message?: string
}

/**
 * Per-callsite SQLSTATE → HTTP outcome. Messages are owned by the caller so the
 * same code can read differently in context (e.g. NO_DATA_FOUND = "User not
 * found" in add_credits vs "Submission not found" in spend_and_start_grading).
 */
export type PgErrorMapping = Partial<Record<SqlState, { status: number; message: string }>>

/**
 * Table-driven SQLSTATE → AppError mapping for RPC errors.
 *
 * - a hit in `mapping` returns AppError(message, status)
 * - a miss (unknown code, or no code) falls back to a 500 AppError carrying
 *   `fallbackMessage`, and logs the raw error for diagnosis
 *
 * `context` names the RPC that raised the error (used only for the unmapped log).
 */
export function mapPgError(
  error: PgErrorLike,
  mapping: PgErrorMapping,
  fallbackMessage = 'Internal Server Error',
  context?: string,
): AppError {
  //known error, exists on mapping
  const entry = error.code ? mapping[error.code as SqlState] : undefined
  if (entry) {
    return new AppError(entry.message, entry.status)
  }

  //unknwon error, fallback behaviour
  console.error(`Unmapped Postgres error${context ? ` in ${context}` : ''}:`, {
    code: error.code,
    message: error.message,
  })
  return new AppError(fallbackMessage, 500)
}

