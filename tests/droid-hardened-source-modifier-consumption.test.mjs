import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { DROID_SYSTEMS } from '../scripts/data/droid-systems.js';
import { DROID_SIZE_PACKAGES } from '../scripts/engine/progression/droids/droid-trait-rules.js';

registerFoundryPathLoader();
const { getDroidPartDefinition, hydrateDroidPart } =
  await import('../scripts/data/droid-part-schema.js');

const sourceBatch = JSON.parse(fs.readFileSync(
  'data/audits/droids/component-mechanical-certification-batch-002.json', 'utf8'
));
const auditTiers = new Map(sourceBatch.records
  .filter(record => /^droid-hardened-systems-x[2-5]$/.test(record.canonicalId))
  .map(record => [record.canonicalId.slice('droid-'.length), record]));
const actorAt = size => ({
  type: 'droid',
  system: { droidSystems: { size }, installedSystems: {} }
});

test('16 certified Core source expectations: four tiers and four sizes are additive DELTAS only', () => {
  const parts = DROID_SYSTEMS.accessories.hardenedsystems;
  assert.equal(parts.length, 4);
  assert.equal(auditTiers.size, 4);
  for (const source of parts) {
    const audit = auditTiers.get(source.id);
    assert.ok(audit, source.id + ': frozen source evidence exists');
    assert.equal(audit.adjudication.decision, 'PASS');
    assert.equal(source.multiplier, audit.printed.mechanics.multiplier);
    const definition = getDroidPartDefinition(source.id);
    assert.ok(definition);
    assert.equal(definition.slot, 'core.hardened');
    assert.equal(definition.source.id, source.id);
    assert.equal(definition.source.hpBonus, source.hpBonus);
    assert.equal(definition.source.dtBonus, source.dtBonus);
    assert.deepEqual(definition.modifiers ?? [], [], 'no size-independent flat modifiers');
    for (const [size, expected] of Object.entries(audit.printed.mechanics.bySize)) {
      const hydrated = hydrateDroidPart({ id: source.id }, { actor: actorAt(size) });
      assert.equal(hydrated.quoteStatus, 'OK', source.id + ' ' + size);
      assert.deepEqual(hydrated.modifiers, [
        { target: 'hp.max', type: 'equipment', value: expected.additionalHpOverOrdinary, active: true },
        { target: 'defense.damageThreshold', type: 'equipment', value: expected.additionalDtOverOrdinary, active: true }
      ], source.id + ' ' + size + ' modifier delta');
      assert.equal(
        DROID_SIZE_PACKAGES[size].hitPointAdjustment + hydrated.modifiers[0].value,
        expected.totalSizeHpBonus, source.id + ' ' + size + ' total size HP'
      );
      assert.equal(
        DROID_SIZE_PACKAGES[size].damageThresholdBonus + hydrated.modifiers[1].value,
        expected.totalSizeDtBonus, source.id + ' ' + size + ' total size DT'
      );
    }
  }
});

test('Small chassis, malformed source totals and conflicting tiers never contribute bonuses', () => {
  assert.deepEqual(hydrateDroidPart(
    { id: 'hardened-systems-x2' }, { actor: actorAt('small') }
  ).modifiers, []);
  const source = getDroidPartDefinition('hardened-systems-x2').source;
  const original = source.hpBonus;
  try {
    source.hpBonus = original + 7;
    assert.deepEqual(hydrateDroidPart(
      { id: source.id }, { actor: actorAt('large') }
    ).modifiers, [], 'source metadata inconsistent with multiplier: fail closed');
  } finally {
    source.hpBonus = original;
  }
  assert.deepEqual(hydrateDroidPart(
    { id: 'hardened-systems-x2' },
    { actor: actorAt('large'), installedIds: ['hardened-systems-x2', 'hardened-systems-x3'] }
  ).modifiers, [], 'two tiers are never added together');
});

test('ModifierEngine actually consumes hydrated delta targets, not duplicated overlay literals', () => {
  const engine = fs.readFileSync(
    'scripts/engine/effects/modifiers/ModifierEngine.js', 'utf8');
  assert.match(engine, /hydrateDroidPart\(\{ id: component\.canonicalId \}/);
  assert.match(engine, /Array\.isArray\(hydrated\.modifiers\)/);
  assert.match(engine, /raw === 'hp\.max'/);
  assert.match(engine, /raw === 'defense\.damageThreshold'/);
  const schema = fs.readFileSync('scripts/data/droid-part-schema.js', 'utf8');
  assert.doesNotMatch(schema, /hardened-systems-x2':\s*\{[^\n]*value:\s*20/);
  assert.doesNotMatch(schema, /hardened-systems-x5':\s*\{[^\n]*value:\s*50/);
});
