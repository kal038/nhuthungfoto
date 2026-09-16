# nhuthungfoto — documentation map

Entry point for everything under `docs/`. Pick the section by what you need.

| I need… | Go to |
|---|---|
| What the product is meant to do | [`prd-nhuthungfoto-final.md`](./prd-nhuthungfoto-final.md) |
| How the system is built | [`tdd-nhuthungfoto.md`](./tdd-nhuthungfoto.md) |
| The manual payment system | [`payments/`](./payments/README.md) |
| Why a payment decision was made | [`adr/`](./adr/README.md) |
| UI/UX design system | [`design/design-system.md`](./design/design-system.md) |
| Past implementation tasks | [`impl/`](./impl/) |

## Sections

### Product & architecture

- [`prd-nhuthungfoto-final.md`](./prd-nhuthungfoto-final.md) — product requirements (draft v1).
- [`tdd-nhuthungfoto.md`](./tdd-nhuthungfoto.md) — technical design: architecture, data, APIs.
- [`Diagrams/`](./Diagrams/) — high-level architecture (`nhuthungfoto-hld.svg`) and sequence diagrams (`sequence.svg`).

### Payments

Manual bank-transfer / VietQR order flow. Start at [`payments/README.md`](./payments/README.md):

- [`payments/state-machine.md`](./payments/state-machine.md) — states, transitions, guards.
- [`payments/rpc-reference.md`](./payments/rpc-reference.md) — every RPC, step by step.
- [`payments/reads-and-expiry.md`](./payments/reads-and-expiry.md) — lazy-expiry law, the effective view, lint guards.
- [`payments/security.md`](./payments/security.md) — DEFINER vs INVOKER, RLS posture, ownership scoping.

Rationale ("why") lives in [`adr/`](./adr/README.md) — one short, dated page per decision.

### Design

- [`design/design-system.md`](./design/design-system.md) — the **canonical design system** (colour, type, spacing, page layouts, motion, a11y). Verbatim copy of `.agent/design-system/nhuthungfoto/MASTER.md`; that original stays the editable source.
- [`DESIGN.md`](./DESIGN.md) — earlier generated UI/UX specification (Mar 2026). Overlaps the design system; check before trusting stale details.
- [`admin-grading-walkthrough.md`](./admin-grading-walkthrough.md) — how Hùng grades submissions through the admin-lite UI.

### Implementation history

- [`impl/US-001.txt`](./impl/) … `US-006.txt` — task briefs (constraints + expected outcome) from past builds.

### Meta

- [`game-plan.md`](./game-plan.md) — career/planning notes, not product docs.

## Conventions

- **Code wins over docs.** Reference pages point at the migration/source they describe; if they disagree, read the code and fix the page.
- **Reference = what; ADR = why.** Don't mix them.
- **Original sources are not copied-and-edited in place:** design system master lives in `.agent/design-system/`, migrations in `backend/supabase/migrations/`.
- **Update rule:** change a source → update the matching page in the same PR.
- Runtime laws for agents are summarized in the repo-root `AGENTS.md`.
