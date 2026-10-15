import { timingSafeEqual } from 'hono/utils/buffer'

/**
 * Constant-time comparison for secrets (webhook tokens, signatures).
 */
export async function safeSecretCompare(
  provided: string | undefined,
  expected: string | undefined,
): Promise<boolean> {
  if (!provided || !expected) return false

  return timingSafeEqual(provided, expected)
}
