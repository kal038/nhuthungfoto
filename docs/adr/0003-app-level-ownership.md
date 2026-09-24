# ADR-0003: Ownership is enforced in the application, not by RLS

- **Status:** accepted
- **Date:** 2026-09-16
- **Supersedes:** —

## Context

`payment_orders` holds per-user data. The usual Postgres answer is RLS policies
keyed on `auth.uid()`. But the backend connects as **`service_role`**, which has
`BYPASSRLS`, and `auth.uid()` is not meaningful on a service connection — the
user id is known to the application (from the verified JWT), not to Postgres.

## Decision

- RLS on `payment_orders` is **enabled with no policies** — a deny-all backstop,
  not the access-control mechanism.
- Ownership is enforced by the application:
  - the auth middleware verifies the JWT against Supabase JWKS and exposes
    `user.id = payload.sub`;
  - every read chains `.eq('user_id', userId)`; every RPC takes `p_user_id` and
    matches `WHERE user_id = p_user_id`.
- Lint rules guard the pattern: raw-table reads are banned, and effective-view
  reads must chain a `user_id` filter.

## Consequences

- **The database is not a backstop.** A forgotten filter leaks another user's
  row; RLS will not stop it. This is the central risk of the design.
- Mitigations: a single read helper (`getOrderByUser`), the lint tripwires, and
  the keep-it-in-one-place rule for order queries.
- The lint rules are syntactic — dynamic view names or queries built across
  statements evade them.
- If the backend ever talks to Postgres with the user's JWT instead of the
  service key, this decision should be revisited (RLS becomes viable).

## Alternatives considered

- **RLS policies + user-scoped connections.** Stronger (DB-enforced) but
  requires the backend to use per-request user JWTs and keeps `auth.uid()` in
  the loop. Deferred: the current backend architecture is service-key based.
- **`FORCE ROW LEVEL SECURITY` on the table.** Does not bind superusers /
  `BYPASSRLS` roles, so it would not change behavior for `service_role`.
