# Class Phase 6F-6 — Gunslinger: Trusty Sidearm

**Date:** 2026-11-02  
**Base:** merged `main` `62169f621e15409268ca8f91efd846a3a2c118d9`  
**Branch:** `feat/class-phase-6f6-gunslinger-trusty-sidearm`  
**Status:** pushed; CI and Foundry v13 live certification pending.

## Source authority
*Star Wars Saga Edition Core Rulebook*, Gunslinger prestige class, printed p. 216. Beginning at class level 2, a character wielding a pistol adds half the Gunslinger class level (rounded down) to damage. The ability explicitly states that it is in addition to the ordinary character-level damage bonus and is doubled on a critical hit.

## Implementation
- `scripts/engine/combat/class-gunslinger-trusty-sidearm.js`: pure Gunslinger class ownership and level scaling. Computes 0/1/2/3/4/5 and caps at 5. No talent names or character level can impersonate class ownership.
- `scripts/engine/combat/combat-roll-math.js`: `resolveDamageBonus` invokes the existing `isPistolWeapon` canonical classifier and inserts the Trusty Sidearm contribution into the additive precritical damage total. `buildDamageFormula` already multiplies that total on a critical, so no special post-roll doubling is added.
- `tests/class-phase-6f6-gunslinger-trusty-sidearm.test.mjs`: class level threshold, pistol exclusion, spoof resistance and composition stage wiring.

## Certification boundaries
The implementation runs through normal `resolveDamageComposition` damage paths. Live testing must verify the exact class Item level schema, canonical selected pistol form, holstered/nonwielded weapon restrictions from action readiness, and critical/area interactions. NPC printed-flat damage deliberately does not receive an unverified additional class contribution. No weapon, class, feat or talent production data changed.
