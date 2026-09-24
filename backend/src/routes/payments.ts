import { Hono } from 'hono'
import { getEnabledPaymentPackages } from '@/config/payment-packages'
import { buildVietQrUrl } from '@/config/payment'
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  getActiveOrderByUser,
  getOrderByUser,
} from '@/services/payments'
import { createOrderRequestSchema, orderIdParamsSchema } from '@/schema/payment'
import { createServiceClient } from '@/lib/supabase'
import { ZodParseError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import type { Env } from '@/types/env'
import type { Database } from '@/types/database.types'

type OrderStatus = Database['public']['Enums']['order_status']
type PaymentOrderRow = Database['public']['Tables']['payment_orders']['Row']

export interface PaymentPackageListItem {
  readonly id: string
  readonly label: string
  readonly credits: number
  readonly amountVnd: number
  readonly isPopular: boolean
}

export interface PaymentPackagesResponse {
  packages: readonly PaymentPackageListItem[]
}

export interface OrderResponse {
  id: string
  order_code: string
  package_id: string
  package_label: string
  status: OrderStatus
  credit_amount: number
  amount_vnd: number
  confirmed_at: string | null
  expires_at: string
  resolved_at: string | null
  transfer_message: string
  qr_url: string
}

const paymentsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

/** RPC rows carry no effective_status; view rows do. */
type OrderRowLike = PaymentOrderRow & { effective_status?: OrderStatus | null }

/** Single place that derives status + QR for every order endpoint. */
function toOrderResponse(order: OrderRowLike): OrderResponse {
  return {
    id: order.id,
    order_code: order.order_code,
    package_id: order.package_id,
    package_label: order.package_label,
    status: order.effective_status ?? order.status,
    credit_amount: order.credit_amount,
    amount_vnd: order.amount_vnd,
    confirmed_at: order.confirmed_at,
    expires_at: order.expires_at,
    resolved_at: order.resolved_at,
    transfer_message: order.order_code,
    qr_url: buildVietQrUrl(order.amount_vnd, order.order_code),
  }
}

paymentsRouter.get('/active', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const active = await getActiveOrderByUser(supabase, userId)

  return c.json({ order: active ? toOrderResponse(active) : null }, 200)
})

// GET /v1/payments/packages
paymentsRouter.get('/packages', (c) => {
  const packages = getEnabledPaymentPackages()
  const response: PaymentPackagesResponse = { packages }
  return c.json(response, 200)
})

// POST /v1/payments — create a manual payment order
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

  const order = await createOrder(supabase, userId, parsed.data)

  return c.json(toOrderResponse(order), 200)
})

// GET /v1/payments/:orderId/status
paymentsRouter.get('/:orderId/status', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await getOrderByUser(supabase, userId, parsed.data.orderId)

  return c.json(toOrderResponse(order), 200)
})

// POST /v1/payments/:orderId/confirm — customer confirms the bank transfer
paymentsRouter.post('/:orderId/confirm', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await confirmOrder(supabase, userId, parsed.data.orderId)

  return c.json(toOrderResponse(order), 200)
})

// POST /v1/payments/:orderId/cancel — customer cancels a pending transfer
paymentsRouter.post('/:orderId/cancel', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const parsed = orderIdParamsSchema.safeParse({ orderId: c.req.param('orderId') })
  if (!parsed.success) {
    throw new ZodParseError('Invalid order id')
  }

  const order = await cancelOrder(supabase, userId, parsed.data.orderId)

  return c.json(toOrderResponse(order), 200)
})

export { paymentsRouter }
