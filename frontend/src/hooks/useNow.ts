import { useSyncExternalStore } from 'react'

const TICK_MS = 60_000

function subscribe(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, TICK_MS)
  return () => window.clearInterval(id)
}

function getSnapshot() {
  // Bucketed so the snapshot stays stable between ticks — required by
  // useSyncExternalStore, and an hour-precision countdown label only needs
  // minute granularity.
  return Math.floor(Date.now() / TICK_MS) * TICK_MS
}

/** Current epoch ms, re-rendering the component at most once per minute. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
