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
| [state-machine.md](./state-machine.md) | `20260903000001_create_manual_payment_order.sql`, `20260914000001_confirm_cancel_payment_order_rpc.sql`, `20261006000001_approve_reject_telegram_rpcs.sql` |
| [rpc-reference.md](./rpc-reference.md) | all seven payment migrations |
| [reads-and-expiry.md](./reads-and-expiry.md) | `20260903000002_payment_orders_effective_view.sql` |
| [security.md](./security.md) | all seven payment migrations + `backend/eslint.config.js` |

> Update rule: touch a payment migration → touch the matching page in the same PR.

## Migration index

| Migration | Adds |
|---|---|
| `20260902000001_manual_payment_orders.sql` | `order_status` enum, `payment_orders` table, indexes, `payments.payment_orders_id` FK |
| `20260903000001_create_manual_payment_order.sql` | `create_manual_payment_order` RPC |
| `20260903000002_payment_orders_effective_view.sql` | `payment_orders_effective` view |
| `20260914000001_confirm_cancel_payment_order_rpc.sql` | `confirm_manual_payment_order`, `cancel_manual_payment_order` RPCs |
| `20261006000001_approve_reject_telegram_rpcs.sql` | `approve_manual_payment_order`, `reject_manual_payment_order`, `update_telegram_notification_status` RPCs |
| `20261007000001_fix_approve_payment_ledger_status.sql` | approved manual `payments` rows recorded as `SUCCESS` (+ backfill of prior rows) |
| `20261007000002_claim_telegram_notification.sql` | `claim_telegram_notification` RPC + `telegram_send_claimed_at` lease column |

## Known gaps

- **Admin surface** — approve/reject only run from the Telegram webhook; there is no admin web UI.
- **Providers** — the `payments` ledger is manual-only; Stripe (or any other provider) is not wired yet.

The customer UI lives on `/credits` (`frontend/src/components/features/payments/`):
package picker → VietQR transfer card → awaiting-review card (polls every 15s) →
result card. A confirm that records the transfer but fails the Telegram
notification returns `502`; the review card offers a "Gửi lại thông báo" resend.

## Telegram webhook registration (ops)

Telegram does **not** discover the route by convention. It delivers callback
updates only to the URL set through the Bot API `setWebhook` method, once per
environment (dev and prod bots each need their own call).

```sh
# reads TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET from the env or backend/.dev.vars
npm run telegram:webhook -- set --url=https://<worker-domain>/v1/telegram/webhook
npm run telegram:webhook -- info     # verify the active url / last_error_message
npm run telegram:webhook -- delete   # clear (Telegram stops delivering)
```

- The URL must be public HTTPS and end in `/v1/telegram/webhook`.
- `TELEGRAM_WEBHOOK_SECRET` is sent as `secret_token`; Telegram echoes it back
  as `X-Telegram-Bot-Api-Secret-Token`, which the route verifies.
- Change the route path or rotate the secret → re-run `set`.
- Bruno equivalents live in `bruno/nhuthungfoto-api/Telegram/`
  (`GET WEBHOOK INFO`, `POST SET WEBHOOK`, `POST DELETE WEBHOOK`).

Reference: [setWebhook](https://core.telegram.org/bots/api#setwebhook),
[getWebhookInfo](https://core.telegram.org/bots/api#getwebhookinfo).
