# SWSE Audit Closeout — Performance/Mutation/Reroll Follow-up

Date: 2026-06-29

This pass revisits the open stabilization and implementation audit items after the recent performance/cache/data cleanup work. The goal was to check off safe static items and leave runtime- or rules-sensitive items explicitly queued instead of pretending they are done.

## Closed or newly verified

### Nonheroic data validation warnings

Status: **closed in the prior JSON-array data pass**.

- `data/nonheroic/nonheroic_templates.json` is now a real JSON array.
- `data/nonheroic/nonheroic_units.json` is now a real JSON array.
- `tools/validate-data.js` reports zero warnings and zero errors.

### Action economy Phase 1 routing basics

Status: **verified statically**.

- `ActionEngine.costForActionType('full-round')` consumes Standard, Move, and Swift.
- `ActionEngine._consumeInternal()` allows only RAW downward substitutions: Standard -> Move/Swift and Move -> Swift.
- `CombatActionsMapper._normalizeAction()` preserves Phase 1 routing fields: `resolutionMode`, `manualResolution`, `gmManaged`, `automationBoundary`, `executable`, `contextTags`, `requiredContext`, `resources`, `ruleData`, and `spendAction`.

Runtime combat smoke testing is still required, but the specific Phase 0L/Phase 1 static routing concerns are no longer obviously dropped in the mapper/engine.

### Species/feat/talent reroll grants hook

Status: **code hook closed; data/runtime validation remains**.

`SpeciesRerollHandler._getItemGrantedRerolls()` no longer returns an empty array. It now reads actor-owned reroll metadata from:

- `flags.swse.grantsReroll`
- `flags.foundryvtt-swse.grantsReroll`
- `system.specialAbility.rerolls`
- `system.specialAbility.rerollGrants`
- `system.abilityMeta.rerollGrants`
- `system.rerollGrants`

It normalizes skill target names, outcome semantics, frequency, display names, and once-per-encounter IDs. Once-per-encounter rerolls are filtered when already used, and the used/reset flag writes route through `ActorEngine`.

### Tech Specialist signature-device mutation routing

Status: **closed for the active signature-device paths touched here**.

- Former signature-device cleanup on actor subjects now routes through `ActorEngine.updateActor()`.
- Former signature-device cleanup on owned item subjects now routes through `ActorEngine.updateOwnedItems()`.
- Signature-device owner and subject flag writes now route through `ActorEngine.updateActorFlags()`/`updateOwnedItems()` where an actor boundary exists.
- Unowned world item mutation remains a documented fallback exception because there is no owning actor boundary.

### Allies/party flag mutation routing

Status: **partially closed for the active Allies surface and GM party roster service**.

- `AlliesSurfaceService` no longer falls back to direct `actor.update()` when `ActorEngine` import fails.
- Active Allies surface flag writes now route through `ActorEngine.updateActorFlags()`/`unsetActorFlag()`.
- `GMPartyRosterService` party flag writes now route through `ActorEngine`.

## Still open / not safe to check off statically

### Force Point rescue lifecycle

Still open. The audit question is rules-sensitive: when and how `alreadyRescuedThisResolution` should clear depends on the exact rescue lifecycle decision. Do not patch until the rule decision is explicit.

### Wider species ability registry audit

Still open. Reroll hook wiring is closed, but the broader registry audit remains:

- skill bonus wiring
- movement modifier wiring
- senses
- natural weapons
- activated abilities
- species-specific special cases

### Combat automation later phases

Still open and intentionally not touched in this pass:

- damage packet handoff
- targeted damage rules
- ammo/resource transactions beyond existing hooks
- grapple/ion/stun/acid/fire/hazard semantics
- heal/repair full automation
- reaction windows that depend on post-hit/post-miss/post-damage events

### Vehicle import/runtime materialization

Still runtime-sensitive. Static code exists, but import normalization and weapon materialization should be validated in Foundry with real imported vehicle actors.

### Remaining direct flag mutations outside this pass

Still open as a separate mutation-hardening sweep. This pass focused on audit-known Allies/party and Tech Specialist paths. Other runtime domains still contain actor flag writes, especially talent/force/combat metadata state. Some are already marked as metadata exceptions; others need dedicated classification before broad routing.

## Validation run

- `node --check` on every changed JS file
- `node tools/validate-partials.mjs`
- `node tools/validate-data.js`
- `JSON.parse(system.json)`

Current data validation state: **Warnings 0, Errors 0**.
