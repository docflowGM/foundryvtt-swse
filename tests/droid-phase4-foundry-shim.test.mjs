import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { createFakeDroidActor } from './helpers/foundry-shim/fakes/actor-factory.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// PHASE 4 — Converted-System Reconciliation and Runtime Hardening.
//
// Exercises REAL production code (droid-statblock-conversion-service.js,
// droid-converted-system-reconciliation-service.js, SnapshotManager, the
// droid mode adapter, the installed-component resolver, the droid-part
// schema) under plain Node via tests/helpers/foundry-shim/ — a narrow
// module-resolution hook plus a small set of harmless global stubs. Only
// ActorEngine itself is faked (see fakes/actor-engine.fake.mjs's doc
// comment for why); every other module here is the real, unmodified
// production file. See docs/audits/droid-converted-system-reconciliation-phase-4.md's
// "Foundry-shim harness" section for the documented boundary of what this
// harness does and does not support — in particular,
// scripts/apps/progression-framework/progression-entry.js's stock-mode
// progression guard could NOT be loaded through this harness (its own
// transitive imports need Foundry surface well beyond this shim's scope)
// and remains verified by static code inspection only, same as Phase 3.

registerFoundryPathLoader();

const { resolveDroidCalculationMode, DROID_CALCULATION_MODE } = await import(
  '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js'
);
const { inspectConversion, convertToPlayableDerived, rollbackConversion } = await import(
  '/systems/foundryvtt-swse/scripts/domain/droids/droid-statblock-conversion-service.js'
);
const { inspectReconciliation, buildReconciliationPlan, applyReconciliation, rollbackReconciliation } = await import(
  '/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js'
);

function stockDroidFixture(overrides = {}) {
  return createFakeDroidActor({
    system: {
      droidCalculationMode: 'stock-statblock',
      bab: 4,
      defenses: {
        fortitude: { total: 15 }, reflex: { total: 13 }, will: { total: 12 }, flatFooted: { total: 11 }
      },
      damageThreshold: 20,
      initiative: 6,
      installedSystems: {},
      droidSystems: {
        sensors: [{ id: 'improved-sensor-package', name: 'Improved Sensor Package', sourceText: 'improved sensor package' }],
        accessories: [{ name: 'Reinforced Housing', sourceText: 'oddly reinforced housing plating' }]
      },
      ...overrides.system
    },
    flags: {
      swse: {
        stockDroidImport: {
          schemaVersion: 2,
          sourceId: 'test-source',
          sourceName: 'Test Stock Droid',
          importMode: 'statblock',
          importedAt: 1000,
          publishedTotals: {
            bab: 4,
            defenses: { fortitude: 15, reflex: 13, will: 12 },
            threshold: 20,
            droidSystems: {
              sensors: [{ id: 'improved-sensor-package', name: 'Improved Sensor Package', sourceText: 'improved sensor package' }],
              accessories: [{ name: 'Reinforced Housing', sourceText: 'oddly reinforced housing plating' }]
            }
          }
        }
      },
      ...overrides.flags
    },
    items: overrides.items ?? [
      { id: 'w1', _id: 'w1', name: 'Integrated Blaster', system: { integrated: true, attackBonus: 9 }, flags: { swse: { integrated: true, stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'melee', sourceStatblock: true } } } }
    ],
    isOwner: overrides.isOwner ?? true
  });
}

// ── Test 39: shim resets global state between tests ────────────────────────
{
  installFoundryShimGlobals({ game: { user: { isGM: true } } });
  assert.equal(game.user.isGM, true);
  resetFoundryShimGlobals();
  assert.equal(game.user.isGM, false);
}

// ── Test 40: conversion service can be imported and exercised ──────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  const inspection = await inspectConversion(actor);
  assert.equal(inspection.safeToConvert, true);
  assert.equal(inspection.calculationMode.mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
}

