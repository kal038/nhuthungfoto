import { useCallback, useSyncExternalStore } from 'react'

/** Current epoch ms, bucketed to avoid unnecessary renders between ticks. */
export function useNow(tickMs = 60_000) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const id = window.setInterval(onStoreChange, tickMs)
      return () => window.clearInterval(id)
    },
    [tickMs],
  )
  const getSnapshot = useCallback(() => Math.floor(Date.now() / tickMs) * tickMs, [tickMs])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
