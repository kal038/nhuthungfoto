# Payments — security posture

> Source of truth: the payment migrations + [`backend/eslint.config.js`](../../backend/eslint.config.js)

Two facts drive everything here:

1. The backend talks to Postgres as **`service_role`** (the secret key), which
   has `BYPASSRLS`.
2. The only actor allowed to read/write `payment_orders` is that backend.

So Row Level Security does **not** scope rows in practice — ownership is
enforced in the application. This page explains how that stays safe.

## Functions = `SECURITY DEFINER` (write gate)

All RPCs run as their **owner**, not the caller.

- Owner is `postgres` because Supabase CLI migrations run as `postgres`. The
  migration does not `ALTER ... OWNER`, so it stays `postgres` (a superuser).
- `SECURITY DEFINER` makes each RPC a **caller-independent** gate: any caller
  holding `EXECUTE` gets the same guarded behavior, regardless of its own grants
  or RLS.
- Escalation is paid for with: pinned `SET search_path = public, pg_temp`
  (blocks shadow hijacks), `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`
  then `GRANT ... TO service_role`, and ownership + state guards in the body.

Why not `INVOKER`: the RPC's ability to act would depend on the caller's grants.
That welds the gate to the caller and blocks ever trimming `service_role`'s
direct table access. See [ADR-0002](../adr/0002-definer-write-gate.md).

## View = `SECURITY INVOKER` (read surface)

`payment_orders_effective` runs as the **caller** (`security_invoker = true`).

- A view is not a gate — no params, no guards. If it ran as its owner, it would
  bypass RLS and hand every user's rows to any role granted `SELECT`.
- For the current caller (`service_role`, `BYPASSRLS`) this changes nothing —
  RLS is bypassed either way. Its value is **future-proofing**: if the view is
  ever granted to `authenticated`/`anon`, those roles get their own (denied)
  rights instead of owner-level reads.

Never remove `security_invoker`.

## Grants and RLS

| Object | Grant | RLS |
|---|---|---|
| `payment_orders` (table) | revoked from `PUBLIC`/`anon`/`authenticated`; `service_role` only | enabled, **no policies** (deny-all backstop) |
| `payment_orders_effective` (view) | `service_role` only | `security_invoker = true` |
| the three RPCs | `EXECUTE` to `service_role` only | run as owner |

## Where ownership is actually enforced

1. **Auth** — `backend/src/middleware/auth.ts` verifies the bearer token against
   Supabase JWKS (`ES256`, `allow_anon: false`); `user.id = payload.sub`.
2. **App scoping** — reads chain `.eq('user_id', userId)`; RPCs take `p_user_id`
   and match `WHERE user_id = p_user_id`.
3. **Lint tripwires** — see [reads-and-expiry.md](./reads-and-expiry.md).

The DB is **not** a backstop: a forgotten filter returns another user's row.
Hence one read helper (`getOrderByUser`) and the lint rules. See
[ADR-0003](../adr/0003-app-level-ownership.md).

## Current limits (honest)

- `DEFINER` escalation is "to superuser `postgres`". Hardening option:
  `ALTER FUNCTION ... OWNER TO <narrow role>` so escalation is just enough.
- `security_invoker` and `DEFINER` both only *matter* once `service_role`'s
  omnipotence is trimmed (e.g. `REVOKE` direct table DML) or a weaker role is
  introduced. Today they are latent, cheap correctness.
- The lint rules are syntactic tripwires, not proofs — dynamic view names or
  queries built across statements evade them.
