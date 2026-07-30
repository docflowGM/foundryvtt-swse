import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { createFakeDroidActor } from './helpers/foundry-shim/fakes/actor-factory.mjs';
import { resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// P1-5 — Harden Converted Droid Reconciliation Apply Boundary.
//
// Prior to this fix, DroidConvertedSystemReconciliationService.applyReconciliation()
// accepted a caller-held mutation plan (the result of buildReconciliationPlan())
// with no verification that it belonged to the target Actor, reflected
// current ledger state, was unmodified, or was actually produced by this
// service. applyReconciliation() now takes reconciliation INTENT
// ({actorId, selectedCanonicalIds, inspectionRevision}) instead, rereads
// the actor's current state, and rebuilds the plan itself.
//
// Coverage tiers:
//   Tests 1-8: (a) direct production-path — pure fingerprint/validation
//   modules, zero Foundry dependency.
//   Tests 9-30: (a) direct production-path — the REAL production
//   applyReconciliation()/inspectReconciliation()/buildReconciliationPlan()
//   executing through the Foundry-shim harness (only ActorEngine is
//   faked; see fakes/actor-engine.fake.mjs's doc comment). This is the
//   trust boundary the review named explicitly — source-regex tests alone
//   would not prove it.
//   Test 31: (c) structural — character-sheet.js's caller submits intent,
//   not a plan (the sheet integration itself cannot load in this Node
//   shim harness; see docs/audits/droid-stock-statblock-authority-phase-3.md's
//   Foundry-shim harness section).

// droid-reconciliation-revision.js imports resolveDroidCalculationMode via
// an absolute "/systems/foundryvtt-swse/..." specifier, so the path loader
// must be registered before it (or anything importing it) is loaded —
// even for this "pure" module's own standalone tests below.
registerFoundryPathLoader();

const {
  buildDroidReconciliationRevision
} = await import('../scripts/domain/droids/droid-reconciliation-revision.js');
const {
  validateReconciliationSelection,
  RECONCILIATION_CLASSIFICATION
} = await import('../scripts/domain/droids/droid-converted-system-reconciliation-classifier.js');

// ── Pure module: buildDroidReconciliationRevision ───────────────────────────

function baseActorLike(overrides = {}) {
  return {
    id: 'droid-1',
    type: 'droid',
    system: {
      droidCalculationMode: 'playable-derived',
      installedSystems: {},
      droidSystems: {},
      ...overrides.system
    },
    flags: { swse: {}, ...overrides.flags },
    items: overrides.items ?? [],
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
}

// 1. Deterministic: identical state produces identical fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike();
  assert.equal(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 2. installedSystems change alters the fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike({ system: { installedSystems: { 'improved-sensor-package': { id: 'improved-sensor-package' } } } });
  assert.notEqual(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 3. droidSystems projection change alters the fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike({ system: { droidSystems: { sensors: [{ id: 'x' }] } } });
  assert.notEqual(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 4. Embedded droid-part Item identity change alters the fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike({ items: [{ id: 'w1', flags: { swse: { stockDroidAttack: { sourceStatblock: true } } } }] });
  assert.notEqual(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 5. Calculation-mode change alters the fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike({ system: { droidCalculationMode: 'stock-statblock' } });
  assert.notEqual(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 6. Reconciliation-metadata change alters the fingerprint (drives the
// "same stale intent rejected twice" / "resulting revision differs after
// success" behavior).
{
  const a = baseActorLike();
  const b = baseActorLike({ flags: { swse: { stockDroidReconciliation: { reconciledAt: 1000, reconciledIds: ['x'] } } } });
  assert.notEqual(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 7. Volatile fields (HP, token position, chat/window state) are excluded
// — a change there must NOT alter the fingerprint.
{
  const a = baseActorLike();
  const b = baseActorLike({ system: { hp: { value: 1 }, tokenPosition: { x: 500, y: 900 } } });
  assert.equal(buildDroidReconciliationRevision(a), buildDroidReconciliationRevision(b));
}

// 8. validateReconciliationSelection: empty, unknown, blocked,
// already-installed, and duplicate handling.
{
  const candidates = [
    { canonicalId: 'improved-sensor-package', classification: RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH, alreadyInstalled: false },
    { canonicalId: 'already-there', classification: RECONCILIATION_CLASSIFICATION.CANONICAL_MATCH, alreadyInstalled: true },
    { canonicalId: 'fuzzy-thing', classification: RECONCILIATION_CLASSIFICATION.AMBIGUOUS_MATCH, alreadyInstalled: false }
  ];

  const empty = validateReconciliationSelection([], candidates);
  assert.equal(empty.success, false);
  assert.equal(empty.code, 'RECONCILIATION_INVALID_SELECTION');

  const unknown = validateReconciliationSelection(['not-a-real-part'], candidates);
  assert.equal(unknown.success, false);
  assert.match(unknown.error, /not one of this droid's current reconciliation candidates/);

  const alreadyInstalled = validateReconciliationSelection(['already-there'], candidates);
  assert.equal(alreadyInstalled.success, false);
  assert.match(alreadyInstalled.error, /already installed or reconciled/);

  const blocked = validateReconciliationSelection(['fuzzy-thing'], candidates);
  assert.equal(blocked.success, false);
  assert.match(blocked.error, /requires manual resolution/);

  const emptyId = validateReconciliationSelection(['   '], candidates);
  assert.equal(emptyId.success, false);
  assert.match(emptyId.error, /empty or invalid/);

  const deduped = validateReconciliationSelection(['improved-sensor-package', 'improved-sensor-package', 'IMPROVED-SENSOR-PACKAGE'], candidates);
  assert.equal(deduped.success, true);
  assert.deepEqual(deduped.canonicalIds, ['improved-sensor-package']);
}

// ── Production-path: real service through the Foundry shim ─────────────────

const { convertToPlayableDerived } = await import(
  '/systems/foundryvtt-swse/scripts/domain/droids/droid-statblock-conversion-service.js'
);
const { inspectReconciliation, applyReconciliation, buildReconciliationPlan } = await import(
  '/systems/foundryvtt-swse/scripts/domain/droids/droid-converted-system-reconciliation-service.js'
);

function stockDroidFixture(overrides = {}) {
  return createFakeDroidActor({
    system: {
      droidCalculationMode: 'stock-statblock',
      bab: 4,
      defenses: { fortitude: { total: 15 }, reflex: { total: 13 }, will: { total: 12 }, flatFooted: { total: 11 } },
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
    items: overrides.items ?? [],
    isOwner: overrides.isOwner ?? true,
    id: overrides.id,
    name: overrides.name
  });
}

async function readyDroid(overrides = {}) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture(overrides);
  await convertToPlayableDerived(actor);
  return actor;
}

async function intentFor(actor, selectedCanonicalIds) {
  const inspection = await inspectReconciliation(actor);
  return { actorId: actor.id, selectedCanonicalIds, inspectionRevision: inspection.inspectionRevision };
}

// 9. Valid intent applies successfully.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.appliedCanonicalIds, ['improved-sensor-package']);
  assert.ok(actor.system.installedSystems['improved-sensor-package']);
}

// 10. Missing actorId rejected.
{
  const actor = await readyDroid();
  const inspection = await inspectReconciliation(actor);
  const result = await applyReconciliation(actor, { selectedCanonicalIds: ['improved-sensor-package'], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_ACTOR_MISMATCH');
}

// 11. Mismatched actorId rejected — an intent built for Actor A cannot
// apply to Actor B.
{
  const actorA = await readyDroid({ id: 'droid-a' });
  const actorB = await readyDroid({ id: 'droid-b' });
  const intentForA = await intentFor(actorA, ['improved-sensor-package']);
  const result = await applyReconciliation(actorB, intentForA);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_ACTOR_MISMATCH');
  assert.equal(actorB.system.installedSystems['improved-sensor-package'], undefined, 'Actor B must not be mutated by Actor A\'s intent');
}

// 12. Non-droid actor rejected.
{
  const actor = await readyDroid();
  actor.type = 'character';
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_ACTOR_MISMATCH');
}

// 13. Insufficient permission rejected even with a fully valid intent.
{
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture({ isOwner: false });
  await convertToPlayableDerived(actor);
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_PERMISSION_DENIED');
}

// 14. Wrong/changed calculation mode rejected — a droid still in
// stock-statblock mode (or one that reverted) cannot have reconciliation
// applied even with an otherwise-valid intent shape.
{
  installFoundryShimGlobals({ game: { user: { isGM: true } } });
  resetFakeActorEngine();
  const actor = stockDroidFixture(); // never converted — still stock-statblock
  const result = await applyReconciliation(actor, { actorId: actor.id, selectedCanonicalIds: ['improved-sensor-package'], inspectionRevision: buildDroidReconciliationRevision(actor) });
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_MODE_CHANGED');
}

// 15. Stale inspection rejected — installedSystems changed (a concurrent
// Garage install) after the review was opened, before apply.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  // Simulate a concurrent Garage install landing after inspection.
  actor.system.installedSystems['unrelated-part'] = { id: 'unrelated-part', provenance: { origin: 'garage' } };
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_STALE');
  assert.match(result.error, /Refresh the review before applying changes/);
  assert.equal(actor.system.installedSystems['improved-sensor-package'], undefined, 'nothing must be applied on a stale reject');
}

// 16. Stale inspection rejected — an embedded droid-part Item changed
// (e.g. conversion-neutralization flag flipped) after the review opened.
{
  const actor = await readyDroid({ items: [{ id: 'w1', _id: 'w1', name: 'Blaster', flags: { swse: { stockDroidAttack: { sourceStatblock: true } } } }] });
  // convertToPlayableDerived() (inside readyDroid()) already neutralizes
  // this weapon's sourceStatblock to false, so flip it back to true to
  // produce a genuine post-inspection change.
  const intent = await intentFor(actor, ['improved-sensor-package']);
  assert.equal(actor.items[0].flags.swse.stockDroidAttack.sourceStatblock, false);
  actor.items[0].flags.swse.stockDroidAttack.sourceStatblock = true;
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_STALE');
}

// 17. Stale inspection rejected — a second reconciliation already applied
// since this review was opened.
{
  const actor = await readyDroid();
  const firstIntent = await intentFor(actor, ['improved-sensor-package']);
  const staleIntent = await intentFor(actor, ['improved-sensor-package']); // same revision as firstIntent
  const first = await applyReconciliation(actor, firstIntent);
  assert.equal(first.success, true);
  // staleIntent carries the pre-reconciliation revision; applying it again
  // must now be rejected as stale, not treated as a no-op success.
  const second = await applyReconciliation(actor, staleIntent);
  assert.equal(second.success, false);
  assert.equal(second.code, 'RECONCILIATION_STALE');
}

// 18. Duplicate selected ids are deduped rather than double-applied.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package', 'improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.appliedCanonicalIds, ['improved-sensor-package']);
}

// 19. Unknown/not-in-candidate-set id rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['totally-fabricated-part-id']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_INVALID_SELECTION');
}

// 20. Blocked (ambiguous) candidate rejected even if explicitly selected.
{
  const actor = await readyDroid({
    system: {
      droidSystems: { sensors: [], accessories: [{ name: 'processor', sourceText: 'processor' }] }
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
  const inspection = await inspectReconciliation(actor);
  const ambiguous = inspection.candidates.find(c => c.classification === 'ambiguous-match');
  assert.ok(ambiguous, 'ambiguous candidate detected');
  const result = await applyReconciliation(actor, { actorId: actor.id, selectedCanonicalIds: [ambiguous.canonicalId ?? 'processor'], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_INVALID_SELECTION');
}

// 21. Already-reconciled candidate rejected on a second attempt.
{
  const actor = await readyDroid();
  const intent1 = await intentFor(actor, ['improved-sensor-package']);
  await applyReconciliation(actor, intent1);
  const intent2 = await intentFor(actor, ['improved-sensor-package']); // fresh revision, already-installed candidate
  const result = await applyReconciliation(actor, intent2);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_INVALID_SELECTION');
}

// 22. No-longer-installed (removed) selection rejected — a candidate
// present at inspection time but whose ledger entry was cleared before
// apply (odd but possible mid-session edit) must not be blindly recreated
// from a stale plan; it is caught by the stale-revision check first since
// removing a ledger key also changes the fingerprint.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  actor.system.droidSystems.sensors = []; // remove the source record entirely
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_STALE');
}

// 23. Old-API caller-supplied mutation plan is rejected outright, fail
// closed, rather than applied.
{
  const actor = await readyDroid();
  const built = await buildReconciliationPlan(actor, [], { selectDefaults: true });
  assert.equal(built.success, true);
  const result = await applyReconciliation(actor, built);
  assert.equal(result.success, false);
  assert.match(result.error, /Caller-supplied reconciliation plans are no longer accepted/);
  assert.equal(actor.system.installedSystems['improved-sensor-package'], undefined);
}

// 24. Caller-supplied installedSystems/droidSystems/mutationPlan fields on
// an otherwise well-formed intent are ignored, not honored — only
// actorId/selectedCanonicalIds/inspectionRevision are read.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const forgedIntent = {
    ...intent,
    installedSystems: { 'forged-part': { id: 'forged-part', cost: 0 } },
    droidSystems: { sensors: [{ id: 'forged-sensor' }] }
  };
  const result = await applyReconciliation(actor, forgedIntent);
  assert.equal(result.success, true);
  assert.equal(actor.system.installedSystems['forged-part'], undefined, 'forged installedSystems payload must never be applied');
  assert.deepEqual(result.appliedCanonicalIds, ['improved-sensor-package']);
}

// 25. Unrelated concurrent installs are preserved when the caller
// re-inspects (fresh revision) before applying — the rebuilt plan is
// derived from CURRENT installedSystems, not a stale copy.
{
  const actor = await readyDroid();
  actor.system.installedSystems['concurrent-garage-install'] = { id: 'concurrent-garage-install', provenance: { origin: 'garage' } };
  const intent = await intentFor(actor, ['improved-sensor-package']); // fresh inspection AFTER the concurrent install
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, true);
  assert.ok(actor.system.installedSystems['concurrent-garage-install'], 'unrelated concurrent install must survive reconciliation');
  assert.ok(actor.system.installedSystems['improved-sensor-package']);
}

// 26. Only selected ids change; unselected eligible candidates are left
// untouched.
{
  const actor = await readyDroid({
    system: {
      droidSystems: {
        sensors: [{ id: 'improved-sensor-package', name: 'Improved Sensor Package', sourceText: 'improved sensor package' }],
        weapons: [{ id: 'hidden-compartment', name: 'Hidden Compartment', sourceText: 'hidden compartment' }]
      }
    },
    flags: {
      swse: {
        stockDroidImport: {
          schemaVersion: 2, sourceId: 'test-source', sourceName: 'Test', importMode: 'statblock', importedAt: 1000,
          publishedTotals: {
            droidSystems: {
              sensors: [{ id: 'improved-sensor-package', name: 'Improved Sensor Package', sourceText: 'improved sensor package' }],
              weapons: [{ id: 'hidden-compartment', name: 'Hidden Compartment', sourceText: 'hidden compartment' }]
            }
          }
        }
      }
    }
  });
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, true);
  assert.ok(actor.system.installedSystems['improved-sensor-package']);
  assert.equal(actor.system.installedSystems['hidden-compartment'], undefined, 'unselected eligible candidate must remain unreconciled');
}

// 27. Resulting revision differs from the previous revision after a
// successful apply.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const result = await applyReconciliation(actor, intent);
  assert.equal(result.success, true);
  assert.equal(result.previousRevision, intent.inspectionRevision);
  assert.notEqual(result.resultingRevision, result.previousRevision);
}

// 28. Empty selection is rejected per documented policy, not treated as a
// no-op success.
{
  const actor = await readyDroid();
  const inspection = await inspectReconciliation(actor);
  const result = await applyReconciliation(actor, { actorId: actor.id, selectedCanonicalIds: [], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'RECONCILIATION_INVALID_SELECTION');
}

// 29. Mutation failure is surfaced honestly (not silently swallowed as
// success), and the actor is rolled back to its pre-apply state.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated mutation failure'); };
  try {
    const result = await applyReconciliation(actor, intent);
    assert.equal(result.success, false);
    assert.equal(result.code, 'RECONCILIATION_APPLY_FAILED');
    assert.equal(actor.system.installedSystems['improved-sensor-package'], undefined);
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
  }
}

// 30. A rollback failure after a mutation failure is ALSO surfaced
// honestly — never reported as a generic/silent success.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['improved-sensor-package']);
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
  const originalApply = ActorEngine.applyMutationPlan;
  const originalRestore = SnapshotManager.restoreSnapshotExact;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated mutation failure'); };
  SnapshotManager.restoreSnapshotExact = async () => { throw new Error('simulated rollback failure'); };
  try {
    const result = await applyReconciliation(actor, intent);
    assert.equal(result.success, false);
    assert.equal(result.code, 'RECONCILIATION_ROLLBACK_FAILED');
    assert.match(result.error, /rollback failed/);
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
    SnapshotManager.restoreSnapshot = originalRestore;
  }
}

resetFoundryShimGlobals();

// 31. UI caller migration — character-sheet.js's reconciliation handler
// submits INTENT, never a mutation plan (structural: character-sheet.js
// cannot load in this Node shim harness — see other Phase 3/4 structural
// tests in this suite for the same documented wall).
{
  const source = await readFile(new URL('../scripts/sheets/v2/character-sheet.js', import.meta.url), 'utf8');
  const handlerStart = source.indexOf('async _reconcileDroidSystems(');
  assert.ok(handlerStart !== -1, '_reconcileDroidSystems handler not found');
  const handlerEnd = source.indexOf('\n  }\n', handlerStart);
  const handlerBody = source.slice(handlerStart, handlerEnd);

  assert.doesNotMatch(handlerBody, /buildReconciliationPlan/, 'the sheet must never build a mutation plan itself');
  assert.match(handlerBody, /actorId:\s*this\.actor\.id/, 'the sheet must submit actorId');
  assert.match(handlerBody, /selectedCanonicalIds:/, 'the sheet must submit selectedCanonicalIds');
  assert.match(handlerBody, /inspectionRevision:\s*inspection\.inspectionRevision/, 'the sheet must submit the inspectionRevision it just inspected');
  assert.match(handlerBody, /applyReconciliation\(this\.actor,\s*intent\)/, 'applyReconciliation must be called with the intent object, not a plan');
}

console.log('Droid reconciliation intent-boundary (P1-5) tests passed.');
