# Payments — reads and expiry

> Source of truth: [`20260903000002_payment_orders_effective_view.sql`](../../backend/supabase/migrations/20260903000002_payment_orders_effective_view.sql)

## The lazy-expiry law

`payment_orders.status` is **physical**. When a payment deadline passes, the raw
row is **not** updated eagerly — it stays `PENDING_TRANSFER` until something
touches it. So raw `status` can be stale.

Reads must therefore use `effective_status` from the `payment_orders_effective`
view:

```
effective_status = CASE
  WHEN status = 'PENDING_TRANSFER' AND expires_at < now() THEN 'EXPIRED'
  ELSE status
END
```

`AWAITING_REVIEW` never expires, so it passes through unchanged.

## The view

```sql
CREATE VIEW public.payment_orders_effective
WITH (security_invoker = true)
AS
SELECT *, CASE ... END AS effective_status
  FROM public.payment_orders;
```

`security_invoker = true` means the view runs as the **caller**, not its owner.
Never remove it — see [security.md](./security.md). Grants mirror the table:
`service_role` only.

## Who materializes the flip

Nothing materializes expiry on a schedule. Raw rows are flipped to `EXPIRED` by
exactly two RPCs, lazily:

| RPC | When |
|---|---|
| `create_manual_payment_order` (step 2) | the user's next create sweeps **all** their stale `PENDING_TRANSFER` rows |
| `cancel_manual_payment_order` (step 5) | the user cancels an order that is already past its deadline |

`confirm_manual_payment_order` deliberately does **not** materialize (its 409
would roll the write back).

Consequence: a user who never creates again leaves a stale raw row forever.
That is fine — reads compute `EXPIRED` on the fly, and the one-active-order cap
is freed because create step 2 runs before the reuse/insert logic.

## Read path today

`backend/src/services/payments.ts` → `getOrderByUser`:

```ts
supabase.from('payment_orders_effective').select('*').eq('id', orderId).eq('user_id', userId)
```

`GET /v1/payments/:orderId/status` derives the response status as
`effective_status ?? order.status` (the view Row type over-nullifies columns).

## Enforcement (lint)

`backend/eslint.config.js`:

| Rule | Enforces |
|---|---|
| `no-restricted-syntax` | raw `.from('payment_orders')` reads are banned — go through the view |
| `local/scope-order-read-by-user` | `.from('payment_orders_effective')` must chain `.eq('user_id', …)` / `.in('user_id', …)` |

`service_role` bypasses RLS, so the database does **not** enforce ownership —
these rules plus the single read helper are the guard. See
[security.md](./security.md).

## Related

- Why no cron/trigger → [ADR-0001](../adr/0001-lazy-expiry.md)
- Why `security_invoker` → [security.md](./security.md), [ADR-0002](../adr/0002-definer-write-gate.md)
