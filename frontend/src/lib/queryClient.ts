import { QueryClient } from "@tanstack/react-query";

export const myQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000, // 1 min baseline
    },
  },
})
