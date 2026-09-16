import { Hono } from 'hono'
import { getEnabledPaymentPackages } from '@/config/payment-packages'
import { buildVietQrUrl } from '@/config/payment'
import { createOrder, getOrderByUser } from '@/services/payments'
import { createOrderRequestSchema, orderIdParamsSchema } from '@/schema/payment'
import { createServiceClient } from '@/lib/supabase'
import { AppError, ZodParseError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import type { Env } from '@/types/env'
import type { Database } from '@/types/database.types'

type OrderStatus = Database['public']['Enums']['order_status']

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

/** POST /v1/payments response */
export interface CreateOrderResponse {
  id: string
  orderCode: string
  packageId: string
  packageLabel: string
  creditAmount: number
  amountVnd: number
  status: OrderStatus
  expiresAt: string
  transferMessage: string
  qrUrl: string
}

/** GET /v1/payments/:orderId/status response */
export interface OrderStatusResponse {
  id: string
  orderCode: string
  status: OrderStatus // deadline-aware (from payment_orders_effective)
  packageLabel: string
  creditAmount: number
  amountVnd: number
  confirmedAt: string | null
  expiresAt: string
  resolvedAt: string | null
  transferMessage: string
  qrUrl: string
}

const paymentsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

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
    orderCode: order.order_code,
    packageId: order.package_id,
    packageLabel: order.package_label,
    creditAmount: order.credit_amount,
    amountVnd: order.amount_vnd,
    status: order.status,
    expiresAt: order.expires_at,
    transferMessage,
    qrUrl,
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

  const response: OrderStatusResponse = {
    id: order.id,
    orderCode: order.order_code,
    status: order.effective_status ?? order.status,
    packageLabel: order.package_label,
    creditAmount: order.credit_amount,
    amountVnd: order.amount_vnd,
    confirmedAt: order.confirmed_at,
    expiresAt: order.expires_at,
    resolvedAt: order.resolved_at,
    // Recomputed server-side so the QR never disappears mid-flow.
    transferMessage: order.order_code,
    qrUrl: buildVietQrUrl(order.amount_vnd, order.order_code),
  }
  return c.json(response, 200)
})

// POST /v1/payments/:orderId/confirm — customer confirms the bank transfer.
// Wired now; lifecycle RPC not shipped yet.
paymentsRouter.post('/:orderId/confirm', (c) => {
  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }
  throw new AppError('Order confirmation will be available once lifecycle RPCs ship', 501)
})

// POST /v1/payments/:orderId/cancel — customer cancels a pending transfer.
// Wired now; lifecycle RPC not shipped yet.
paymentsRouter.post('/:orderId/cancel', (c) => {
  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }
  throw new AppError('Order cancellation will be available once lifecycle RPCs ship', 501)
})

export { paymentsRouter }
