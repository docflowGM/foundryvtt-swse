# Class Phase 6F-4 — Saboteur: Destructive

**Date:** 2026-11-02  
**Base:** merged `main` `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f4-saboteur-destructive`  
**Status:** Pushed for review. Exact-head CI and Foundry v13 live verification are separate gates.

## Printed source

**The Force Unleashed Campaign Guide, printed p. 48 — Saboteur / Destructive.**
"Starting at 2nd level, you always deal double damage to unattended objects and vehicles."

The source does **not** require vehicles to be unattended, and the feature is not an attack-roll bonus.

## Code and ownership

- `scripts/engine/combat/class-saboteur-destructive.js`: pure mechanical predicate: a genuinely owned Saboteur class Item at level 2+, target classified as vehicle or an unattended object/device, and exactly x2 pre-mitigation damage.
- `scripts/engine/combat/damage-packet-builder.js`: applies the modifier to damage roll input before packet construction, type-specific target resolution, mitigation and HP changes. Retains a `saboteurDestructiveApplied` flag and original pre-feature damage for auditability. Noneligible actors/targets retain the existing packet path.
- `tests/class-phase-6f4-saboteur-destructive.test.mjs`: source-level integration assertion and executable pure predicate tests.

## Conservative target policy

- Vehicle category: always qualifies if the attacker has the class feature.
- Object or device category: qualifies only when the target has `system.unattended===true`, `system.isUnattended===true`, `flags.swse.unattended===true`, or the damage invocation explicitly sets `options.unattendedTarget===true`.
- No target, generic organic creature or droid category: not eligible.
- Token disposition and object **name** never establish that something is unattended.

## Known review and testing boundaries

- This is the canonical `buildDamagePacket()` path. The project has several alternate/no-target damage flows. They require an independent downstream coverage audit. No claim of universal damage routing.
- Live Foundry testing is still required for vehicle scaling, crewed/uncrewed vehicles, the GM's unattended-object adjudication, armor/shields/DR and critical-hit interactions.
- No migrated/retyped class Items, no class unlock schedule changes, no feat/talent provenance changes and no weapon damage-profile edits.
- The `class-features.json` feature entry can remain `STUB` until runtime certification; the packet path has a defined source and regression checks but is not yet complete mechanically certified.

## Acceptance

1. Saboteur level 1 against a vehicle: unchanged damage.
2. Saboteur level 2 against a vehicle: rolled damage doubled before vehicle defenses.
3. Saboteur level 2 against explicit unattended object: doubled before object defenses.
4. Attended object, unmarked device, droid, ordinary NPC: unchanged damage.
5. No false grant from merely owning an Item named Saboteur that is not a class Item.
6. No extra multiplier on target HP after mitigation.
