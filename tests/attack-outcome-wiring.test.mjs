import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Static architectural guard for the Phase 1 attack-outcome-resolver work.
// See tests/attack-outcome-resolver.test.mjs for the executable proof of the
// natural-1/natural-20/expanded-threat rules themselves; this test proves the
// canonical attack path actually uses that one resolver instead of
// re-deriving hit/critical independently in multiple places.

const attacks = await readFile(new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8');
const vehicleWeapons = await readFile(new URL('../scripts/combat/systems/vehicle/vehicle-weapons.js', import.meta.url), 'utf8');

// Both rollAttack() and rollAttackAndDamageWithNarration() must resolve
// through AttackOutcomeResolver.
const outcomeCalls = attacks.match(/AttackOutcomeResolver\.resolve\(/g) || [];
assert.ok(outcomeCalls.length >= 2, 'Expected AttackOutcomeResolver.resolve() in both rollAttack() and rollAttackAndDamageWithNarration().');

// The old defect: isHit computed purely from roll.total >= targetDefense,
// with no natural-1 override. That standalone pattern must be gone from the
// canonical attack path.
assert.doesNotMatch(attacks, /const isHit = targetReflex != null \? roll\.total >= targetReflex : null;/);
assert.doesNotMatch(attacks, /const isHit = targetReflex != null\s*\n\s*\? attackRoll\.total >= targetReflex/);

// rollFullAttack's duplicate ad hoc crit-threat check (which also read a
// nonexistent attack.dice property) must be replaced by the shared outcome.
assert.doesNotMatch(attacks, /attack\.dice\[0\]\?\.results\?\.some/);
assert.match(attacks, /attack\.outcome\?\.criticalThreat/);

// Attack chat context, damage workflow context, and the returned
// attackResult must all read hit/critical/natural1/natural20 from the same
// `outcome` object rather than recomputing Number(d20) === 1/20 themselves.
assert.match(attacks, /natural1: outcome\.automaticMiss/);
assert.match(attacks, /natural20: outcome\.automaticHit/);
assert.match(attacks, /const isHit = outcome\.hit;/);
assert.match(attacks, /const isCritical = outcome\.critical;/);

// Vehicle missile second-attack path must also resolve through the shared
// resolver instead of its own bare `roll.total >= targetReflex` comparison
// (confirmed defect: no natural-1/20 handling for vehicle attacks).
assert.match(vehicleWeapons, /AttackOutcomeResolver\.resolve\(/);
assert.doesNotMatch(vehicleWeapons, /const hits = roll\.total >= targetReflex;/);

console.log('Attack outcome single-authority wiring guards passed.');
