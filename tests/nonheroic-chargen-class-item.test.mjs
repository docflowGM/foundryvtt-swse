import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/session-harness.mjs';

const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { getNonheroicClassModel } = await import('../scripts/engine/progression/utils/nonheroic-class-model.js');

test('V-NH-1: the synthetic Nonheroic model\'s level 0 never becomes a first class item level', () => {
  const model = getNonheroicClassModel();
  assert.equal(model.system.level, 0, 'precondition: the model carries an explicit 0');
  const sys = ProgressionFinalizer._chargenClassItemSystem(model.system);
  assert.equal(sys.level, 1);
  assert.equal(sys.isNonheroic, true);
  assert.equal(sys.hitDieValue, 4);
  assert.equal(sys.babProgression, 'nonheroic');
  assert.equal(model.system.level, 0, 'input not mutated');
});

test('heroic class systems without a level are untouched (the item schema default applies); explicit levels >= 1 are kept', () => {
  assert.equal('level' in ProgressionFinalizer._chargenClassItemSystem({ class_name: 'Scout' }), false);
  assert.equal(ProgressionFinalizer._chargenClassItemSystem({ level: 1 }).level, 1);
  assert.equal(ProgressionFinalizer._chargenClassItemSystem({ level: 3 }).level, 3);
  assert.equal(ProgressionFinalizer._chargenClassItemSystem({ level: -2 }).level, 1);
});
