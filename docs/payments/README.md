# Payments — documentation map

Manual (bank-transfer / VietQR) payment orders. Start here.

## Reading order

1. [overview.md](./overview.md) — the two tables and the end-to-end flow
2. [state-machine.md](./state-machine.md) — states, transitions, guards
3. [rpc-reference.md](./rpc-reference.md) — every RPC, step by step
4. [reads-and-expiry.md](./reads-and-expiry.md) — lazy-expiry law, the view, lint guards
5. [security.md](./security.md) — DEFINER vs INVOKER, RLS posture, ownership scoping

Design rationale ("why") lives in [`docs/adr/`](../adr/). Runtime laws are
summarized in the repo-root `AGENTS.md`.

## Source of truth

Code wins over docs. Every page points at the migration that defines it — if
they disagree, read the SQL and fix the page.

| Doc | Source of truth |
|---|---|
| [overview.md](./overview.md) | `20260902000001_manual_payment_orders.sql` |
| [state-machine.md](./state-machine.md) | `20260903000001_create_manual_payment_order.sql`, `20260914000001_confirm_cancel_payment_order_rpc.sql` |
| [rpc-reference.md](./rpc-reference.md) | all four payment migrations |
| [reads-and-expiry.md](./reads-and-expiry.md) | `20260903000002_payment_orders_effective_view.sql` |
| [security.md](./security.md) | all four payment migrations + `backend/eslint.config.js` |

> Update rule: touch a payment migration → touch the matching page in the same PR.

## Migration index

| Migration | Adds |
|---|---|
| `20260902000001_manual_payment_orders.sql` | `order_status` enum, `payment_orders` table, indexes, `payments.payment_orders_id` FK |
| `20260903000001_create_manual_payment_order.sql` | `create_manual_payment_order` RPC |
| `20260903000002_payment_orders_effective_view.sql` | `payment_orders_effective` view |
| `20260914000001_confirm_cancel_payment_order_rpc.sql` | `confirm_manual_payment_order`, `cancel_manual_payment_order` RPCs |

## Known gaps (not shipped)

- **Admin review flow** — `AWAITING_REVIEW → SUCCESS` (approve + grant) and
  `AWAITING_REVIEW → CANCELLED` (reject) have no RPC yet. `AWAITING_REVIEW` is
  enter-only today. See [state-machine.md](./state-machine.md).
- **Telegram notification** — the `telegram_notification_status` columns exist;
  no code reads/writes them.
- **Frontend** — no payment UI yet.
- **Backend wiring** — `/v1/payments/:id/confirm` and `/cancel` still return 501.
