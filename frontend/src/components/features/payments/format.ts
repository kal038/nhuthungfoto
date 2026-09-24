/** Formatting helpers for the manual-payment UI (vi-VN everywhere). */

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
})

export function formatVnd(amountVnd: number): string {
  return vndFormatter.format(amountVnd)
}

/** "14:32" — deadline clock time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "24/09/2026 14:32" — full local timestamp. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Whole minutes left until the deadline (ceil: shows 1 min until truly 0). */
export function minutesUntil(expiresAt: string, now: number): number {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60_000))
}