// ── Test 24: conversion without reconciliation works ────────────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  const result = await convertToPlayableDerived(actor);
  assert.equal(result.success, true);
  assert.equal(resolveDroidCalculationMode(actor).mode, DROID_CALCULATION_MODE.PLAYABLE_DERIVED);
  // Stock attack contract neutralized, not deleted.
  assert.equal(actor.items[0].flags.swse.stockDroidAttack.sourceStatblock, false);
  assert.equal(actor.items[0].flags.swse.stockDroidAttack.publishedAttackTotal, 9, 'published total kept as history');
}

// ── Test 44: ActorEngine mutation-plan shape is correct ─────────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor);
  const call = fakeActorEngineCallLog.find(c => c.method === 'applyMutationPlan');
  assert.ok(call, 'applyMutationPlan was called');
  assert.equal(call.plan.set['system.droidCalculationMode'], 'playable-derived');
  assert.ok(Array.isArray(call.plan.update.items), 'update.items bucket present for weapon neutralization');
  assert.equal(call.plan.update.items[0]._id, 'w1');
}

// ── Test 32/33: rollback restores stock mode/attack behavior; repeated rollback stable ──
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor);
  const rb1 = await rollbackConversion(actor);
  assert.equal(rb1.success, true);
  assert.equal(resolveDroidCalculationMode(actor).mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
  assert.equal(actor.items[0].flags.swse.stockDroidAttack.sourceStatblock, true);
  assert.equal(actor.items.length, 1);
  // rolledBackAt stamp fixes the confirmed stale-flags gap (see rollbackConversion's doc comment).
  assert.equal(typeof actor.flags.swse.stockDroidConversion.rolledBackAt, 'number');

  const rb2 = await rollbackConversion(actor);
  assert.equal(rb2.success, true);
  assert.equal(actor.items.length, 1, 'repeated rollback does not duplicate items');
}

// ── Test 45: snapshot failure triggers rollback behavior ───────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  // Force applyMutationPlan itself to fail after the snapshot was taken,
  // so convertToPlayableDerived's catch branch must attempt a restore.
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated mutation failure'); };
  try {
    const result = await convertToPlayableDerived(actor);
    assert.equal(result.success, false);
    assert.match(result.error, /simulated mutation failure/);
    // Actor must be unchanged — still stock mode, since the snapshot restore ran.
    assert.equal(resolveDroidCalculationMode(actor).mode, DROID_CALCULATION_MODE.STOCK_STATBLOCK);
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
  }
}

// ── Reconciliation: inspection classification (real classifier + real actor shape) ──
{
  installFoundryShimGlobals();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor); // reconciliation requires playable-derived mode
  const inspection = await inspectReconciliation(actor);
  assert.equal(inspection.canApply, true);
  const sensor = inspection.candidates.find(c => c.canonicalId === 'improved-sensor-package');
  assert.ok(sensor, 'sensor candidate present');
  assert.equal(sensor.classification, 'canonical-match');
  assert.equal(sensor.selectedByDefault, true);
  const descriptive = inspection.candidates.find(c => c.sourcePaths?.[0]?.includes('accessories'));
  assert.ok(descriptive, 'descriptive-only accessory candidate present');
  assert.equal(descriptive.classification, 'descriptive-only');
  assert.equal(descriptive.selectedByDefault, false);
}

// ── Test 25/29/30/31: conversion with explicit reconciliation; ledger/projection/items restored on rollback ──
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor);
  const built = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  assert.equal(built.success, true);
  assert.deepEqual(built.applied.map(a => a.canonicalId), ['improved-sensor-package']);

  const applied = await applyReconciliation(actor, built);
  assert.equal(applied.success, true);
  assert.ok(actor.system.installedSystems['improved-sensor-package'], 'ledger entry created');
  assert.equal(actor.system.installedSystems['improved-sensor-package'].provenance.origin, 'stock-import');
  assert.equal(actor.system.installedSystems['improved-sensor-package'].mechanicalState.applyModifiers, true);
  // droidSystems projection already contained this entry since import time —
  // reconciliation only adds the missing ledger entry, it never needed to
  // touch droidSystems (see the service's own doc comment).
  assert.ok(actor.system.droidSystems.sensors.some(s => s.id === 'improved-sensor-package'));

  const rolledBack = await rollbackReconciliation(actor);
  assert.equal(rolledBack.success, true);
  assert.equal(actor.system.installedSystems['improved-sensor-package'], undefined, 'ledger entry reverted');
  assert.equal(typeof actor.flags.swse.stockDroidReconciliation.rolledBackAt, 'number');
}

