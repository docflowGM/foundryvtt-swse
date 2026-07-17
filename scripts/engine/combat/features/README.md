# Combat Features Module Boundary

This directory is the permanent home for the Combat Features reform.

The current `scripts/patches/combat-ui-behavior-hotfix.js` file remains a temporary compatibility bridge for live v2 migration issues. New feature classification, display adapter work, and action routing should be implemented here instead of expanding that hotfix.

## Rules for this module

- Adapters build display data only.
- Classifiers decide section/bucket placement.
- Routers dispatch mapped actions and fail closed when no handler exists.
- Templates render data and emit `data-action` events.
- Combat math stays in the existing canonical combat engines.
- Actor mutation must go through the existing shell/governance mutation helpers.

## Initial contract

See `combat-feature-contract.js` for shared bucket names, automation status values, readiness values, router action names, and the empty model helper.

## Phase 1 adapter

The first adapter lives at:

```text
scripts/sheets/v2/character-sheet/combat-feature-sheet-adapter.js
```

It currently builds the future `combatFeatures` model from actor items and active effects without changing the live UI. This is intentional: Phase 1 creates the data source first, while the old combat action panel and compatibility hotfix continue to keep the migration usable.

The adapter is allowed to inspect actor items, actor flags, actor system state, and active effects. It is not allowed to roll, spend actions, create effects, or update actors.

Future files should follow this split:

```text
combat-feature-classifier.js      // source item/effect -> feature bucket
combat-feature-sheet-adapter.js   // actor -> combatFeatures display model
combat-feature-action-router.js   // data-action -> mapped runtime behavior
combat-feature-handlers.js        // Power Attack, Rage, Second Wind, etc.
```
