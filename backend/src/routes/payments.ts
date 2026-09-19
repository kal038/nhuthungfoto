import { Hono } from 'hono'
import { getEnabledPaymentPackages } from '@/config/payment-packages'
import { buildVietQrUrl } from '@/config/payment'
import { cancelOrder, confirmOrder, createOrder, getOrderByUser } from '@/services/payments'
import { createOrderRequestSchema, orderIdParamsSchema } from '@/schema/payment'
import { createServiceClient } from '@/lib/supabase'
import { ZodParseError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import type { Env } from '@/types/env'
import type { Database } from '@/types/database.types'

type OrderStatus = Database['public']['Enums']['order_status']
type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row']

// --- Response types (mirror these on the frontend) ---

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
 * POST /v1/payments response.
 * API casing = snake_case, matching the DB and /credits/* endpoints.
 */
export interface CreateOrderResponse {
  id: string
  order_code: string
  package_id: string
  package_label: string
  credit_amount: number
  amount_vnd: number
  status: OrderStatus
  expires_at: string
  transfer_message: string
  qr_url: string
}

/** GET /v1/payments/:orderId/status response */
export interface OrderStatusResponse {
  id: string
  order_code: string
  status: OrderStatus // deadline-aware (from payment_orders_effective)
  package_label: string
  credit_amount: number
  amount_vnd: number
  confirmed_at: string | null
  expires_at: string
  resolved_at: string | null
  transfer_message: string
  qr_url: string
}

const paymentsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

/**
 * Shared read-your-write response for status / confirm / cancel.
 * `status` is passed explicitly: the effective view supplies the deadline-aware
 * status for reads, while lifecycle RPCs return the row they just wrote.
 */
function toOrderStatusResponse(order: PaymentOrderRow, status: OrderStatus): OrderStatusResponse {
  return {
    id: order.id,
    order_code: order.order_code,
    status,
    package_label: order.package_label,
    credit_amount: order.credit_amount,
    amount_vnd: order.amount_vnd,
    confirmed_at: order.confirmed_at,
    expires_at: order.expires_at,
    resolved_at: order.resolved_at,
    // Recomputed server-side so the QR never disappears mid-flow.
    transfer_message: order.order_code,
    qr_url: buildVietQrUrl(order.amount_vnd, order.order_code),
  }
}

// GET /v1/payments/packages — enabled server-owned credit packages
paymentsRouter.get('/packages', (c) => {
  const packages = getEnabledPaymentPackages().map(
    ({ id, label, credits, amountVnd, isPopular }) => ({
      id,
      label,
      credits,
      amountVnd,
      isPopular,
    }),
  )

  const response: PaymentPackagesResponse = { packages }
  return c.json(response, 200)
})

// POST /v1/payments — create (or idempotently reuse) a manual payment order
paymentsRouter.post('/', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const body = await c.req.json().catch(() => {
    throw new ZodParseError('Request body must be valid JSON')
  })

  const parsed = createOrderRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new ZodParseError()
  }

  const { order, transferMessage, qrUrl } = await createOrder(supabase, userId, parsed.data)

  //read own write just now
  const response: CreateOrderResponse = {
    id: order.id,
    order_code: order.order_code,
    package_id: order.package_id,
    package_label: order.package_label,
    credit_amount: order.credit_amount,
    amount_vnd: order.amount_vnd,
    status: order.status,
    expires_at: order.expires_at,
    transfer_message: transferMessage,
    qr_url: qrUrl,
  }
  return c.json(response, 200)
})

// GET /v1/payments/:orderId/status — deadline-aware order status
paymentsRouter.get('/:orderId/status', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await getOrderByUser(supabase, userId, parsed.data.orderId)

  return c.json(toOrderStatusResponse(order, order.effective_status ?? order.status), 200)
})

// POST /v1/payments/:orderId/confirm — customer confirms the bank transfer
// PENDING_TRANSFER -> AWAITING_REVIEW (idempotent on repeat)
paymentsRouter.post('/:orderId/confirm', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await confirmOrder(supabase, userId, parsed.data.orderId)

  return c.json(toOrderStatusResponse(order, order.status), 200)
})

// POST /v1/payments/:orderId/cancel — customer cancels a pending transfer
// PENDING_TRANSFER -> CANCELLED | EXPIRED (terminal states are idempotent no-ops)
paymentsRouter.post('/:orderId/cancel', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await cancelOrder(supabase, userId, parsed.data.orderId)

  return c.json(toOrderStatusResponse(order, order.status), 200)
})

export { paymentsRouter }
