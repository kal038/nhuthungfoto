import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import { AppError } from '@/lib/errors'

type TransactionType = Database['public']['Enums']['transaction_type']

/**
 * PostgreSQL SQLSTATE codes raised by the credit RPCs / unique constraint.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERRCODE = {
  UNIQUE_VIOLATION: '23505', // idempotency key collision on credit_history
  CHECK_VIOLATION: '23514', // raised by spend_credits when balance < amount
  INVALID_PARAMETER_VALUE: '22023', // non-positive amount
  INSUFFICIENT_PRIVILEGE: '42501', // caller not allowed to act on this user
  NO_DATA_FOUND: 'P0002', // user not found
} as const

export interface CreditHistoryEntry {
  id: string
  amount: number
  type: TransactionType
  metadata: Record<string, unknown> | null
  created_at: string
}

/**
 * Get current credit balance for a user.
 */
export async function getBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('Failed to fetch credit balance:', error)
    throw new AppError('Failed to fetch credit balance', 500)
  }

  return data.credits_balance ?? 0
}

/**
 * Get paginated credit history for a user.
 */
export async function getHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ entries: CreditHistoryEntry[]; total: number }> {
  const { data, error, count } = await supabase
    .from('credit_history')
    .select('id, amount, type, metadata, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch credit history:', error)
    throw new AppError('Failed to fetch credit history', 500)
  }

  return {
    entries: (data ?? []) as CreditHistoryEntry[],
    total: count ?? 0,
  }
}

/**
 * Atomically spend credits via PostgreSQL RPC.
 * Deducts balance and inserts audit log in a single transaction.
 *
 * @returns new balance after deduction
 * @throws AppError(402) on insufficient credits
 */
export async function spendCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  amount: number,
  metadata?: Json,
  idempotencyKey?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('spend_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: 'SPEND',
    p_metadata: metadata ?? null,
    p_idempotency_key: idempotencyKey ?? undefined,
  })

  if (error) {
    console.error('spend_credits RPC error:', error)

    switch (error.code) {
      case PG_ERRCODE.CHECK_VIOLATION:
        throw new AppError('Insufficient credits', 402)
      case PG_ERRCODE.UNIQUE_VIOLATION:
        throw new AppError('Request already processed', 409)
      case PG_ERRCODE.INSUFFICIENT_PRIVILEGE:
        throw new AppError('Unauthorized', 403)
      case PG_ERRCODE.INVALID_PARAMETER_VALUE:
        throw new AppError('Amount must be positive', 400)
      default:
        throw new AppError('Failed to spend credits', 500)
    }
  }

  return data as number
}

/**
 * Atomically add credits via PostgreSQL RPC.
 * Increments balance and inserts audit log in a single transaction.
 *
 * @returns new balance after addition
 */
export async function addCredits(
  supabase: SupabaseClient<Database>,
  userId: string,
  amount: number,
  type: TransactionType = 'PURCHASE',
  metadata?: Json,
  idempotencyKey?: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_metadata: metadata ?? null,
    p_idempotency_key: idempotencyKey ?? undefined,
  })

  if (error) {
    console.error('add_credits RPC error:', error)

    switch (error.code) {
      case PG_ERRCODE.INSUFFICIENT_PRIVILEGE:
        throw new AppError('Unauthorized', 403)
      case PG_ERRCODE.INVALID_PARAMETER_VALUE:
        throw new AppError('Amount must be positive', 400)
      case PG_ERRCODE.NO_DATA_FOUND:
        throw new AppError('User not found', 404)
      case PG_ERRCODE.UNIQUE_VIOLATION:
        throw new AppError('Request already processed', 409)
      default:
        throw new AppError('Failed to add credits', 500)
    }
  }

  return data as number
}
