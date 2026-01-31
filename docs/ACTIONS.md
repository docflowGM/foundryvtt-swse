# Actions

Authoritative guide for adding or extending Actions in SWSE v2.

> Legacy v1 actor sheets were permanently removed in Phase 3.3 and must not be reintroduced.

## What an Action is

An Action is a **derived** entry used for discoverability and controlled execution.

- Sources: universal action definitions, feats, talents, items
- Output: `actor.system.derived.actions.list` and `actor.system.derived.actions.map`

## Required derived shape

Minimum fields:

- `id` (stable)
- `name`
- `actionType` (Standard/Move/Swift/Reaction/etc.)
- `sourceType` (`universal` | `feat` | `talent` | `item`)
- `executable` (boolean)
- `execute` (metadata only)

Example `execute` shapes:

- `{ "kind": "item", "itemId": "..." }`
- `{ "kind": "weapon", "itemId": "..." }`
- `{ "kind": "feat", "featId": "..." }`
- `{ "kind": "universal", "key": "totalDefense" }`

## Where actions are built

- Universal definitions: `data/combat-actions.json`
- Derived assembly: v2 actor derived pipeline (`scripts/actors/v2/*`)

Sheets never build actions. They only render derived entries.

## How execution works

1) Sheet emits intent: `actor.useAction(actionId)`
2) Actor resolves action metadata from `derived.actions.map`
3) Actor routes by `execute.kind`
4) Existing mechanic/engine performs roll/effects
5) Output via `scripts/chat/swse-chat.js`

Execution must be implemented in actors/engines, never in sheets.

## Adding a new Action

1) Choose a stable `id`.
2) Provide data source (universal JSON, feat/talent mapping, or item linkage).
3) Ensure the derived builder surfaces it into `derived.actions.list` and `map`.
4) Add a handler for its `execute.kind` in the relevant v2 actor.
5) Add a quick manual test: open v2 sheet -> Actions -> Use -> chat output.
