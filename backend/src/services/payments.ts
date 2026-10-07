import type { SupabaseClient } from '@supabase/supabase-js'
import { customAlphabet } from 'nanoid'
import type { Database } from '@/types/database.types'
import { getPaymentPackage } from '@/config/payment-packages'
import {
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
  PAYMENT_EXPIRY_MINUTES,
} from '@/config/payment'
import { AppError } from '@/lib/errors'
import { PG_ERRCODE, mapPgError, type PgErrorMapping } from '@/lib/pg-errors'
import type { CreateOrderInput } from '@/schema/payment'
import { sendPaymentReviewNotification } from '@/services/telegram'
import type { Env } from '@/types/env'

type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row']
type OrderStatus = Database['public']['Enums']['order_status']

// Typed mirror of the telegram_notification_status DB enum, so bare strings can't drift.
const TELEGRAM_NOTIFICATION_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const satisfies Record<
  string,
  Database['public']['Enums']['telegram_notification_status']
>

// The generated view Row marks every column nullable (views carry no
// constraints). The underlying table enforces NOT NULL, so the table Row is
// the truthful nullability — combine it with the view's effective_status.
export type EffectiveOrder = PaymentOrderRow & { effective_status: OrderStatus | null }

/** Outcomes for create_manual_payment_order errors, keyed by SQLSTATE. */
const CREATE_ORDER_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.UNIQUE_VIOLATION]: {
    status: 409,
    message: 'Could not create payment order; please try again',
  },
  [PG_ERRCODE.CHECK_VIOLATION]: { status: 400, message: 'Invalid order request' },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Invalid order request' },
}

/** Friendly package snapshot as stored in the order (catalog shape: id/label/credits/amountVnd). */
type PackageSnapshot = {
  id: string
  label: string
  credits: number
  amountVnd: number
}

// Unbiased random 7-char order code from nanoid (rejection-samples internally).
export const generateOrderCode = customAlphabet(ORDER_CODE_ALPHABET, ORDER_CODE_LENGTH)

/**
 * Atomically create (or reuse) a manual payment order.
 *
 * - resolves + snapshots the server-owned package
 * - computes the server-owned expiry timestamp
 * - calls create_manual_payment_order (itself idempotent per clientRequestId)
 *
 * @throws AppError(400) unknown package / invalid request
 * @throws AppError(409) unique conflict; caller may retry
 */
export async function createOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateOrderInput,
): Promise<PaymentOrderRow> {
  const pkg = getPaymentPackage(input.packageId)
  if (!pkg) {
    throw new AppError('Unknown package', 400)
  }

  const snapshot: PackageSnapshot = {
    id: pkg.id,
    label: pkg.label,
    credits: pkg.credits,
    amountVnd: pkg.amountVnd,
  }

  const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60_000).toISOString()

  const { data, error } = await supabase.rpc('create_manual_payment_order', {
    p_user_id: userId,
    p_client_request_id: input.clientRequestId,
    p_package_snapshot: snapshot,
    p_order_code: generateOrderCode(),
    p_expires_at: expiresAt,
  })

  if (error) {
    throw mapPgError(
      error,
      CREATE_ORDER_ERRORS,
      'Failed to create payment order',
      'create_manual_payment_order',
    )
  }

  if (!data) {
    console.error('create_manual_payment_order RPC returned no order')
    throw new AppError('Failed to create payment order', 500)
  }

  return data
}

/**
 * The caller's single active order (deadline-aware) or null.
 * At most one row can match — idx_payment_orders_active_user caps active
 * orders per user, and effective_status filtering keeps stale
 * PENDING_TRANSFER rows (past deadline) out.
 */
export async function getActiveOrderByUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EffectiveOrder | null> {
  const { data, error } = await supabase
    .from('payment_orders_effective')
    .select('*')
    .eq('user_id', userId)
    .in('effective_status', ['PENDING_TRANSFER', 'AWAITING_REVIEW'])
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch active payment order:', error)
    throw new AppError('Failed to fetch active payment order', 500)
  }

  return data ? (data as unknown as EffectiveOrder) : null
}

