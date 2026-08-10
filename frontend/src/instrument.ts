import * as Sentry from '@sentry/react'
import { router } from './router'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  environment: import.meta.env.MODE,
  integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
  tracesSampleRate: 0.1,
  tracePropagationTargets: [/^\//, /^https:\/\/nhuthungfoto\.com\/api/],
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
})
