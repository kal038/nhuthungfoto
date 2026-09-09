import type { SupabaseClient } from '@supabase/supabase-js'
import { customAlphabet } from 'nanoid'
import type { Database } from '@/types/database.types'
import { getPaymentPackage } from '@/config/payment-packages'
import {
  ORDER_CODE_ALPHABET,
  ORDER_CODE_LENGTH,
  PAYMENT_EXPIRY_MINUTES,
  buildVietQrUrl,
} from '@/config/payment'
import { AppError } from '@/lib/errors'
import { PG_ERRCODE, mapPgError, type PgErrorMapping } from '@/lib/pg-errors'
import type { CreateOrderInput } from '@/schema/payment'

type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row']
type PaymentOrderEffectiveRow = Database['public']['Views']['payment_orders_effective']['Row']

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

/** Order + everything the customer needs to pay for it. */
export interface CreatedOrderResponse {
  order: PaymentOrderRow
  transferMessage: string
  qrUrl: string
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
): Promise<CreatedOrderResponse> {
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

  return {
    order: data,
    transferMessage: data.order_code,
    qrUrl: buildVietQrUrl(data.amount_vnd, data.order_code),
  }
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
): Promise<PaymentOrderEffectiveRow> {
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
  return data
}

/**
 * Customer confirmation of a completed bank transfer.
 * Lifecycle RPC not shipped yet — placeholder to keep routes thin.
 */
// export async function confirmOrder(
//   _supabase: SupabaseClient<Database>,
//   _userId: string,
//   _orderId: string,
// ): Promise<never> {
//   throw new AppError('Order confirmation will be available once lifecycle RPCs ship', 501)
// }

/**
 * Customer cancellation of a pending transfer order.
 * Lifecycle RPC not shipped yet — placeholder to keep routes thin.
 */
// export async function cancelOrder(
//   _supabase: SupabaseClient<Database>,
//   _userId: string,
//   _orderId: string,
// ): Promise<never> {
//   throw new AppError('Order cancellation will be available once lifecycle RPCs ship', 501)
// }
