import { Hono } from 'hono'
import { getEnabledPaymentPackages } from '@/config/payment-packages'
import type { AuthVars } from '@/middleware/auth'
import type { Env } from '@/types/env'

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

export { paymentsRouter }