/**
 * Fetch a single order for a user via the payment_orders_effective view to get effective_status (not stale)
 *
 * @throws AppError(404) missing order or cross-user access
 * many possible  → no suffix() (never throw)
 * 0 or 1         → maybeSingle() (throw > 1 row)
 * exactly 1      → single() (throw 0 row, >1 row)
 */
export async function getOrderByUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderId: string,
): Promise<EffectiveOrder> {
  const { data, error } = await supabase
    .from('payment_orders_effective')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()

  //bad error (network, supabase, unknown)
  if (error) {
    console.error('Failed to fetch payment order:', error)
    throw new AppError('Failed to fetch payment order', 500)
  }

  //good error, just don't have data for user
  if (!data) {
    throw new AppError('Order not found', 404)
  }

  //good data, return to user
  // Cast: the generated view Row over-nullifies every column; the table's
  // NOT NULL constraints are the real guarantee.
  return data as unknown as EffectiveOrder
}

/** Outcomes for confirm_manual_payment_order errors, keyed by SQLSTATE. */
const CONFIRM_ORDER_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Order not found' },
  [PG_ERRCODE.OBJECT_NOT_IN_PREREQUISITE_STATE]: {
    status: 409,
    message: 'Order cannot be confirmed in its current state',
  },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Invalid order request' },
}

/** Outcomes for cancel_manual_payment_order errors, keyed by SQLSTATE. */
const CANCEL_ORDER_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Order not found' },
  [PG_ERRCODE.OBJECT_NOT_IN_PREREQUISITE_STATE]: {
    status: 409,
    message: 'Order cannot be cancelled after it is awaiting review',
  },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Invalid order request' },
}

/**
 * Customer confirmation that the bank transfer was sent.
 * PENDING_TRANSFER -> AWAITING_REVIEW (idempotent re-confirm returns the row).
 *
 * After the DB transition succeeds, sends a Telegram review notification.
 * On re-confirm, retries delivery if the previous attempt was not SENT.
 * Returns success only after Telegram delivery succeeds.
 *
 * @throws AppError(404) missing order or cross-user access
 * @throws AppError(409) terminal state, or PENDING_TRANSFER past its deadline
 * @throws AppError(502) Telegram delivery failure (retryable)
 */
export async function confirmOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderId: string,
  env?: Env,
): Promise<PaymentOrderRow> {
  const { data, error } = await supabase.rpc('confirm_manual_payment_order', {
    p_user_id: userId,
    p_order_id: orderId,
  })

  if (error) {
    throw mapPgError(
      error,
      CONFIRM_ORDER_ERRORS,
      'Failed to confirm payment order',
      'confirm_manual_payment_order',
    )
  }

  if (!data) {
    console.error('confirm_manual_payment_order RPC returned no order')
    throw new AppError('Failed to confirm payment order', 500)
  }

  // Skip notification if no env provided (e.g. testing) or already delivered on a previous confirm.
  if (!env || data.telegram_notification_status === TELEGRAM_NOTIFICATION_STATUS.SENT) {
    return data
  }

  // Attempt Telegram notification delivery. A failure here is retryable; record FAILED so a
  // later idempotent re-confirm retries instead of treating it as already delivered.
  try {
    await sendPaymentReviewNotification(env, {
      orderId: data.id,
      orderCode: data.order_code,
      amountVnd: data.amount_vnd,
      creditAmount: data.credit_amount,
      userId: data.user_id,
      confirmedAt: data.confirmed_at ?? new Date().toISOString(),
    })
  } catch (err) {
    // Log only the class/message: a fetch rejection's cause can embed the bot-token URL.
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : 'unknown error'
    console.error('Telegram notification delivery failed:', reason)

    const { error: failError } = await supabase.rpc('update_telegram_notification_status', {
      p_order_id: data.id,
      p_status: TELEGRAM_NOTIFICATION_STATUS.FAILED,
    })
    if (failError) {
      console.error('Failed to record notification status:', failError.message)
    }

    throw new AppError('Failed to deliver review notification — please retry', 502)
  }

  // The message was sent; record it so re-confirms don't resend a duplicate card.
  const { error: statusError } = await supabase.rpc('update_telegram_notification_status', {
    p_order_id: data.id,
    p_status: TELEGRAM_NOTIFICATION_STATUS.SENT,
  })
  if (statusError) {
    console.error('Failed to record notification status:', statusError.message)
    throw new AppError('Failed to record review notification status — please retry', 502)
  }

  return { ...data, telegram_notification_status: TELEGRAM_NOTIFICATION_STATUS.SENT }
}

