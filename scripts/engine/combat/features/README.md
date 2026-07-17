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

See `combat-feature-contract.js` for shared bucket names, automation status values, readiness values, router action names, action-economy groups, triggered-feature groups, passive-rider groups, and the empty model helper.

## Phase 1 adapter

The first adapter lives at:

```text
scripts/sheets/v2/character-sheet/combat-feature-sheet-adapter.js
```

It builds the future `combatFeatures` model from actor items and active effects. The old combat action panel and compatibility hotfix continue to keep the migration usable until the new router fully replaces them.

The adapter is allowed to inspect actor items, actor flags, actor system state, and active effects. It is not allowed to roll, spend actions, create effects, or update actors.

## Phase 2 classifier

The source-item/effect classification layer now lives at:

```text
scripts/engine/combat/features/combat-feature-classifier.js
```

The classifier owns feature profiles, aliases, item/effect identity, bucket inference, readiness inference, triggered-feature shaping, passive-rider shaping, and active-state shaping. The sheet adapter delegates classification to that module and only assembles/sorts the final display model.

## Phase 3 panel and action-economy grouping

The preview panel template lives at:

```text
templates/actors/character/v2-concept/partials/panels/combat-features-panel.hbs
```

The renderer lives at:

```text
scripts/engine/combat/features/combat-feature-panel-renderer.js
```

The adapter keeps `availableActions` as a flat list for routers and also exposes `availableActionGroups` for the UI. Action groups are currently Swift, Move, Standard, Full-Round, Reaction, Free, Attack Options, and Other. Phase 3 renders this panel above the legacy combat actions panel for verification rather than deleting the legacy panel immediately.

## Phase 4 action router

The permanent action router lives at:

```text
scripts/engine/combat/features/combat-feature-action-router.js
```

It handles panel click capture, actor resolution, and fail-closed dispatch. It should stay thin.

## Phase 5 handlers

Named behavior handlers now live at:

```text
scripts/engine/combat/features/combat-feature-handlers.js
```

The handlers own the permanent Power Attack / Flurry / Rapid Strike / Power Blast / Burst Fire / Rapid Shot / Autofire / Charging Fire / Powerful Charge / Mighty Swing attack-option path, plus Double Attack / Triple Attack multiattack execution, Second Wind resource execution, source-item view fallback, and active-effect deactivation. Attack-option and multiattack handlers open the normal attack dialog and then call canonical combat roll helpers.

## Phase 6 multiattack reform

Double Attack and Triple Attack now have first-class handler specs in `combat-feature-handlers.js`. The handler owns attack count, fallback penalty, package type, action id, full-round action spending, and per-attack dialog sequencing.

Legacy combat action rows are bridged by:

```text
scripts/engine/combat/features/combat-feature-legacy-action-bridge.js
```

That bridge is registered before the transitional combat UI hotfix. It intercepts legacy Double Attack / Triple Attack rows and sends them to the permanent handler, preventing the older hotfix implementation from running for those rows while the legacy panel still exists.

## Phase 7 active combat states

Tracked active combat states now live under the system flag namespace through:

```text
scripts/engine/combat/features/combat-feature-active-state-service.js
```

The service currently tracks Rage, Braced, Fight Defensively, Total Defense, Melee Defense, and Shield Surge. It uses `ActorEngine.updateActor(...)` to set or clear `flags.foundryvtt-swse.combatFeatures.activeStates.*`, so the panel can move an activated feature from Available Actions to Active Combat States without the template doing state work. These flags are display/state tracking only; combat math consumption is intentionally left to later canonical math phases.

## Phase 8 triggered feature pipeline

Triggered feature descriptors now live at:

```text
scripts/engine/combat/features/combat-feature-trigger-service.js
```

The trigger service maps features such as Block, Deflect, Trip, Throw, Pin, Crush, Crush Pinned Opponent, Combat Reflexes, Erratic Target, and Droid Shield Mastery to trigger windows and groups. The adapter uses this registry to move trigger-window features into `triggeredFeatures` and to build `triggeredFeatureGroups` for Defensive Reactions, On-Hit Riders, Grapple / Control, Opportunity Windows, and Other Triggers. This phase is still display/registry only; future chat-card prompting can write pending trigger context under `flags.foundryvtt-swse.combatFeatures.pendingTriggers.*`.

## Phase 9 passive rider audit surface

Passive rider grouping and automation-status hints now live at:

```text
scripts/engine/combat/features/combat-feature-passive-rider-service.js
```

The service groups passive riders by what they affect: Attack, Damage, Defense, Threshold / Condition, Movement, Grapple / Control, Equipment, and Other. It annotates each rider with `automationLabel` and `automationHint` so the panel can tell players whether the rider is Automated, Partial, or Manual without pretending to apply math. The adapter keeps `passiveRiders` as the raw flat list and adds `passiveRiderGroups` for the UI.

Future files should follow this split:

```text
combat-feature-classifier.js      // source item/effect -> feature bucket
combat-feature-sheet-adapter.js   // actor -> combatFeatures display model
combat-feature-action-router.js   // data-action -> mapped runtime behavior
combat-feature-handlers.js        // Power Attack, Rage, Second Wind, etc.
```
