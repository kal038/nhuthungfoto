import { Hono } from 'hono'

export const healthRouter = new Hono()

healthRouter.get('/', (c) => {
  const response = {
    status: 'ok',
    service: 'nhuthungfoto-api',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }
  return c.json(response, 200)
})
