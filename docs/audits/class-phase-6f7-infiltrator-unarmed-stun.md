# Class Phase 6F-7 — Infiltrator: Unarmed Stun

**Date:** 2026-11-02  
**Base:** merged main `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f7-infiltrator-unarmed-stun`  
**Status:** code and tests pushed; exact-head CI and live Foundry v13 certification outstanding.

## Printed rule
*The Force Unleashed Campaign Guide*, Infiltrator, printed p. 49.
- From Infiltrator 2: declare stun **before making an unarmed attack**; that attack deals stun damage and one additional unarmed weapon die.
- At Infiltrator 6: two additional weapon dice.
- At Infiltrator 10: three additional weapon dice.

## User-facing design decision
A qualifying Infiltrator's **unarmed attack dialog** has a Damage Mode choice: Normal or Stun. No separate class-feature activation dialog or consumable ability is required. The chosen mode stays attached to the attack's existing workflow context, and damage uses the same choice.

## Code
- `scripts/engine/combat/class-infiltrator-unarmed-stun.js` is the pure class/weapon/mode predicate. It uses the existing natural/unarmed weapon classifier; natural-only weapons, held firearms and other classes do not qualify.
- `scripts/rolls/roll-config.js` exposes Stun as a mode on qualifying unarmed attacks, not on all attacks.
- `scripts/combat/rolls/attacks.js` permits that explicitly class-granted stun declaration before action/ammo expenditure; validates the underlying canonical unarmed form as Normal but keeps the selected mode Stun. The special-mechanics lookup carries the real Actor.
- `scripts/items/weapon-runtime/attack-consumer.js` uses the canonical unarmed Normal damage dice for an eligible Infiltrator's stun declaration, with the output typed as Stun. Ineligible callers cannot spoof a canonical weapon stun mode by supplying a free-form flag.
- `scripts/combat/rolls/damage.js` passes the actual attacking Actor to canonical resolution, preserving Stun as damage type instead of stale physical type in a normal-form weapon context.
- `scripts/engine/combat/combat-roll-math.js` inserts +1/+2/+3 into the canonical extra-weapon-dice expression. Extra dice are weapon dice, included before critical multiplication; no post-DR or post-HP manipulation.
- `tests/class-phase-6f7-infiltrator-unarmed-stun.test.mjs` exercises class levels, selected mode, natural and non-unarmed exclusions and code-path guards.

## Boundaries
- No custom weapon data, class Item, talent Item, or attack option catalog mutations.
- Other sources of stun damage follow their existing weapon profile rules.
- No automatic application of condition-track steps outside the existing stun damage packet system.
- Source code tests and pure predicate coverage do not certify every live Foundry v13 attack context. Verify normal vs stun select, actual unarmed forms, critical hit, loss of temporary eligibility between attack and damage, and normal packet mitigation.
- Remains independent from unmerged PRs #1094–#1099; no merge on static coverage alone.
