import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { myQueryClient } from '@/lib/queryClient'
import { routeTree } from './routeTree.gen'
import './index.css'
import { apiFetch } from './lib/apiFetch'
// Create the router instance
const router = createRouter({ routeTree })
;(window as any).apiFetch = apiFetch

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={myQueryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
