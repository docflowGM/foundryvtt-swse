import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptLegacyForcePowerResolution,
  createEmptyForcePowerResolution,
  getForcePowerResolution,
  validateForcePowerResolution
} from '../scripts/engine/force/force-power-resolution-schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/force-power-resolution-v1.json'), 'utf8'));

for (const [name, resolution] of Object.entries(fixtures)) {
  const result = validateForcePowerResolution(resolution);
  assert.equal(result.valid, true, `${name}: ${result.errors.join('; ')}`);
}

const empty = createEmptyForcePowerResolution();
assert.equal(empty.version, 1);
assert.equal(empty.automation.status, 'manual');
assert.equal(empty.automation.reviewRequired, true);

const legacy = {
  name: 'Legacy Utility Power',
  system: {
    useTheForce: 15,
    range: 'Personal',
    target: 'You',
    duration: '1 round',
    maintainable: false,
    dcChart: [{ dc: 15, effect: 'Utility result', description: 'Legacy text only.' }],
    tags: ['utility'],
    sourcebook: 'Test Source',
    page: 1
  }
};
const adapted = adaptLegacyForcePowerResolution(legacy);
assert.equal(adapted.version, 1);
assert.equal(adapted.behavior.primary, 'utility');
assert.equal(adapted.automation.status, 'metadata');
assert.equal(adapted.automation.reviewRequired, true);
assert.equal(adapted.source.verified, false);
assert.equal(getForcePowerResolution(legacy).version, 1);

const invalidReady = structuredClone(fixtures.damageTiered);
invalidReady.automation.status = 'ready';
invalidReady.automation.reviewRequired = true;
assert.equal(validateForcePowerResolution(invalidReady).valid, false);

const missingFormula = structuredClone(fixtures.damageTiered);
delete missingFormula.outcomes.tiers[0].outcomes[0].formula;
assert.equal(validateForcePowerResolution(missingFormula).valid, false);

console.log('Force power resolution schema tests passed.');
