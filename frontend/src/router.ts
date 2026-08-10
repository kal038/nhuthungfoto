import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Create the router instance
export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
