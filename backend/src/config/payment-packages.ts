export interface PaymentPackage {
  readonly id: string
  readonly label: string
  readonly credits: number
  readonly amountVnd: number
  readonly isPopular: boolean
  readonly enabled: boolean
}

/**
 * Authoritative payment package catalog.
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

export type PaymentPackageId = (typeof PAYMENT_PACKAGES)[number]['id'] // union of all current 'id's ('trial'|'practice'|'progress') thanks to "as const"

export function getEnabledPaymentPackages(): readonly PaymentPackage[] {
  return PAYMENT_PACKAGES.filter((paymentPackage) => paymentPackage.enabled)
}

export function getPaymentPackage(id: string): PaymentPackage | undefined {
  return PAYMENT_PACKAGES.find(
    (paymentPackage) => paymentPackage.enabled && paymentPackage.id === id,
  )
}
