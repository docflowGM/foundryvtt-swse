# Stub / Placeholder Closeout Pass

Date: 2026-06-29

## Goal

Audit live `scripts/` code for placeholders that looked like they should do real work. For each candidate:

1. If a newer/parallel system already handles the behavior, mark the older path as deprecated rather than duplicating logic.
2. If no parallel system exists, fill in the missing behavior when it can be done safely with static validation.
3. Leave runtime-sensitive or rules-decision items open with a clear note.

## Filled in

### 1. SWSE critical threat handling

File: `scripts/engine/roll/roll-core.js`

The old handler was labeled as a Phase 5 critical-confirmation stub. SWSE does not use D&D-style critical confirmation rolls, so the stub was replaced with SWSE behavior:

- a detected legal threat auto-confirms;
- no confirmation roll is made;
- the handler returns the applicable weapon critical multiplier, defaulting to `2`.

This keeps the compatibility method useful without importing a non-SWSE confirmation mechanic.

### 2. Slot resolution flow available-slot lookup

File: `scripts/governance/ui/slot-resolution-flow.js`

The old `_getAvailableSlots()` method returned an empty list and had a note that the real implementation depended on SlotEngine. The flow now reads existing structured progression slot data from the actor, including feat, talent, and Force power slots, with legacy fallback count support.

`calculateRefund()` now uses this real slot lookup instead of checking against an always-empty list.

### 3. Beast companion shell creation

Files:

- `scripts/ui/shell/AlliesSurfaceController.js`
- `scripts/ui/shell/AlliesSurfaceService.js`

The GM/player allies surface had a build-beast button that only warned that beast companion creation was not implemented. There was no parallel beast actor creator, only link/level-up support once a beast existed.

The system now creates a barebones NPC beast companion shell and links it to the owning actor's beast/owned-actor flags. The shell intentionally does not invent a statblock; it gives the GM/player a linked actor to flesh out or replace.

## Deprecated because a parallel system already exists

### 1. `UpgradeRulesEngine`

File: `scripts/apps/upgrade-rules-engine.js`

The active upgrade/customization path is:

`UpgradeService -> CustomizationWorkflow / UpgradeSlotEngine -> ActorEngine`

The older `UpgradeRulesEngine` is retained only for legacy modification app imports and is marked deprecated. No new behavior should be added there.

### 2. Legacy weapon/lightsaber customization adapters

Files:

- `scripts/apps/customization/adapters/weapon-adapter.js`
- `scripts/apps/customization/adapters/lightsaber-adapter.js`

These adapters are legacy prototypes and are not exported from `scripts/apps/customization/adapters/index.js`. Active customization work is handled by the item customization workbench, customization workflow, upgrade slot engine, and the dedicated lightsaber workbench path.

They were marked deprecated rather than reimplemented.

### 3. Base actor and vehicle compatibility stubs

Files observed:

- `scripts/actors/base/swse-actor-base.js`
- `scripts/actors/vehicle/swse-vehicle.js`

These are compatibility/headless-safe stubs that already point to v2 implementations. They were not changed.

### 4. Aurebesh translator and translation presets shims

Files observed:

- `scripts/engine/mentor/aurebesh-translator.js`
- `scripts/mentor/translation-presets.js`

These are contract-restoration re-export shims that point to actual implementations under `scripts/ui/dialogue`. They were not changed.

## Still open / not safe as a static-only patch

### 1. Force Alchemy generic completion guard

File: `scripts/apps/force-alchemy/force-alchemy-mechanics-service.js`

The generic throw for unsupported project completion remains. Known rite project types are handled above that guard. The throw is a defensive unsupported-project guard, not an immediate missing implementation for known data.

### 2. Progression step explainability rationale

File: `scripts/apps/progression-framework/ux/step-explainability-mixin.js`

`_getOptionRationale()` still returns `null`. Filling it correctly needs integration with suggestion/advisory scoring context; otherwise it would produce generic or misleading reasons.

### 3. Prestige progress analysis

File: `scripts/engine/analysis/build-analysis-engine.js`

Prestige progress is still a rough placeholder because accurate progress depends on async prestige-class availability and prerequisite evaluation. This should be handled when the analysis engine can safely call the same registry/prerequisite path used by progression.

### 4. PassiveAdapter STATE handler

File: `scripts/engine/abilities/passive/passive-adapter.js`

The STATE classification path is still deliberately no-op. It validates/records structure but does not execute stateful behavior there. This should only be expanded if the ability execution engine needs a dedicated STATE runtime pass.

### 5. Runtime/UI placeholder surfaces

A few UI/editor placeholders remain for future tooling or backend integration. These should be evaluated with runtime context before changing behavior.

## Validation

Static validation passed after the changes:

- `node --check` on every changed JS file
- `node tools/validate-partials.mjs`
- `node tools/validate-data.js`
- `JSON.parse(system.json)`

`validate-data.js` reports zero warnings and zero errors.