/**
 * Customer cancellation before sending money.
 * PENDING_TRANSFER -> CANCELLED; past deadline -> EXPIRED (materialized);
 * terminal states return the row unchanged (idempotent no-op).
 *
 * @throws AppError(404) missing order or cross-user access
 * @throws AppError(409) AWAITING_REVIEW (money already claimed; admin owns it)
 */
export async function cancelOrder(
  supabase: SupabaseClient<Database>,
  userId: string,
  orderId: string,
): Promise<PaymentOrderRow> {
  const { data, error } = await supabase.rpc('cancel_manual_payment_order', {
    p_user_id: userId,
    p_order_id: orderId,
  })

  if (error) {
    throw mapPgError(
      error,
      CANCEL_ORDER_ERRORS,
      'Failed to cancel payment order',
      'cancel_manual_payment_order',
    )
  }

  if (!data) {
    console.error('cancel_manual_payment_order RPC returned no order')
    throw new AppError('Failed to cancel payment order', 500)
  }

  return data
}

/** Outcomes for approve_manual_payment_order errors, keyed by SQLSTATE. */
const APPROVE_ORDER_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Order not found' },
  [PG_ERRCODE.OBJECT_NOT_IN_PREREQUISITE_STATE]: {
    status: 409,
    message: 'Order cannot be approved in its current state',
  },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Invalid order request' },
}

/** Outcomes for reject_manual_payment_order errors, keyed by SQLSTATE. */
const REJECT_ORDER_ERRORS: PgErrorMapping = {
  [PG_ERRCODE.NO_DATA_FOUND]: { status: 404, message: 'Order not found' },
  [PG_ERRCODE.OBJECT_NOT_IN_PREREQUISITE_STATE]: {
    status: 409,
    message: 'Order cannot be rejected in its current state',
  },
  [PG_ERRCODE.INVALID_PARAMETER_VALUE]: { status: 400, message: 'Invalid order request' },
}

/**
 * Admin approves payment order after verifying bank transfer.
 * Atomically grants credits, writes payments ledger, and sets status to SUCCESS.
 * Idempotent: repeated calls on SUCCESS return the order.
 *
 * @throws AppError(404) order not found
 * @throws AppError(409) order not in AWAITING_REVIEW
 */
export async function approveOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  approvalMetadata?: Database['public']['Tables']['payment_orders']['Row']['approval_metadata'],
): Promise<PaymentOrderRow> {
  const { data, error } = await supabase.rpc('approve_manual_payment_order', {
    p_order_id: orderId,
    p_approval_metadata: approvalMetadata ?? undefined,
  })

  if (error) {
    throw mapPgError(
      error,
      APPROVE_ORDER_ERRORS,
      'Failed to approve payment order',
      'approve_manual_payment_order',
    )
  }

  if (!data) {
    console.error('approve_manual_payment_order RPC returned no order')
    throw new AppError('Failed to approve payment order', 500)
  }

  return data
}

/**
 * Admin rejects payment order (no matching bank transfer).
 * Moves AWAITING_REVIEW -> CANCELLED.
 *
 * @throws AppError(404) order not found
 * @throws AppError(409) order not in AWAITING_REVIEW
 */
export async function rejectOrder(
  supabase: SupabaseClient<Database>,
  orderId: string,
  approvalMetadata?: Database['public']['Tables']['payment_orders']['Row']['approval_metadata'],
): Promise<PaymentOrderRow> {
  const { data, error } = await supabase.rpc('reject_manual_payment_order', {
    p_order_id: orderId,
    p_approval_metadata: approvalMetadata ?? undefined,
  })

  if (error) {
    throw mapPgError(
      error,
      REJECT_ORDER_ERRORS,
      'Failed to reject payment order',
      'reject_manual_payment_order',
    )
  }

  if (!data) {
    console.error('reject_manual_payment_order RPC returned no order')
    throw new AppError('Failed to reject payment order', 500)
  }

  return data
}

