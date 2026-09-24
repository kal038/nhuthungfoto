# ADRs — payments

Architecture Decision Records. Short, dated, immutable-in-spirit: they capture
**why**, not current behavior (that lives in [`docs/payments/`](../payments/)).

If a decision is reversed, add a new ADR that supersedes it — don't rewrite the
old one.

| ADR | Decision | Status |
|---|---|---|
| [0001](./0001-lazy-expiry.md) | Expire orders lazily; reads use the effective view | accepted |
| [0002](./0002-definer-write-gate.md) | RPCs are `SECURITY DEFINER`; the view is `SECURITY INVOKER` | accepted |
| [0003](./0003-app-level-ownership.md) | Ownership is enforced in the application, not by RLS | accepted |

Format: Context → Decision → Consequences → Alternatives.
