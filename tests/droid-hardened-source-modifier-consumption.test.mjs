import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';

registerFoundryPathLoader();
const { getDroidPartDefinition, hydrateDroidPart } =
  await import('../scripts/data/droid-part-schema.js');

const large = {
  type: 'droid',
  system: { droidSystems: { size: 'large' }, installedSystems: {} }
};

test('four Hardened Systems use single source hpBonus/dtBonus values', () => {
  const parts = DROID_SYSTEMS.accessories.hardenedsystems;
  assert.equal(parts.length, 4);
  for (const source of parts) {
    const definition = getDroidPartDefinition(source.id);
    assert.ok(definition);
    assert.equal(definition.source, source);
    assert.equal(definition.slot, 'core.hardened');
    assert.deepEqual(definition.modifiers, [
      { target: 'hp.max', type: 'equipment', value: source.hpBonus },
      { target: 'defense.damageThreshold', type: 'equipment', value: source.dtBonus }
    ]);
    const hydrated = hydrateDroidPart({ id: source.id }, { actor: large });
    assert.deepEqual(hydrated.modifiers, definition.modifiers);
    assert.equal(hydrated.quoteStatus, 'OK');
  }
});

test('one authored numeric source field change updates the hydrated modifier without an overlay fork', () => {
  const source = DROID_SYSTEMS.accessories.hardenedsystems[0];
  const original = source.hpBonus;
  try {
    source.hpBonus = original + 7;
    const definition = getDroidPartDefinition(source.id);
    assert.equal(definition.modifiers.find(x => x.target === 'hp.max').value, original + 7);
    assert.equal(hydrateDroidPart({ id: source.id }, { actor: large })
      .modifiers.find(x => x.target === 'hp.max').value, original + 7);
  } finally {
    source.hpBonus = original;
  }
});

test('ModifierEngine consumes the exact hydrated targets without an additional hardened number table', () => {
  const sourceCode = fs.readFileSync(
    'scripts/engine/effects/modifiers/ModifierEngine.js', 'utf8');
  assert.match(sourceCode, /hydrateDroidPart\(\{ id: component\.canonicalId \}/);
  assert.match(sourceCode, /Array\.isArray\(hydrated\.modifiers\)/);
  assert.match(sourceCode, /raw === 'hp\.max'/);
  assert.match(sourceCode, /raw === 'defense\.damageThreshold'/);

  const partSchema = fs.readFileSync('scripts/data/droid-part-schema.js', 'utf8');
  assert.doesNotMatch(partSchema, /hardened-systems-x2':\s*\{[^\n]*value:\s*20/);
  assert.doesNotMatch(partSchema, /hardened-systems-x5':\s*\{[^\n]*value:\s*50/);
});
