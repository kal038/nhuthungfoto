import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nhuthungfoto-api',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
})