// ── Test 27: repeated reconciliation is idempotent ─────────────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor);
  const built1 = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  await applyReconciliation(actor, built1);

  const built2 = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  // Already-installed candidate is no longer offered as auto-applicable.
  assert.equal(built2.success, false);
  assert.match(built2.error, /No selected candidate/);
}

// ── Test 28: failed reconciliation rolls back ──────────────────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture();
  await convertToPlayableDerived(actor);
  const built = await buildReconciliationPlan(actor, [], { selectDefaults: true });

  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated reconciliation failure'); };
  try {
    const result = await applyReconciliation(actor, built);
    assert.equal(result.success, false);
    assert.equal(actor.system.installedSystems['improved-sensor-package'], undefined, 'no partial mutation after rollback');
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
  }
}

// ── Test 26: ambiguous candidate cannot be auto-applied ────────────────────
{
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const actor = stockDroidFixture({
    system: {
      droidSystems: {
        sensors: [],
        accessories: [{ name: 'processor', sourceText: 'processor' }] // fuzzy-matches multiple canonical processor parts
      }
    },
    flags: {
      swse: {
        stockDroidImport: {
          schemaVersion: 2, sourceId: 'x', sourceName: 'Ambiguous Test Droid', importMode: 'statblock', importedAt: 1,
          publishedTotals: { droidSystems: { sensors: [], accessories: [{ name: 'processor', sourceText: 'processor' }] } }
        }
      }
    }
  });
  await convertToPlayableDerived(actor);
  const inspection = await inspectReconciliation(actor);
  const ambiguous = inspection.candidates.find(c => c.classification === 'ambiguous-match');
  assert.ok(ambiguous, 'ambiguous candidate detected');
  assert.equal(ambiguous.selectedByDefault, false);
  const built = await buildReconciliationPlan(actor, [ambiguous.canonicalId ?? 'processor'], {});
  assert.notEqual(built.success, true, 'ambiguous match cannot be force-applied by canonical id it does not have');
}

// ── Permissions: 34 GM, 35 owner, 37 nonowner, 38 direct invocation enforces permission ──
{
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture({ isOwner: false });
  await convertToPlayableDerived(actor); // owner:false but convert called directly bypassing sheet gating in this test setup
}
{
  // Nonowner, non-GM: applyReconciliation must reject even with a
  // perfectly valid plan (built is permission-agnostic; enforcement is
  // applyReconciliation's own job — test 38: direct invocation enforces it).
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const ownerActor = stockDroidFixture({ isOwner: true });
  await convertToPlayableDerived(ownerActor);
  const built = await buildReconciliationPlan(ownerActor, [], { selectDefaults: true });

  const nonownerActor = { ...ownerActor, isOwner: false };
  const result = await applyReconciliation(nonownerActor, built);
  assert.equal(result.success, false);
  assert.match(result.error, /Only the GM or an owner/);
}
{
  // GM may reconcile even without ownership.
  installFoundryShimGlobals({ game: { user: { isGM: true } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture({ isOwner: false });
  await convertToPlayableDerived(actor);
  const built = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  const result = await applyReconciliation(actor, built);
  assert.equal(result.success, true);
}
{
  // Owner may reconcile without being GM.
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture({ isOwner: true });
  await convertToPlayableDerived(actor);
  const built = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  const result = await applyReconciliation(actor, built);
  assert.equal(result.success, true);
}

resetFoundryShimGlobals();
console.log('Phase 4 Foundry-shim service tests passed.');
