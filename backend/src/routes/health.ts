import { Hono } from 'hono'

export const healthRouter = new Hono()

healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'nhuthungfoto-api',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
})
