import { describe, expect, it } from 'vitest'
import {
  PAYMENT_PACKAGES,
  getEnabledPaymentPackages,
  getPaymentPackage,
} from '@/config/payment-packages'

describe('payment package catalog', () => {
  it('defines the approved launch packages', () => {
    expect(PAYMENT_PACKAGES).toEqual([
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
    ])
  })

  it('makes each larger package cheaper per credit', () => {
    const unitPrices = PAYMENT_PACKAGES.map(
      (paymentPackage) => paymentPackage.amountVnd / paymentPackage.credits,
    )

    expect(unitPrices[1]).toBeLessThan(unitPrices[0])
    expect(unitPrices[2]).toBeLessThan(unitPrices[1])
  })

  it('returns enabled packages and resolves enabled IDs', () => {
    expect(getEnabledPaymentPackages()).toHaveLength(3)
    expect(getPaymentPackage('practice')?.credits).toBe(12)
    expect(getPaymentPackage('unknown')).toBeUndefined()
  })
})
