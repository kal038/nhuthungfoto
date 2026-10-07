import { z } from 'zod/v4'
import { getEnabledPaymentPackages } from '@/config/payment-packages'

// Enabled-only package ids; cast through string[] for z.enum's non-empty literal tuple.
export const PACKAGE_IDS = getEnabledPaymentPackages().map((p) => p.id)

if (PACKAGE_IDS.length === 0) {
  throw new Error('No enabled payment packages — misconfigured catalog')
}

// POST /v1/payments — create order from { packageId, clientRequestId }.
export const createOrderRequestSchema = z
  .object({
    packageId: z.enum(PACKAGE_IDS, { message: 'Unknown package' }),
    clientRequestId: z
      .string()
      .trim()
      .min(8, 'clientRequestId too short')
      .max(64, 'clientRequestId too long')
      .regex(/^[A-Za-z0-9_-]+$/, 'clientRequestId may only contain A-Z a-z 0-9 _ -'),
  })
  .strict()

export type CreateOrderInput = z.infer<typeof createOrderRequestSchema>

// Route params for status / confirm / cancel; orderId is server-minted.
export const orderIdParamsSchema = z
  .object({
    orderId: z.uuid({ message: 'orderId must be a valid UUID' }),
  })
  .strict()

export type OrderIdParams = z.infer<typeof orderIdParamsSchema>
