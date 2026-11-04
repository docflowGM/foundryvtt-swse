import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveAttackOutcome } from '../scripts/engine/combat/attack-outcome-resolver.js';

// Phase 2 vehicle/starship audit finding (docs/audits/rolling-system-alignment-phase-2.md):
// there is no separate "vehicle attack" pipeline in the live codebase.
// scripts/combat/systems/vehicle/vehicle-weapons.js and
// scripts/actors/vehicle/swse-vehicle-core.js#rollWeapon were confirmed to
// have zero callers anywhere in the active codebase (grepped, not guessed).
// Vehicle actors attack through the same shared V2 character sheet ->
// SWSERoll.rollAttack() -> attacks.js rollAttack() pipeline character actors
// use, which was already aligned with AttackOutcomeResolver in Phase 1.

// 1. AttackOutcomeResolver is actor-agnostic by construction — it takes no
//    actor/actor-type parameter at all, so a vehicle attack and a character
//    attack with the same natural d20/total/defense get an identical, correct
//    verdict without any vehicle-specific branching to maintain or drift.
{
  const characterLike = resolveAttackOutcome({ naturalD20: 1, total: 45, targetDefense: 10, criticalThreshold: 20, critMultiplier: 2 });
  const vehicleLike = resolveAttackOutcome({ naturalD20: 1, total: 45, targetDefense: 10, criticalThreshold: 20, critMultiplier: 2 });
  assert.deepEqual(characterLike, vehicleLike, 'AttackOutcomeResolver must not depend on any actor-type-specific input.');
  assert.equal(characterLike.hit, false, 'Natural 1 automatic miss must apply the same way regardless of attacker type.');
}

// 2. The confirmed-dead vehicle-specific modules must be documented as such
//    (deprecated/unreferenced) rather than silently left implying they are
//    the live vehicle attack path.
// The two confirmed-dead modules are RETIRED (convergence): they were unreachable from the module entry point and each duplicated mechanics
// owned by shared authorities. This guard now proves they cannot come back as an alternate vehicle attack path.
import { existsSync } from 'node:fs';
assert.equal(existsSync(new URL('../scripts/combat/systems/vehicle/vehicle-weapons.js', import.meta.url)), false, 'legacy SWSEVehicleWeapons stays retired');
assert.equal(existsSync(new URL('../scripts/actors/vehicle/swse-vehicle-core.js', import.meta.url)), false, 'legacy SWSEVehicleCore (rollWeapon / crew / weapon migration) stays retired');

console.log('Phase 2 vehicle attack alignment guards passed.');
