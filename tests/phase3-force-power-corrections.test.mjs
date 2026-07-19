import assert from 'node:assert/strict';
import {
  PHASE3_FORCE_POWER_CORRECTIONS,
  getPhase3ForcePowerCorrection
} from '../scripts/engine/force/phase3-force-power-corrections.js';

const names = Object.values(PHASE3_FORCE_POWER_CORRECTIONS).map(entry => entry.name).sort();
assert.deepEqual(names, ['Farseeing', 'Force Disarm', 'Rebuke', 'Surge'].sort());

const surge = getPhase3ForcePowerCorrection('Surge').resolution;
assert.equal(surge.behavior.primary, 'modifier');
assert.equal(surge.automation.status, 'partial');
assert.equal(surge.source.verified, true);
assert.equal(surge.outcomes.tiers.length, 3);
assert.equal(surge.outcomes.tiers[0].outcomes.some(outcome => outcome.category === 'damage'), false);
assert.deepEqual(
  surge.outcomes.tiers.map(tier => tier.outcomes.find(outcome => outcome.target === 'jump')?.amount),
  [10, 20, 30]
);
assert.deepEqual(
  surge.outcomes.tiers.map(tier => tier.outcomes.find(outcome => outcome.category === 'speed')?.amount),
  [2, 4, 6]
);

const rebuke = getPhase3ForcePowerCorrection('Rebuke').resolution;
assert.equal(rebuke.check.mode, 'reaction-opposed');
assert.equal(rebuke.outcomes.tiers[0].label, 'Negate incoming Force power');
assert.equal(rebuke.outcomes.tiers[1].minimum, 5);

const disarm = getPhase3ForcePowerCorrection('Force Disarm').resolution;
assert.equal(disarm.check.mode, 'attack-substitution');
assert.equal(disarm.outcomes.tiers[0].outcomes[0].kind, 'disarm');

const farseeing = getPhase3ForcePowerCorrection('Farseeing').resolution;
assert.equal(farseeing.check.mode, 'defense');
assert.equal(farseeing.check.defense, 'will');
assert.equal(farseeing.targeting.mode, 'creature');
assert.match(farseeing.source.notes.join(' '), /24-hour/i);

assert.equal(getPhase3ForcePowerCorrection('Move Object'), null);
console.log('Phase 3 Force power correction tests passed.');
