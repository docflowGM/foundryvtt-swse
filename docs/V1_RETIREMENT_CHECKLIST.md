# Phase 3 — v1 Retirement Checklist

This project is now **v2-first**.

Use this checklist to retire legacy v1 sheets safely without reintroducing UI-driven rules or mutation.

## Phase 3.0 — v2 as Default (Soft Switch)

- [x] v2 sheets registered with `makeDefault: true` per actor type.
- [x] v1 sheets remain available via sheet configuration.

## Phase 3.1 — Legacy Sheet Freeze

- [x] Add the header below to all v1 sheet entrypoints:

```js
/**
 * LEGACY SHEET (FROZEN)
 * Bugfixes only.
 * No new logic may be added here.
 */
```

Files to keep frozen:

- `scripts/sheets/base-sheet.js`
- `scripts/actors/character/swse-character-sheet.js`
- `scripts/actors/npc/swse-npc.js`
- `scripts/actors/droid/swse-droid.js`
- `scripts/actors/vehicle/swse-vehicle.js`

## Phase 3.2 — Remove Legacy Execution Paths

**Goal:** all gameplay flows through:

`v2 sheet → actor API → engine → SWSEChat`

Checklist:

- [ ] Remove/disable v1 sheet roll buttons.
- [ ] Remove v1-only item execution helpers.
- [ ] Remove any sheet-driven roll logic.

## Phase 3.3 — Delete Legacy Base Sheet & Glue

Candidates:

- [ ] `scripts/sheets/base-sheet.js`
- [ ] v1-only sheet utilities
- [ ] deprecated compatibility shims

## Phase 3.4 — Documentation Reset

- [ ] Update `CONTRIBUTING.md` with mutation rules.
- [ ] Add/refresh an execution overview:
  - where rules live
  - how to add a new action
  - how to post chat output
