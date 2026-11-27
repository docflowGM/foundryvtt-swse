import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DC-A08: one condition-track penalty table (0, -1, -2, -5, -10; the bottom step is the Helpless STATE with no numeric penalty). Every consumer agrees.
registerFoundryPathLoader();
installFoundryShimGlobals();
const { conditionTrackPenaltyForStep } = await import('/systems/foundryvtt-swse/scripts/utils/condition-track-penalty.js');
const { getConditionPenalty } = await import('/systems/foundryvtt-swse/scripts/combat/utils/combat-utils.js');
const { followerLevel, conditionPenalty } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/npc/follower-sheet-parity.js').catch(() => ({}));
const expected = [0, -1, -2, -5, -10, 0];
for (let step = 0; step <= 5; step += 1) {
  assert.equal(conditionTrackPenaltyForStep(step), expected[step]);
  assert.equal(getConditionPenalty(step), expected[step], `combat-utils step ${step}`);
  if (conditionPenalty) assert.equal(conditionPenalty({ system: { conditionTrack: { current: step } } }), expected[step], `follower parity step ${step}`);
}
assert.equal(conditionTrackPenaltyForStep(-3), 0); assert.equal(conditionTrackPenaltyForStep(9), 0); assert.equal(conditionTrackPenaltyForStep('x'), 0); assert.equal(conditionTrackPenaltyForStep(undefined), 0);
// no second literal table remains in runtime code
const hits = execSync(`grep -rnE "\\[0,\\s*-1,\\s*-2,\\s*-5,\\s*-10|0:\\s*0,\\s*1:\\s*-1,\\s*2:\\s*-2" scripts --include=*.js || true`, { encoding: 'utf8' }).split('\n').filter((l) => l && !l.includes('condition-track-penalty.js'));
assert.deepEqual(hits, [], 'only condition-track-penalty.js defines the table');
console.log('condition-track-penalty-single-table: ok');
