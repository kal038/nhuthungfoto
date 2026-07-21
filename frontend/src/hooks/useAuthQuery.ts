import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/errors'

/**
 * Wrapper around useQuery for any query that hits a protected endpoint.
 * - Waits for a valid Supabase session before firing (`enabled: !!session`)
 * - Skips retries on 401/403 (auth failures are never transient)
 * - Allows per-query overrides via the standard options object
 */
export function useAuthQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
>(options: UseQueryOptions<TQueryFnData, TError, TData>) {
  const { session } = useAuth()

  return useQuery<TQueryFnData, TError, TData>({
    ...options,
    enabled: !!session && (options.enabled ?? true),
    retry: (count, error) => {
      // Never retry auth failures
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        return false
      }
      // Allow up to 2 retries for transient errors (502, 503, network)
      return count < 2
    },
  })
}
