import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { PortfolioPhotoResult } from '@/schema/portfolio'
import { AppError } from '@/lib/errors'

const portfolioRouter = new Hono<{ Bindings: Env }>()

async function sleep(delayMs: number): Promise<void> {
  return new Promise((r) => setTimeout(r, delayMs))
}

async function listWithRetry(
  bucket: R2Bucket,
  options: R2ListOptions,
  retries = 3,
  delayMs = 100,
): Promise<R2Objects> {
  let lastErr: unknown

  for (let i = 0; i < retries; i++) {
    try {
      return await bucket.list(options)
    } catch (err) {
      lastErr = err
      console.warn(`R2 list attempt ${i + 1}/${retries} failed:`, err)
      if (i < retries - 1) {
        await sleep(delayMs)
      }
    }
  }

  throw lastErr
}

portfolioRouter.get('/', async (c) => {
  const r2Result = await listWithRetry(
    c.env.R2_PORTFOLIO_PUBLIC,
    { prefix: 'prefix/', limit: 50 },
    3,
    100,
  ).catch((err) => {
    console.error('Portfolio fetch failed after retries:', err)
    throw new AppError('Failed to load portfolio', 502)
  })

  const photos = r2Result.objects.map((obj) => ({
    key: obj.key,
    uploaded: obj.uploaded.toISOString(),
  }))

  const response: PortfolioPhotoResult = { photos }
  return c.json(response, 200)
})

export { portfolioRouter }
