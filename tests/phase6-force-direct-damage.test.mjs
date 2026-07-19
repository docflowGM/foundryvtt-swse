import assert from 'node:assert/strict';
import {
  PHASE6_FORCE_DAMAGE_RULES,
  buildForceDamagePacket,
  getActorFortitude,
  getForceLightningFormula
} from '../scripts/engine/force/phase6-force-direct-damage.js';

assert.equal(getForceLightningFormula(14), null);
assert.equal(getForceLightningFormula(15), '2d6');
assert.equal(getForceLightningFormula(20), '4d6');
assert.equal(getForceLightningFormula(25), '6d6');
assert.equal(getForceLightningFormula(30), '8d6');
assert.equal(getForceLightningFormula(40), '8d6');

assert.equal(PHASE6_FORCE_DAMAGE_RULES['force lightning'].damageType, 'force');
assert.equal(PHASE6_FORCE_DAMAGE_RULES['force slam'].damageType, 'force');
assert.equal(PHASE6_FORCE_DAMAGE_RULES['force slam'].range, '6-square cone');
assert.equal(PHASE6_FORCE_DAMAGE_RULES['force slam'].missDamage, 'half');
assert.equal(PHASE6_FORCE_DAMAGE_RULES['force slam'].hitCondition, 'prone');

assert.equal(getActorFortitude({ system: { derived: { defenses: { fortitude: { total: 22 } } } } }), 22);
assert.equal(getActorFortitude({ system: { defenses: { fortitude: 18 } } }), 18);
assert.equal(getActorFortitude({ system: {} }), 10);

const packet = buildForceDamagePacket({
  sourceActor: { id: 'caster' },
  sourceItem: { id: 'power' },
  target: { id: 'target' },
  amount: 17,
  powerName: 'Force Slam',
  hit: false,
  area: true
});
assert.equal(packet.amount, 17);
assert.equal(packet.type, 'force');
assert.equal(packet.damageType, 'force');
assert.equal(packet.flags.forcePower, true);
assert.equal(packet.flags.hit, false);
assert.equal(packet.flags.area, true);
assert.equal(packet.flags.sourceVerified, true);

console.log('Phase 6 direct Force damage tests passed.');
