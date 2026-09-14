import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'
import { AppError } from '@/lib/errors'
import { PG_ERRCODE, mapPgError, type PgErrorMapping } from '@/lib/pg-errors'

type TransactionType = Database['public']['Enums']['transaction_type']
type ReviewType = Database['public']['Enums']['review_type']

/** Outcomes shared by all credit RPCs. Each RPC overrides NO_DATA_FOUND as needed. */
const CREDIT_RPC_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.CHECK_VIOLATION]: { status: 402, message: 'Insufficient credits' },
  [PG_ERRCODE.UNIQUE_VIOLATION]: { status: 409, message: 'Request already processed' },
  [PG_ERRCODE.INSUFFICIENT_PRIVILEGE]: { status: 403, message: 'Unauthorized' },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Amount must be positive' },
}

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
    .order('created_at', { ascending: false }) //make sure we got an index on this column
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
    throw mapPgError(error, CREDIT_RPC_ERRORS, 'Failed to spend credits', 'spend_credits')
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
    throw mapPgError(
      error,
      { ...CREDIT_RPC_ERRORS, [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'User not found' } },
      'Failed to add credits',
      'add_credits',
    )
  }

  return data as number
}

/**
 * Atomically spend credits AND flip a submission from UPLOADED to GRADING in
 * a single Postgres transaction. Removes the "debited but not grading" window
 * that the compensating-refund path in POST /:id/grade used to patch over.
 *
 * @returns new balance after deduction
 * @throws AppError(402) on insufficient credits
 * @throws AppError(404) on missing submission or wrong owner
 * @throws AppError(409) on submission not in UPLOADED, or idempotency-key replay
 */
export async function spendAndStartGrading(
  supabase: SupabaseClient<Database>,
  userId: string,
  submissionId: string,
  amount: number,
  reviewType: ReviewType,
  idempotencyKey: string,
  metadata?: Json,
): Promise<number> {
  const { data, error } = await supabase.rpc('spend_and_start_grading', {
    p_user_id: userId,
    p_submission_id: submissionId,
    p_amount: amount,
    p_review_type: reviewType,
    p_metadata: metadata ?? { submission_id: submissionId, review_type: reviewType },
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    throw mapPgError(
      error,
      {
        ...CREDIT_RPC_ERRORS,
        [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Submission not found' },
        [PG_ERRCODE.OBJECT_NOT_IN_PREREQUISITE_STATE]: {
          status: 409,
          message: 'Submission cannot be graded in its current status',
        },
      },
      'Failed to start grading',
      'spend_and_start_grading',
    )
  }

  return data as number
}
