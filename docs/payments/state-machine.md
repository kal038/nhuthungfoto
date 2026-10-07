# Payments — state machine

> Source of truth: [`20260903000001_create_manual_payment_order.sql`](../../backend/supabase/migrations/20260903000001_create_manual_payment_order.sql),
> [`20260914000001_confirm_cancel_payment_order_rpc.sql`](../../backend/supabase/migrations/20260914000001_confirm_cancel_payment_order_rpc.sql),
> [`20261006000001_approve_reject_telegram_rpcs.sql`](../../backend/supabase/migrations/20261006000001_approve_reject_telegram_rpcs.sql)

## States

`order_status` enum:

| State | Kind | Meaning |
|---|---|---|
| `PENDING_TRANSFER` | active | created, waiting for the user to transfer (deadline: `expires_at`) |
| `AWAITING_REVIEW` | active | user claims the transfer was sent; admin must verify |
| `SUCCESS` | terminal | admin approved; credits granted exactly once |
| `CANCELLED` | terminal | user backed out, or admin rejected; no credits |
| `EXPIRED` | terminal | payment deadline passed; no credits |

**Invariants**

- At most **one active order per user** — enforced by the partial unique index
  `idx_payment_orders_active_user` (`UNIQUE (user_id) WHERE status IN ('PENDING_TRANSFER','AWAITING_REVIEW')`).
- `AWAITING_REVIEW` **never expires** — once the user has sent money, only an
  admin moves the order.
- Terminal states never re-enter the machine.

## Transitions (implemented)

Six RPCs write `payment_orders`. Both columns below are required to
read the diagram: what moves the state, and where in the RPC it happens.

| # | From | To | RPC (step) | Trigger |
|---|---|---|---|---|
| 1 | — (none) | `PENDING_TRANSFER` | `create_manual_payment_order` (5) | insert new order |
| 2 | `PENDING_TRANSFER` | `EXPIRED` | `create_manual_payment_order` (2) | stale order, swept on the user's next create |
| 3 | `PENDING_TRANSFER` | `EXPIRED` | `cancel_manual_payment_order` (5) | user cancels after the deadline |
| 4 | `PENDING_TRANSFER` | `AWAITING_REVIEW` | `confirm_manual_payment_order` (6) | user claims the transfer was sent |
| 5 | `PENDING_TRANSFER` | `CANCELLED` | `cancel_manual_payment_order` (6) | user backs out in time |
| 6 | `AWAITING_REVIEW` | `SUCCESS` | `approve_manual_payment_order` (7) | admin verifies the bank transfer, grants credits, writes the ledger row |
| 7 | `AWAITING_REVIEW` | `CANCELLED` | `reject_manual_payment_order` (5) | admin finds no matching transfer |

`update_telegram_notification_status` also writes `payment_orders`, but only the
notification bookkeeping columns — it never changes `status`.

## Non-transitions (no write, or 409)

| From | RPC (step) | Result |
|---|---|---|
| same `client_request_id`, any state | create (3) | return that row, no write |
| existing active order | create (4/6) | return it, no write |
| `AWAITING_REVIEW` | confirm (3) | idempotent no-op, return row |
| `SUCCESS` | approve (3) | idempotent no-op, return row (credits already granted) |
| `SUCCESS`/`CANCELLED`/`EXPIRED` | reject (3) | idempotent no-op, return row |
| `SUCCESS`/`CANCELLED`/`EXPIRED` | cancel (3) | idempotent no-op, return row |
| `SUCCESS`/`CANCELLED`/`EXPIRED` | confirm (4) | **409**, no write |
| `AWAITING_REVIEW` | cancel (4) | **409**, no write |
| non-`AWAITING_REVIEW` | approve (4) / reject (4) | **409**, no write |
| `PENDING_TRANSFER` past deadline | confirm (5) | **409**, no write (the raise aborts the txn) |

## Diagram

```mermaid
stateDiagram-v2
    [*] --> PENDING_TRANSFER: create (5) insert

    PENDING_TRANSFER --> EXPIRED: create (2) stale sweep
    PENDING_TRANSFER --> EXPIRED: cancel (5) deadline miss
    PENDING_TRANSFER --> AWAITING_REVIEW: confirm (6)
    PENDING_TRANSFER --> CANCELLED: cancel (6)

    AWAITING_REVIEW --> AWAITING_REVIEW: confirm (3) no-op
    AWAITING_REVIEW --> SUCCESS: approve (7) grant + ledger
    AWAITING_REVIEW --> CANCELLED: reject (5)
    SUCCESS --> SUCCESS: cancel (3) no-op
    CANCELLED --> CANCELLED: cancel (3) no-op
    EXPIRED --> EXPIRED: cancel (3) no-op

    SUCCESS --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

## Admin resolution

`AWAITING_REVIEW` is resolved by the admin through the Telegram review card:

- **approve** (`approve_manual_payment_order`) — grants credits exactly once
  (idempotency key `payment-order:<id>`), inserts the `payments` ledger row with
  `status='SUCCESS'`, then flips the order to `SUCCESS`. Already-`SUCCESS` calls
  return the row unchanged.
- **reject** (`reject_manual_payment_order`) — flips the order to `CANCELLED`
  with no credit grant. Terminal states return the row unchanged.

The card's delivery is tracked by `update_telegram_notification_status`
(`PENDING`/`SENT`/`FAILED`); a re-confirm retries delivery until it is `SENT`.

## Why the deadline branch differs between confirm and cancel

Both detect "past deadline", but:

- **confirm** raises **409** and does **not** persist a flip — an uncaught
  `RAISE` aborts the transaction, so any `UPDATE status = 'EXPIRED'` before it
  would roll back.
- **cancel** materializes `EXPIRED` and **returns** — no `RAISE` follows, so the
  write commits.

Details: [rpc-reference.md](./rpc-reference.md). Rationale: [ADR-0001](../adr/0001-lazy-expiry.md).
