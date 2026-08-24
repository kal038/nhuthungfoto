import { useSyncExternalStore } from 'react'

const TICK_MS = 60_000

let lastNow = 0

function subscribe(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, TICK_MS)
  return () => window.clearInterval(id)
}

function getSnapshot() {
  // Bucketed so the snapshot stays stable between ticks — required by
  // useSyncExternalStore, and a "Chờ N ngày" label only needs minute precision.
  const now = Math.floor(Date.now() / TICK_MS) * TICK_MS
  if (now !== lastNow) lastNow = now
  return lastNow
}

/** Current epoch ms, re-rendering the component at most once per minute. */
export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
