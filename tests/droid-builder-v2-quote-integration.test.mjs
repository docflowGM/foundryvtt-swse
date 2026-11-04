import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
registerFoundryPathLoader();

const { DroidBuilderViewModelAdapter } = await import(
  '../scripts/apps/progression-framework/steps/droid-builder-view-model.js'
);
const { DroidBuilderStep } = await import(
  '../scripts/apps/progression-framework/steps/droid-builder-step.js'
);
const { DROID_SYSTEMS } = await import('../scripts/data/droid-systems.js');
const { resolveDroidBuilderQuote } = await import(
  '../scripts/domain/droids/droid-component-quote-authority.js'
);

function freshState(size = 'small', base = 30000) {
  return {
    droidSize: size, droidDegree: '2nd-degree', creationMode: 'custom',
    buildState: { mode: 'provisional', isDeferred: false },
    droidCredits: { base, spent: 0, remaining: base },
    droidSystems: {
      locomotion: { id: 'walking', name: 'Walking', cost: 0, weight: 10, speed: 4, isDefault: true, isGranted: true },
      processor: { id: 'heuristic', name: 'Heuristic Processor', cost: 0, weight: 5, isGranted: true },
      appendages: [{ id: 'hand', name: 'Hand', cost: 0, weight: 1, isGranted: true }],
      accessories: [], locomotionEnhancements: [], appendageEnhancements: []
    }
  };
}

function stepWith(state) {
  const step = new DroidBuilderStep({ id: 'droid-builder' });
  step._droidState = state;
  // Only isolate session-config access: the budget is still calculated from
  // actual draft credits, while purchase, repricing and validation stay real.
  step._normalizeDroidCredits = function() {
    const c = this._droidState.droidCredits;
    c.remaining = c.base - c.spent;
    return c;
  };
  return step;
}

test('shared source quote is consumed by preview for the same chassis', () => {
  const state = freshState('tiny');
  const vm = DroidBuilderViewModelAdapter.build({
    droidState: state,
    readiness: { isValid: true, issues: [], summary: 'ready' },
    contextMode: 'chargenDraft',
  });
  const armor = vm.availableSystemsFlat.find(e => e.id === 'plasteel-shell');
  assert.ok(armor, 'source armor appears in component preview');
  assert.equal(armor.quoteStatus, 'OK');
  assert.equal(armor.cost, 2000);
  assert.ok(Math.abs(armor.weight - .8) < 1e-9);
  assert.notEqual(armor.quoteCostLabel, 'Unavailable');

  const remote = vm.availableSystemsFlat.find(e => e.id === 'remote');
  assert.ok(remote, 'remote processor range appears as a distinct selection');
  assert.equal(remote.quoteStatus, 'BLOCKED');
  assert.equal(remote.canInstall, false);
  assert.equal(remote.quoteCostLabel, 'Unavailable');
  assert.ok(remote.disabledReasons.some(e => /range variant/i.test(e)));
});

test('draft purchases and subsequent chassis resizing use one quote and weight authority', () => {
  const state = freshState();
  const step = stepWith(state);
  step._refreshSizeDependentSystems();
  assert.equal(step.purchaseSystem('accessory', 'plasteel-shell', 'armor'), true);
  assert.equal(state.droidSystems.accessories[0].cost, 800);
  assert.equal(state.droidSystems.accessories[0].weight, 2);
  assert.equal(state.droidCredits.spent, 800);
  state.droidSize = 'tiny';
  step._refreshSizeDependentSystems();
  assert.equal(state.droidSystems.accessories[0].cost, 2000);
  assert.ok(Math.abs(state.droidSystems.accessories[0].weight - .8) < 1e-9);
  assert.equal(state.droidCredits.spent, 2000);
  assert.equal(step._validateDroidBuild().issues.some(e => /Unresolved component quote/.test(e)), false);
});

test('unpriced/unknown processor and unidentified components cannot mutate a chargen budget', () => {
  const state = freshState();
  const step = stepWith(state);
  const before = JSON.stringify(state.droidSystems);
  assert.equal(step.purchaseSystem('processor', 'remote'), false, 'must choose remote processor range');
  assert.equal(step.purchaseSystem('accessory', 'made-up-part', 'armor'), false);
  assert.equal(JSON.stringify(state.droidSystems), before);
  assert.equal(state.droidCredits.spent, 0);
});

test('shield expansion must use installed shield SR and must not assume SR5', () => {
  const module = DROID_SYSTEMS.accessories.shields.find(e => e.id === 'shield-expansion-module');
  const noHost = resolveDroidBuilderQuote({
    definition: module, category: 'accessory', subcategory: 'shields', size: 'small'
  });
  assert.equal(noHost.status, 'BLOCKED');
  const selectedSr10 = resolveDroidBuilderQuote({
    definition: module, category: 'accessory', subcategory: 'shields',
    size: 'small', selectedInstalledShieldRating: 10
  });
  assert.deepEqual(selectedSr10, { status: 'OK', credits: 1000, kg: 20, blockingReason: null });
  const tooSmall = resolveDroidBuilderQuote({
    definition: module, category: 'accessory', subcategory: 'shields',
    size: 'tiny', selectedInstalledShieldRating: 10
  });
  assert.equal(tooSmall.status, 'BLOCKED');
});

test('builder purchases shield expansion after the required shield is installed', () => {
  const state = freshState('small', 40000);
  const step = stepWith(state);
  step._refreshSizeDependentSystems();
  assert.equal(step.purchaseSystem('accessory', 'shield-expansion-module', 'shields'), false);
  assert.equal(step.purchaseSystem('accessory', 'sr10-shield-generator', 'shields'), true);
  assert.equal(step.purchaseSystem('accessory', 'shield-expansion-module', 'shields'), true);
  const expansion = state.droidSystems.accessories.find(e => e.id === 'shield-expansion-module');
  assert.equal(expansion.cost, 1000);
  assert.equal(expansion.weight, 20);
});

test('stationary 0 speed is never substituted with the old 6-square fallback', () => {
  const step = stepWith(freshState('small'));
  const stationary = DROID_SYSTEMS.locomotion.find(e => e.id === 'stationary');
  assert.equal(step._calculateLocomotionSpeed(stationary), 0);
  assert.equal(step.purchaseSystem('locomotion', 'stationary'), true);
  assert.equal(step._droidState.droidSystems.locomotion.speed, 0);
});
