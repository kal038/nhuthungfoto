import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { PortfolioPhoto, PortfolioPhotoResult } from '../schema/portfolio'

const portfolioRouter = new Hono<{ Bindings: Env }>()

portfolioRouter.get('/', async (c) => {
  const r2Result = await c.env.R2_PORTFOLIO_PUBLIC.list({
    prefix: 'portfolio/',
    limit: 50,
  })

  const photos = r2Result.objects.map(
    (obj) =>
      ({
        key: obj.key,
        uploaded: obj.uploaded.toISOString(),
      }) as PortfolioPhoto,
  )

  const response: PortfolioPhotoResult = { photos }
  return c.json(response, 200)
})

export { portfolioRouter }
