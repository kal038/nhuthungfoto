import { QueryClient, QueryCache } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'

export const myQueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.captureException(error, {
        tags: { queryKey: JSON.stringify(query.queryKey) },
      })
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 min baseline
    },
  },
})
