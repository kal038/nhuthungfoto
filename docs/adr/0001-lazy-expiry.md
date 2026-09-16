# ADR-0001: Lazy expiry for payment orders

- **Status:** accepted
- **Date:** 2026-09-16
- **Supersedes:** —

## Context

A `PENDING_TRANSFER` order has a server-computed `expires_at` deadline. Once it
passes, the order is no longer payable and must not block the user's next
purchase (the one-active-order-per-user cap).

The deadline passes **without any request** — nothing happens at that instant.
We need a way for the order to become `EXPIRED` that (a) is correct for reads,
(b) frees the active-order cap, and (c) does not require extra infrastructure.

## Decision

Expiry is **lazy**:

- **Reads** compute it: `payment_orders_effective.effective_status` reports
  `EXPIRED` for a `PENDING_TRANSFER` row whose `expires_at < now()`.
- **Writes** materialize it on demand: `create_manual_payment_order` step 2
  sweeps the caller's stale rows, and `cancel_manual_payment_order` step 5
  materializes an order being cancelled past its deadline.
- The raw `status` column may therefore be **stale** indefinitely if the user
  never acts again.

## Consequences

- Reads must **never** use raw `payment_orders.status` — always the view.
  Enforced by an ESLint rule.
- The cap is never stuck: create step 2 runs before the reuse/insert logic.
- Two correct spellings of "expired" exist (computed vs materialized). Docs and
  comments must be explicit about which is meant.
- `confirm_manual_payment_order` must **not** attempt to materialize: its 409 is
  an uncaught `RAISE`, which rolls back any preceding `UPDATE`.

## Alternatives considered

- **`pg_cron` / scheduled sweep.** Correct but adds infrastructure, a job to
  monitor, and cross-tenant writes with no user context. Rejected as overkill
  for a flow where expiry only matters when the user or cap is touched.
- **`expires_at`-based trigger.** Triggers fire on row changes, not on the
  passage of time. Cannot express this.
- **Eager `UPDATE` on every read.** Turns reads into writes, defeats the view,
  and races under concurrency.
