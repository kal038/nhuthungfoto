import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import { AppError } from '@/lib/errors'

type TransactionType = Database['public']['Enums']['transaction_type']

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
    .select('*', { count: 'exact' })
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
    p_idempotency_key: idempotencyKey ?? null,
  })

  if (error) {
    console.error('spend_credits RPC error:', error)

    // PostgreSQL raises exception 'Insufficient credits' when balance < amount
    if (error.message?.includes('Insufficient credits')) {
      throw new AppError('Insufficient credits', 402)
    }

    // Postgres unique constraint violation (idempotency key collision)
    if (error.code === '23505' || error.message?.includes('duplicate key value')) {
      throw new AppError('Request already processed', 409)
    }

    throw new AppError('Failed to spend credits', 500)
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
    p_idempotency_key: idempotencyKey ?? null,
  })

  if (error) {
    console.error('add_credits RPC error:', error)
    throw new AppError('Failed to add credits', 500)
  }

  return data as number
}
