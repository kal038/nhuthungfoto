export interface PaymentPackage {
  id: string
  label: string
  credits: number
  amountVnd: number
  isPopular: boolean
  enabled: boolean
}

/**
 * Authoritative payment package catalog.
 *
 * Order creation must snapshot credits and amountVnd from this catalog rather
 * than accepting either value from clients.
 */
export const PAYMENT_PACKAGES = [
  {
    id: 'trial',
    label: 'Trải nghiệm',
    credits: 3,
    amountVnd: 99_000,
    isPopular: false,
    enabled: true,
  },
  {
    id: 'practice',
    label: 'Luyện tập',
    credits: 12,
    amountVnd: 349_000,
    isPopular: true,
    enabled: true,
  },
  {
    id: 'progress',
    label: 'Tiến bộ',
    credits: 30,
    amountVnd: 749_000,
    isPopular: false,
    enabled: true,
  },
] as const satisfies readonly PaymentPackage[]

export type PaymentPackageId = (typeof PAYMENT_PACKAGES)[number]['id']

export function getEnabledPaymentPackages(): readonly PaymentPackage[] {
  return PAYMENT_PACKAGES.filter((paymentPackage) => paymentPackage.enabled)
}

export function getPaymentPackage(id: string): PaymentPackage | undefined {
  return PAYMENT_PACKAGES.find(
    (paymentPackage) => paymentPackage.enabled && paymentPackage.id === id,
  )
}
