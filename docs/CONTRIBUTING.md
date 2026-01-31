# Contributing

> Legacy v1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

## Start here

- `docs/ARCHITECTURE.md`
- `docs/EXECUTION_PIPELINE.md`
- `docs/ACTIONS.md`
- `docs/ARCHITECTURE_MUTATION_RULES.md`

## Non-negotiable rules

- Sheets/templates are **views only**. No rules math. No roll building.
- Actor classes (`scripts/actors/v2/*`) are the **rules authority**.
- All actor-affecting updates go through **ActorEngine**.
- Owned items are passive data; never call `item.update(...)` on owned items.
- Chat output goes through `scripts/chat/swse-chat.js`.

## Required local checks

Run before pushing:

- `npm test` (if present)
- `npm run check:mutations`

CI will fail PRs that violate mutation rules.

## Where to make changes

- Rules/derived: `scripts/actors/v2/*`
- Atomic updates: `scripts/actors/engine/actor-engine.js`
- UI: `scripts/sheets/v2/*` + `templates/actors/*/v2/*`
- Item editors: `scripts/items/*` + `templates/items/*/v2/*`

