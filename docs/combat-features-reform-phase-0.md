# Combat Features Reform — Phase 0 Boundary

## Purpose

The current combat action surface has grown from several overlapping sources: static combat action references, feat/talent active actions, attack options, triggered reactions, passive math riders, and transitional runtime hotfixes. Phase 0 freezes that expansion path and establishes the boundary for the permanent Combat Features surface.

The target model is the Combat Features panel design handoff: a display-adapter-driven panel with separate buckets for active states, available actions, triggered or conditional features, passive riders, and summary badges.

## Phase 0 rules

1. Do not add new feat, talent, species, equipment, or action definitions to `scripts/patches/combat-ui-behavior-hotfix.js` unless the goal is to prevent an immediate runtime regression.
2. Treat `combat-ui-behavior-hotfix.js` as a compatibility bridge only. It may keep existing Double Attack, Triple Attack, attack-option, dedupe, and visibility fixes alive while the canonical pipeline is built.
3. New combat feature work belongs under `scripts/engine/combat/features/` and sheet rendering work should consume a future `CombatFeatureSheetAdapter` model.
4. Templates must not compute combat math. They should render display data and route button events through mapped actions.
5. Unmapped or manual features must fail closed: show source/detail or a manual/GM note, not fake automation.
6. Canonical math remains in the existing combat engines: `combat-roll-math.js`, `CombatOptionResolver`, `rollAttack`, and damage roll helpers.

## Transitional compatibility layer

`combat-ui-behavior-hotfix.js` currently keeps the live sheet usable by:

- correcting attack chat natural 1 / natural 20 outcome display;
- hiding target defenses from non-GM / non-owner users in roll dialogs;
- deduping combat action rows;
- gating several droid-only or unlock-only actions;
- routing Double Attack and Triple Attack into repeated normal attack prompts;
- routing selected combat-option actions into the normal attack dialog.

Those behaviors should be migrated out of the hotfix layer during later phases. The hotfix should shrink as permanent modules take over.

## Permanent modules started in Phase 0

- `scripts/engine/combat/features/combat-feature-contract.js`
  - shared constants and shape helpers for the future adapter/router;
  - no actor mutation;
  - no roll math;
  - safe to import from sheets and tests.

## Next phase handoff

Phase 1 should create `CombatFeatureSheetAdapter` and return the handoff shape:

```js
combatFeatures = {
  activeStates: [],
  availableActions: [],
  triggeredFeatures: [],
  passiveRiders: [],
  badges: {}
};
```

That adapter should initially mirror existing behavior without changing any action execution.
