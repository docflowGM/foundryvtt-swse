import assert from 'node:assert/strict';
import {
  PHASE4_FORCE_MODIFIER_RULES,
  getBattleStrikeDamageDice
} from '../scripts/engine/force/phase4-force-modifier-automation.js';

assert.equal(getBattleStrikeDamageDice(9), null);
assert.equal(getBattleStrikeDamageDice(10), '1d6');
assert.equal(getBattleStrikeDamageDice(15), '2d6');
assert.equal(getBattleStrikeDamageDice(20), '3d6');
assert.equal(getBattleStrikeDamageDice(30), '3d6');

assert.equal(PHASE4_FORCE_MODIFIER_RULES['battle strike'].sourceVerified, true);
assert.equal(PHASE4_FORCE_MODIFIER_RULES['battle strike'].automation, 'pending-next-attack');
assert.equal(PHASE4_FORCE_MODIFIER_RULES.battlemind.correction, 'defenses-and-damage-not-attack');
assert.equal(PHASE4_FORCE_MODIFIER_RULES.prescience.automation, 'assisted');
assert.equal(PHASE4_FORCE_MODIFIER_RULES['force weapon'].automation, 'assisted');
assert.equal(PHASE4_FORCE_MODIFIER_RULES['force strike'].automation, 'disabled-alias');

console.log('Phase 4 Force modifier automation tests passed.');
