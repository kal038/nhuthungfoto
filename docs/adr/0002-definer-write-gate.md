# ADR-0002: RPCs are `SECURITY DEFINER`, the view is `SECURITY INVOKER`

- **Status:** accepted
- **Date:** 2026-09-16
- **Supersedes:** —

## Context

The backend is the only actor that talks to Postgres (as `service_role`). It
needs two things that pull in opposite directions:

- a **write gate** that behaves identically for any caller and can be tightened
  later (e.g. revoking direct table DML from `service_role`), and
- a **read surface** that never silently escalates to owner privileges.

## Decision

- **All RPCs are `SECURITY DEFINER`** — they run as their owner. The owner is
  `postgres` (Supabase CLI migrations run as `postgres`). Escalation is
  compensated with pinned `SET search_path = public, pg_temp`, `REVOKE EXECUTE`
  from `PUBLIC`/`anon`/`authenticated` (grant `service_role` only), and
  ownership + state guards inside the body.
- **`payment_orders_effective` is `security_invoker = true`** — it runs as the
  caller.

## Consequences

- Functions are caller-independent: same guard, same result, regardless of the
  caller's grants or RLS state.
- Because the owner is a superuser, the body must carry the guards above; a
  `DEFINER` function with a caller-controlled `search_path` or `PUBLIC EXECUTE`
  is a privilege-escalation bug.
- The view cannot escalate: a `DEFINER` view would bypass RLS and expose every
  user's rows to any grantee. `security_invoker` is the fix and must not be
  removed.
- Today both settings are **latent**: `service_role` already has `ALL` on the
  table and `BYPASSRLS`, so neither changes current behavior. They matter once
  `service_role` is trimmed or a weaker role is introduced.

## Alternatives considered

- **`SECURITY INVOKER` RPCs.** They would work today (the caller is powerful)
  but weld the gate to the caller's grants, blocking any future reduction of
  the caller's direct table access. Rejected.
- **`SECURITY DEFINER` view.** Rejected — no guards exist on a view, so it is
  naked owner-level read access (`"else we leak everything"`).
- **Narrow owner role** (e.g. `app_writer`) instead of `postgres`. Good future
  hardening; not done yet. Would shrink the blast radius of a compromised body.
