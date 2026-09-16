# Payments — RPC reference

> Source of truth: [`20260903000001_create_manual_payment_order.sql`](../../backend/supabase/migrations/20260903000001_create_manual_payment_order.sql),
> [`20260914000001_confirm_cancel_payment_order_rpc.sql`](../../backend/supabase/migrations/20260914000001_confirm_cancel_payment_order_rpc.sql)

Three RPCs write `payment_orders`. All are `SECURITY DEFINER`,
`SET search_path = public, pg_temp`, and callable only by `service_role`
(see [security.md](./security.md)). Step numbers below match the SQL comments.

## Common guards and error mapping

| SQLSTATE | Symbol | HTTP | Raised when |
|---|---|---|---|
| `22023` | `invalid_parameter_value` | 400 | null/invalid parameter |
| `P0002` | `no_data_found` | 404 | no order with that `id` for that `user_id` |
| `55000` | `object_not_in_prerequisite_state` | 409 | wrong state for the action |

Mapping lives in `backend/src/lib/pg-errors.ts` (`mapPgError`) with per-call
tables in `backend/src/services/payments.ts`. A guard raise that is not caught
aborts the RPC's transaction — every write before it rolls back.

---

## `create_manual_payment_order`

```
create_manual_payment_order(
  p_user_id           uuid,
  p_client_request_id text,
  p_package_snapshot  jsonb,     -- { id, label, credits, amountVnd }
  p_order_code        text,      -- ^[A-Z0-9]{7}$
  p_expires_at        timestamptz
) RETURNS public.payment_orders
```

Atomically create **or reuse** an order. One call = one transaction.

| Step | Does |
|---|---|
| 1 | validate inputs (400); `p_expires_at` must be in the future |
| 2 | **expire stale orders**: flip this user's `PENDING_TRANSFER` rows past `expires_at` (`resolved_at IS NULL`) → `EXPIRED` |
| 3 | idempotency: same `(user_id, client_request_id)` exists → return it **in any state** |
| 4 | active order exists (`PENDING_TRANSFER`/`AWAITING_REVIEW`) → return it |
| 5 | `INSERT` with `ON CONFLICT (user_id) WHERE status IN ('PENDING_TRANSFER','AWAITING_REVIEW') DO NOTHING` |
| 6 | lost the race → return the winning active order |

Notes

- Step 2 uses the **same predicate** as the effective view at the same
  transaction `now()`, so the returned row's raw status equals its
  `effective_status`. See [reads-and-expiry.md](./reads-and-expiry.md).
- `ON CONFLICT` matches `idx_payment_orders_active_user` byte-for-byte. Dropping
  that index breaks this RPC. Never remove it.
- Returns the raw `payment_orders` row.

---

## `confirm_manual_payment_order`

```
confirm_manual_payment_order(p_user_id uuid, p_order_id uuid)
  RETURNS public.payment_orders
```

Customer claims the bank transfer was sent. `PENDING_TRANSFER → AWAITING_REVIEW`.

| Step | Does |
|---|---|
| 1 | validate inputs (400) |
| 2 | `SELECT ... WHERE id = p_order_id AND user_id = p_user_id FOR UPDATE` → 404 if none |
| 3 | already `AWAITING_REVIEW` → return row (idempotent) |
| 4 | any other non-pending (terminal) → **409** |
| 5 | past `expires_at` → **409**, no write |
| 6 | set `status='AWAITING_REVIEW'`, `confirmed_at=now()`, return row |

Notes

- No `EXPIRED` write at step 5: the `RAISE` would abort the transaction and roll
  it back. Materialization belongs to the create/cancel RPCs. See
  [reads-and-expiry.md](./reads-and-expiry.md).
- Money is considered spent at `AWAITING_REVIEW` — the customer can no longer
  cancel; only an admin can move it.

---

## `cancel_manual_payment_order`

```
cancel_manual_payment_order(p_user_id uuid, p_order_id uuid)
  RETURNS public.payment_orders
```

Customer backs out before sending money.

| Step | Does |
|---|---|
| 1 | validate inputs (400) |
| 2 | `SELECT ... FOR UPDATE` → 404 if none |
| 3 | terminal (`SUCCESS`/`CANCELLED`/`EXPIRED`) → return row (idempotent no-op) |
| 4 | `AWAITING_REVIEW` → **409** (only an admin can resolve it) |
| 5 | past `expires_at` → **materialize** `status='EXPIRED'`, `resolved_at=now()`, return row |
| 6 | set `status='CANCELLED'`, `resolved_at=now()`, return row |

Notes

- Step 5 is reached only for raw `PENDING_TRANSFER` (steps 3 and 4 handled the
  others; `AWAITING_REVIEW` never expires). Because no `RAISE` follows, this
  write **persists** — cancel is a real materializer alongside create.
- Returns the raw `payment_orders` row.

---

## Callers (backend)

| RPC | Service | Route | Status |
|---|---|---|---|
| `create_manual_payment_order` | `createOrder` | `POST /v1/payments` | live |
| `confirm_manual_payment_order` | `confirmOrder` (commented out) | `POST /v1/payments/:id/confirm` | **501** |
| `cancel_manual_payment_order` | `cancelOrder` (commented out) | `POST /v1/payments/:id/cancel` | **501** |
