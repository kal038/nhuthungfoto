# Payments — overview

> Source of truth: [`20260902000001_manual_payment_orders.sql`](../../backend/supabase/migrations/20260902000001_manual_payment_orders.sql)

The manual payment flow lets a signed-in user buy credits by bank transfer using
a VietQR code. There is **no payment gateway** — the user transfers money, claims
they sent it, and an admin verifies the bank statement.

## Two tables — do not conflate

| | `payment_orders` | `payments` |
|---|---|---|
| Role | the **workflow** for the manual flow | the **unified money ledger** across providers |
| Cardinality | one row per purchase intent | one row per confirmed money-in |
| Key field | `status` (`order_status`) | `provider` + unique `external_ref` |
| Link | — | nullable `payments.payment_orders_id` FK to the order (null for non-manual providers) |

`payment_orders` tracks the order lifecycle (status, expiry, confirmation,
Telegram, approval, resolution). `payments` is the accounting record of money
that actually arrived — manual today, Stripe later.

## End-to-end flow

1. User picks a package (`GET /v1/payments/packages`).
2. Backend creates/reuses an order via `create_manual_payment_order`
   (`POST /v1/payments`) → status `PENDING_TRANSFER`, server-computed
   `expires_at`, an `order_code`, and a VietQR URL.
3. User transfers the money, then either:
   - **confirms** → `confirm_manual_payment_order` → `AWAITING_REVIEW`, or
   - **cancels** → `cancel_manual_payment_order` → `CANCELLED`.
4. If the deadline passes first, the order is `EXPIRED` (see
   [reads-and-expiry.md](./reads-and-expiry.md)).
5. Admin verifies the bank statement and either approves (→ `SUCCESS`, credits
   granted) or rejects (→ `CANCELLED`). **Not shipped yet.**

## Glossary

| Term | Meaning |
|---|---|
| **active order** | `PENDING_TRANSFER` or `AWAITING_REVIEW` — counts against the one-active-order-per-user cap |
| **terminal** | `SUCCESS`, `CANCELLED`, or `EXPIRED` — frees the cap |
| **effective status** | `status` with lazy expiry applied (`payment_orders_effective.effective_status`) |
| **materialize** | physically flip a stale row `PENDING_TRANSFER → EXPIRED` (vs computing it on read) |
| **order code** | 7-char `[A-Z0-9]` transfer reference, also the QR message |
| **one-active-order cap** | DB partial unique index `idx_payment_orders_active_user` |

## Where to go next

- States and transitions → [state-machine.md](./state-machine.md)
- RPC internals → [rpc-reference.md](./rpc-reference.md)
- Expiry and reads → [reads-and-expiry.md](./reads-and-expiry.md)
- DB security posture → [security.md](./security.md)
