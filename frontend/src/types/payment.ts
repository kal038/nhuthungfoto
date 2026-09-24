/**
 * Shared payment types — the frontend mirror of backend/src/routes/payments.ts
 * response shapes (snake_case, matching the DB and /credits/* endpoints).
 * Hooks import from here; never re-declare these inline.
 */

export type PaymentOrderStatus =
  | 'PENDING_TRANSFER'
  | 'AWAITING_REVIEW'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'EXPIRED'

/** GET /v1/payments/packages response. */
export interface PaymentPackageListItem {
  id: string
  label: string
  credits: number
  amountVnd: number
  isPopular: boolean
}

export interface PaymentPackagesResponse {
  packages: PaymentPackageListItem[]
}

/**
 * Order payload as returned by every order endpoint
 * (create / status / confirm / cancel / active). Mirrors OrderResponse.
 */
export interface PaymentOrder {
  id: string
  order_code: string
  package_id: string
  status: PaymentOrderStatus
  package_label: string
  credit_amount: number
  amount_vnd: number
  confirmed_at: string | null
  expires_at: string
  resolved_at: string | null
  transfer_message: string
  qr_url: string
}

export interface ActivePaymentOrderResponse {
  order: PaymentOrder | null
}

/** POST /v1/payments create response is a full order. */
export type CreatePaymentIntentResult = PaymentOrder
