import assert from 'node:assert/strict';
import {
  buildMitigationEffectData,
  buildVitalTransferTransaction,
  getVitalTransferMultiplier
} from '../scripts/engine/force/force-power-outcome-service.js';
import { VITAL_TRANSFER_RESOLUTION } from '../scripts/engine/force/phase5-force-healing-mitigation.js';

assert.equal(getVitalTransferMultiplier(14), 0);
assert.equal(getVitalTransferMultiplier(15), 2);
assert.equal(getVitalTransferMultiplier(20), 3);
assert.equal(getVitalTransferMultiplier(25), 4);
assert.equal(getVitalTransferMultiplier(40), 4);

const caster = {
  id: 'caster',
  system: { level: 8, hp: { value: 60, max: 60 }, conditionTrack: { current: 0 } }
};
const target = {
  id: 'target',
  system: { level: 10, hp: { value: 25, max: 100 }, conditionTrack: { current: 7 } }
};

const standard = buildVitalTransferTransaction({ caster, target, checkTotal: 20 });
assert.equal(standard.success, true);
assert.equal(standard.multiplier, 3);
assert.equal(standard.requestedHealing, 30);
assert.equal(standard.actualHealing, 30);
assert.equal(standard.casterDamage, 15);
assert.equal(standard.targetUpdate['system.hp.value'], 55);
assert.equal(standard.casterUpdate['system.hp.value'], 45);

const forcePoint = buildVitalTransferTransaction({ caster, target, checkTotal: 25, preventCasterCost: true });
assert.equal(forcePoint.actualHealing, 40);
assert.equal(forcePoint.casterDamage, 0);
assert.equal(forcePoint.casterUpdate, null);

const destiny = buildVitalTransferTransaction({ caster, target, checkTotal: 15, destinyPoint: true });
assert.equal(destiny.conditionImprovement, 5);
assert.equal(destiny.targetUpdate['system.conditionTrack.current'], 2);

const nearlyFull = {
  id: 'nearly-full',
  system: { level: 10, hp: { value: 95, max: 100 }, conditionTrack: { current: 0 } }
};
const capped = buildVitalTransferTransaction({ caster, target: nearlyFull, checkTotal: 25 });
assert.equal(capped.actualHealing, 5);
assert.equal(capped.casterDamage, 2);

assert.throws(() => buildVitalTransferTransaction({ caster, target: caster, checkTotal: 20 }), /cannot target the caster/i);

const mitigation = buildMitigationEffectData({ name: 'Test Shield', uuid: 'Item.test' }, {
  kind: 'resistance',
  amount: 10,
  damageType: 'energy',
  sourceVerified: true
});
assert.equal(mitigation.changes.length, 0);
assert.equal(mitigation.flags['foundryvtt-swse'].forcePowerMitigation.damageType, 'energy');
assert.equal(mitigation.flags['foundryvtt-swse'].forcePowerMitigation.sourceVerified, true);

assert.equal(VITAL_TRANSFER_RESOLUTION.behavior.primary, 'healing');
assert.deepEqual(VITAL_TRANSFER_RESOLUTION.outcomes.tiers.map(tier => tier.minimum), [15, 20, 25]);
assert.equal(VITAL_TRANSFER_RESOLUTION.automation.status, 'partial');

console.log('Phase 5 Force healing and mitigation tests passed.');
