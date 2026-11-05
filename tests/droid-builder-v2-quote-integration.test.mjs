import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// Node can run the pure domain consumer and real presentation adapter.
// DroidBuilderStep's import graph includes the Foundry ApplicationV2 splash;
// do not fake an ApplicationV2 runtime to make a Node test look stronger.
registerFoundryPathLoader();
const { DroidBuilderViewModelAdapter } = await import(
  '../scripts/apps/progression-framework/steps/droid-builder-view-model.js'
);
const { DROID_SYSTEMS } = await import('../scripts/data/droid-systems.js');
const { quoteDroidBuilderSelection } = await import(
  '../scripts/domain/droids/droid-builder-quote-consumer.js'
);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relPath => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

function state(size = 'small') {
  return {
    droidSize: size, droidDegree: '2nd-degree',
    droidCredits: { base: 30000, spent: 0, remaining: 30000 },
    droidSystems: {
      locomotion: { id: 'walking', speed: 4, cost: 0, isDefault: true, isGranted: true },
      processor: { id: 'heuristic', cost: 0, isGranted: true },
      appendages: [{ id: 'hand', cost: 0, weight: 1, isGranted: true }],
      accessories: [], locomotionEnhancements: [], appendageEnhancements: []
    }
  };
}
function quote(definition, s, category, subcategory = null, speed = null) {
  return quoteDroidBuilderSelection({
    definition, size: s.droidSize, category, subcategory,
    droidSystems: s.droidSystems, speed
  });
}

test('real preview consumes identical accessory price and weight decision', () => {
  const s = state('tiny');
  const vm = DroidBuilderViewModelAdapter.build({
    droidState: s, contextMode: 'chargenDraft',
    readiness: { isValid: true, issues: [], summary: 'Ready' }
  });
  const definition = DROID_SYSTEMS.accessories.armor.find(entry => entry.id === 'plasteel-shell');
  const q = quote(definition, s, 'accessory', 'armor');
  const entry = vm.availableSystemsFlat.find(e => e.id === 'plasteel-shell');
  assert.equal(q.status, 'OK');
  assert.equal(entry.quoteStatus, 'OK');
  assert.equal(entry.cost, q.credits);
  assert.equal(entry.weight, q.kg);
  assert.equal(entry.cost, 2000);
  assert.ok(Math.abs(entry.weight - 0.8) < 1e-9);
  assert.equal(entry.quoteCostLabel, '2,000 cr');
});

test('real preview blocks unselected external-processor range', () => {
  const vm = DroidBuilderViewModelAdapter.build({
    droidState: state(), contextMode: 'chargenDraft'
  });
  const remote = vm.availableSystemsFlat.find(entry => entry.id === 'remote');
  assert.ok(remote);
  assert.equal(remote.quoteStatus, 'BLOCKED');
  assert.equal(remote.cost, null);
  assert.equal(remote.canInstall, false);
  assert.equal(remote.quoteCostLabel, 'Unavailable');
  assert.ok(remote.disabledReasons.some(reason => /range variant/i.test(reason)));
});

test('shared quote responds to chassis resize without changing source records', () => {
  const s = state();
  const shell = DROID_SYSTEMS.accessories.armor.find(e => e.id === 'plasteel-shell');
  assert.deepEqual(quote(shell, s, 'accessory', 'armor'), {
    status: 'OK', credits: 800, kg: 2, blockingReason: null
  });
  s.droidSize = 'tiny';
  const resized = quote(shell, s, 'accessory', 'armor');
  assert.equal(resized.status, 'OK');
  assert.equal(resized.credits, 2000);
  assert.ok(Math.abs(resized.kg - .8) < 1e-9);
});

test('shield expansion cannot assume SR5 and consumes actual installed SR10', () => {
  const s = state();
  const module = DROID_SYSTEMS.accessories.shields.find(e => e.id === 'shield-expansion-module');
  assert.equal(quote(module, s, 'accessory', 'shields').status, 'BLOCKED');
  s.droidSystems.accessories.push({ id: 'sr10-shield-generator', category: 'shields' });
  assert.deepEqual(quote(module, s, 'accessory', 'shields'), {
    status: 'OK', credits: 1000, kg: 20, blockingReason: null
  });
  s.droidSize = 'tiny';
  assert.equal(quote(module, s, 'accessory', 'shields').status, 'BLOCKED');
});

test('stationary zero speed is a valid published selection, not a fallback to six', () => {
  const s = state();
  const stationary = DROID_SYSTEMS.locomotion.find(e => e.id === 'stationary');
  assert.equal(quote(stationary, s, 'locomotion', null, 0).credits, 0);
  assert.equal(quote(stationary, s, 'locomotion', null, null).status, 'BLOCKED');
});

test('unresolved base and multiplier cannot silently become free enhancements', () => {
  const s = state();
  const extraLegs = DROID_SYSTEMS.locomotionEnhancements.find(e => e.id === 'extra-legs');
  assert.equal(quote(extraLegs, s, 'locomotionEnhancement').status, 'BLOCKED');
  const gyro = DROID_SYSTEMS.locomotionEnhancements.find(e => e.id === 'gyroscopic-stabilizers');
  assert.equal(quote(gyro, s, 'locomotionEnhancement').status, 'BLOCKED');
  // The existing source has no published kg for either; a working price
  // alone cannot authorize a complete purchase.
});

test('real builder source delegates purchase, repricing and validator to quote authority', () => {
  const builder = read('scripts/apps/progression-framework/steps/droid-builder-step.js');
  const vm = read('scripts/apps/progression-framework/steps/droid-builder-view-model.js');
  assert.match(builder, /_quoteDroidSystem\(definition, category/);
  assert.match(builder, /return quoteDroidBuilderSelection\(/);
  assert.match(builder, /const quote = this\._quoteDroidSystem\(system, group/);
  assert.match(builder, /quote\.status !== 'OK'/);
  assert.match(builder, /this\._refreshSizeDependentSystems\(\)/);
  assert.match(vm, /const quote = quoteDroidBuilderSelection\(/);
  assert.doesNotMatch(builder, /_calculateAccessoryCost\(/);
  assert.doesNotMatch(vm, /#calculateAdjustedCost\(/);
});
