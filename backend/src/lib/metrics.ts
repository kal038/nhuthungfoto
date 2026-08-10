import type { Context } from 'hono'
import type { Env } from '@/types/env'

/**
 * Track a custom business event to Workers Analytics Engine.
 *
 * - No-ops when the ANALYTICS binding is absent (e.g. unbound dev env).
 * - Fires via `ctx.executionCtx.waitUntil` so writes never block the response.
 * - Costs nothing on the free tier (10M writes/day).
 *
 * @param c      Hono context (needs env + executionCtx)
 * @param name   Event name, e.g. 'submissions.create'. Used as blobs[0] (queryable via blob1).
 * @param fields Optional extra dimensions. Keep small: max 20 blobs, 20 doubles, 1 index per write.
 */
export function trackEvent<T extends { Bindings: Env }>(
  c: Context<T>,
  name: string,
  fields?: {
    blobs?: string[]
    doubles?: number[]
    indexes?: string[]
  },
): void {
  const analytics = c.env.ANALYTICS
  if (!analytics) return

  const write = () =>
    analytics.writeDataPoint({
      blobs: [name, ...(fields?.blobs ?? [])],
      doubles: fields?.doubles ?? [],
      indexes: fields?.indexes ?? [],
    })

  c.executionCtx.waitUntil(Promise.resolve().then(write))
}
