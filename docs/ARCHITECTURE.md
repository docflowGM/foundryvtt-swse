# SWSE v2 Architecture

Authoritative reference for where rules live, how execution works, and what is forbidden.

> Legacy v1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

## Authority model

- Rules live in v2 Actor classes: `scripts/actors/v2/*`
- Derived state is written to: `actor.system.derived`
- Sheets are views only: `scripts/sheets/v2/*` (ApplicationV2)
- Items are passive data: `scripts/items/*`
- Mutation gatekeeper: `scripts/actors/engine/actor-engine.js`

## Core invariants

- No rules math in sheets or templates.
- No direct `actor.update(...)`, `item.update(...)` for owned items.
- No `ChatMessage.create(...)` from sheets.
- All gameplay output goes through `scripts/chat/swse-chat.js`.

## References

- Execution pipeline: `docs/EXECUTION_PIPELINE.md`
- Mutation rules: `docs/ARCHITECTURE_MUTATION_RULES.md`
- Adding actions: `docs/ACTIONS.md`
- Foundry compatibility: `docs/FOUNDRY_COMPAT.md`
