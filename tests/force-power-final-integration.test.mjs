import assert from 'node:assert/strict';
import {
  FINAL_FORCE_POWER_COVERAGE,
  buildForceGripPlan,
  buildForceStunPlan,
  buildForceThrustPlan,
  buildMoveObjectPlan,
  getForceStunConditionSteps
} from '../scripts/engine/force/force-power-final-integration.js';

assert.equal(getForceStunConditionSteps(19, 20), 0);
assert.equal(getForceStunConditionSteps(20, 20), 1);
assert.equal(getForceStunConditionSteps(25, 20), 2);
assert.equal(getForceStunConditionSteps(30, 20), 3);
assert.equal(getForceStunConditionSteps(20, 20, true), 2);

const target = {
  id: 'target',
  system: {
    derived: {
      defenses: {
        will: { total: 22 },
        fortitude: { total: 24 },
        reflex: { total: 21 }
      }
    }
  }
};

const stun = buildForceStunPlan({ checkTotal: 27, target });
assert.equal(stun.success, true);
assert.equal(stun.steps, 2);
assert.equal(stun.defenseValue, 22);

const thrust = buildForceThrustPlan({ checkTotal: 25, target, collision: { objectOrCreature: 'wall' } });
assert.equal(thrust.automation, 'assisted');
assert.equal(thrust.collision.occurred, true);
assert.equal(thrust.collision.damageRequiresResolution, true);

const grip = buildForceGripPlan({ checkTotal: 28, target, maintain: true });
assert.equal(grip.defenseValue, 24);
assert.equal(grip.rerollOnMaintain, true);
assert.equal(grip.damageRequiresTierResolution, true);

const moveObject = buildMoveObjectPlan({
  checkTotal: 30,
  primaryTarget: target,
  secondaryTarget: { id: 'second', system: { derived: { defenses: { reflex: { total: 19 } } } } },
  unwilling: true,
  maintain: true
});
assert.equal(moveObject.success, true);
assert.equal(moveObject.sizeTier, 'gargantuan');
assert.equal(moveObject.resistance.defense, 'will');
assert.equal(moveObject.secondTargetAttack.value, 19);
assert.equal(moveObject.bothTargetsMayTakeDamage, true);
assert.equal(moveObject.automation, 'assisted');

assert.equal(FINAL_FORCE_POWER_COVERAGE['force stun'], 'automatic-condition-track');
assert.equal(FINAL_FORCE_POWER_COVERAGE['force thrust'], 'assisted-opposed-movement');
assert.equal(FINAL_FORCE_POWER_COVERAGE['force grip'], 'assisted-sustained-damage');
assert.equal(FINAL_FORCE_POWER_COVERAGE['move object'], 'assisted-multi-mode');

console.log('Final Force power integration tests passed.');
