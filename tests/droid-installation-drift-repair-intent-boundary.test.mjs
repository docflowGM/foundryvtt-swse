import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { createFakeDroidActor } from './helpers/foundry-shim/fakes/actor-factory.mjs';
import { resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// P1-6 — Harden Droid Installation Drift Repair.
//
// Prior to this fix, DroidInstallationReconciler.repairDroidInstallationDrift()
// accepted a caller-held array of issue objects, each carrying
// authoritative embedded Item ids, and deleted exactly those ids with no
// verification that they belonged to the target Actor, were still
// diagnosed as drift, or were produced by a fresh diagnosis at all —
// turning the repair boundary into a potentially arbitrary embedded-Item
// deletion endpoint. repairDroidInstallationDrift() now takes repair
// INTENT ({actorId, selectedIssueIds, inspectionRevision}) instead,
// rereads the actor's current installation state, reruns diagnosis, and
// derives every deleted Item id itself.
//
// Coverage tiers:
//   Tests 1-10: (a) direct production-path — pure
//   buildDroidDriftIssueId()/buildDroidInstallationDriftRevision()/
//   normalizeDriftRepairIntent()/validateDriftRepairSelection()/
//   deriveRepairItemIds() modules, zero Foundry dependency (deriveRepairItemIds
//   takes a plain actor-like object with an `.items` array, no Foundry
//   surface needed).
//   Tests 11+: (a) direct production-path — the REAL production
//   inspectDroidInstallationDrift()/repairDroidInstallationDrift()
//   executing through the Foundry-shim harness (only ActorEngine is
//   faked; see fakes/actor-engine.fake.mjs's doc comment). This is the
//   trust boundary the review named explicitly — source-regex tests
//   alone are not sufficient.
//   Final test: (c) structural — droid-authority-diagnostics.js's console
//   usage-doc comment submits intent, not raw driftIssues entries (the
//   file cannot load in this Node shim harness — it imports
//   hydrateDroidPart()/resolveInstalledDroidComponents() through a chain
//   that ultimately needs more Foundry surface than this shim provides
//   for a full diagnoseDroidAuthority() run).

registerFoundryPathLoader();

const {
  buildDroidDriftIssueId,
  normalizeDriftRepairIntent,
  validateDriftRepairSelection,
  deriveRepairItemIds,
  diagnoseDroidInstallationDrift,
  DROID_INSTALLATION_DRIFT_ISSUE
} = await import('../scripts/domain/droids/droid-installation-reconciler.js');
const { buildDroidInstallationDriftRevision } = await import('../scripts/domain/droids/droid-installation-drift-revision.js');

// ── Pure module tests ───────────────────────────────────────────────────────

// 1. buildDroidDriftIssueId is deterministic and derived from issue
// type + canonical id, never from itemIds.
{
  const issueA = { code: DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM, canonicalId: 'improved-sensor-package', itemIds: ['item-1'] };
  const issueB = { code: DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM, canonicalId: 'improved-sensor-package', itemIds: ['item-2', 'item-3'] };
  assert.equal(buildDroidDriftIssueId(issueA), buildDroidDriftIssueId(issueB), 'issue id must not depend on itemIds');
  assert.equal(buildDroidDriftIssueId(issueA), 'orphaned-embedded-item:improved-sensor-package');
}

// 2. buildDroidDriftIssueId varies by canonical id.
{
  const a = buildDroidDriftIssueId({ code: DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM, canonicalId: 'improved-sensor-package' });
  const b = buildDroidDriftIssueId({ code: DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM, canonicalId: 'heuristic-processor' });
  assert.notEqual(a, b);
}

// 3. normalizeDriftRepairIntent trims/dedupes selectedIssueIds and
// rejects blank entries.
{
  const normalized = normalizeDriftRepairIntent({
    actorId: '  droid-1  ',
    selectedIssueIds: ['  a:b  ', 'a:b', '', '   ', 'c:d'],
    inspectionRevision: '  rev1  '
  });
  assert.equal(normalized.actorId, 'droid-1');
  assert.deepEqual(normalized.selectedIssueIds, ['a:b', 'c:d']);
  assert.equal(normalized.inspectionRevision, 'rev1');
}

// 4. normalizeDriftRepairIntent fails closed on malformed input (not an
// object, missing fields) rather than throwing.
{
  assert.deepEqual(normalizeDriftRepairIntent(null), { actorId: '', selectedIssueIds: [], inspectionRevision: '' });
  assert.deepEqual(normalizeDriftRepairIntent(undefined), { actorId: '', selectedIssueIds: [], inspectionRevision: '' });
  assert.deepEqual(normalizeDriftRepairIntent({ selectedIssueIds: 'not-an-array' }), { actorId: '', selectedIssueIds: [], inspectionRevision: '' });
}

// 5. validateDriftRepairSelection: empty selection rejected.
{
  const result = validateDriftRepairSelection([], new Map());
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_INVALID_SELECTION');
}

// 6. validateDriftRepairSelection: unknown issue id rejected.
{
  const issuesById = new Map([['orphaned-embedded-item:improved-sensor-package', { canonicalId: 'improved-sensor-package', itemIds: ['x'] }]]);
  const result = validateDriftRepairSelection(['orphaned-embedded-item:not-a-real-part'], issuesById);
  assert.equal(result.success, false);
  assert.match(result.error, /not one of this droid's current repairable drift issues/);
}

// 7. validateDriftRepairSelection: a known, present issue id succeeds.
{
  const issue = { canonicalId: 'improved-sensor-package', itemIds: ['x'] };
  const issuesById = new Map([['orphaned-embedded-item:improved-sensor-package', issue]]);
  const result = validateDriftRepairSelection(['orphaned-embedded-item:improved-sensor-package'], issuesById);
  assert.equal(result.success, true);
  assert.deepEqual(result.validated, [{ issueId: 'orphaned-embedded-item:improved-sensor-package', issue }]);
}

// 8. deriveRepairItemIds only returns ids that currently exist on the
// actor AND whose own resolved canonical id matches the issue.
{
  const issue = { canonicalId: 'improved-sensor-package', itemIds: ['item-real', 'item-fabricated', 'item-wrong-part'] };
  const actorLike = {
    items: [
      { id: 'item-real', system: { droidPartId: 'improved-sensor-package' } },
      { id: 'item-wrong-part', system: { droidPartId: 'heuristic-processor' } }
      // 'item-fabricated' does not exist on this actor at all.
    ]
  };
  const verified = deriveRepairItemIds(issue, actorLike);
  assert.deepEqual(verified, ['item-real'], 'only the Item that actually exists AND matches the issue\'s canonical id survives');
}

// 9. buildDroidInstallationDriftRevision is deterministic and changes
// when installedSystems/droidSystems/issue ids change; does not change
// for unrelated volatile fields.
{
  function actorLike(overrides = {}) {
    return {
      id: 'droid-1',
      type: 'droid',
      system: { droidCalculationMode: 'playable-derived', installedSystems: {}, droidSystems: {}, ...overrides.system },
      items: overrides.items ?? [],
      flags: overrides.flags ?? {}
    };
  }
  const resolution = { components: [] };
  const noIssues = { issues: [] };
  const withIssue = { issues: [{ code: DROID_INSTALLATION_DRIFT_ISSUE.ORPHANED_ACTIVE_ITEM, canonicalId: 'improved-sensor-package' }] };

  const a = buildDroidInstallationDriftRevision(actorLike(), resolution, noIssues, buildDroidDriftIssueId);
  const b = buildDroidInstallationDriftRevision(actorLike(), resolution, noIssues, buildDroidDriftIssueId);
  assert.equal(a, b, 'identical state must produce identical fingerprint');

  const withInstalled = buildDroidInstallationDriftRevision(
    actorLike({ system: { installedSystems: { 'improved-sensor-package': { id: 'improved-sensor-package' } } } }),
    resolution, noIssues, buildDroidDriftIssueId
  );
  assert.notEqual(a, withInstalled, 'installedSystems change must alter the fingerprint');

  const withDroidSystems = buildDroidInstallationDriftRevision(
    actorLike({ system: { droidSystems: { sensors: [{ id: 'x' }] } } }),
    resolution, noIssues, buildDroidDriftIssueId
  );
  assert.notEqual(a, withDroidSystems, 'droidSystems change must alter the fingerprint');

  const withIssueRevision = buildDroidInstallationDriftRevision(actorLike(), resolution, withIssue, buildDroidDriftIssueId);
  assert.notEqual(a, withIssueRevision, 'a newly diagnosed issue must alter the fingerprint');

  const volatileChanged = buildDroidInstallationDriftRevision(
    actorLike({ system: { hp: { value: 1 }, tokenPosition: { x: 99 } } }),
    resolution, noIssues, buildDroidDriftIssueId
  );
  assert.equal(a, volatileChanged, 'volatile fields (HP, token position) must not alter the fingerprint');
}

// 10. diagnoseDroidInstallationDrift itself is unaffected by this pass
// (already covered exhaustively in tests/droid-installation-reconciler.test.mjs);
// spot-check its output still matches the shape buildDroidDriftIssueId expects.
{
  const resolution = { components: [{ canonicalId: 'improved-sensor-package', sources: [{ kind: 'embeddedItem', itemId: 'item-1', active: true }] }] };
  const { issues } = diagnoseDroidInstallationDrift(resolution);
  assert.equal(issues.length, 1);
  assert.equal(buildDroidDriftIssueId(issues[0]), 'orphaned-embedded-item:improved-sensor-package');
}

// ── Production-path: real service through the Foundry shim ─────────────────

const { inspectDroidInstallationDrift, repairDroidInstallationDrift } = await import(
  '/systems/foundryvtt-swse/scripts/domain/droids/droid-installation-reconciler.js'
);

function driftDroidFixture(overrides = {}) {
  return createFakeDroidActor({
    system: {
      droidCalculationMode: 'playable-derived',
      installedSystems: {},
      droidSystems: {},
      ...overrides.system
    },
    items: overrides.items ?? [
      { id: 'orphan-item-1', _id: 'orphan-item-1', name: 'Stray Sensor', type: 'equipment', system: { droidPartId: 'improved-sensor-package' } }
    ],
    flags: overrides.flags,
    isOwner: overrides.isOwner ?? true,
    id: overrides.id,
    name: overrides.name
  });
}

async function readyDroid(overrides = {}) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' } } });
  resetFakeActorEngine();
  const actor = driftDroidFixture(overrides);
  if (typeof game?.actors?.set === 'function') game.actors.set(actor.id, actor);
  return actor;
}

async function intentFor(actor, selectedIssueIds) {
  const inspection = inspectDroidInstallationDrift(actor);
  return { actorId: actor.id, selectedIssueIds, inspectionRevision: inspection.inspectionRevision };
}

// 11. inspectDroidInstallationDrift never exposes embedded Item ids in
// the public view model.
{
  const actor = await readyDroid();
  const inspection = inspectDroidInstallationDrift(actor);
  assert.equal(inspection.issues.length, 1);
  const issue = inspection.issues[0];
  assert.equal(issue.issueId, 'orphaned-embedded-item:improved-sensor-package');
  assert.equal(issue.canonicalId, 'improved-sensor-package');
  assert.equal(issue.repairable, true);
  assert.ok(!('itemIds' in issue), 'public issue view model must never expose embedded Item ids');
  assert.ok(!('itemId' in issue));
}

// 12. Valid repair intent succeeds and deletes exactly the orphaned Item.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.appliedIssueIds, ['orphaned-embedded-item:improved-sensor-package']);
  assert.deepEqual(result.deletedItemIds, ['orphan-item-1']);
  assert.deepEqual(result.repairedCanonicalIds, ['improved-sensor-package']);
  assert.equal(actor.items.find(i => i.id === 'orphan-item-1'), undefined, 'the orphaned Item must actually be deleted');
}

// 13. Missing actorId rejected.
{
  const actor = await readyDroid();
  const inspection = inspectDroidInstallationDrift(actor);
  const result = await repairDroidInstallationDrift(actor, { selectedIssueIds: ['orphaned-embedded-item:improved-sensor-package'], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_ACTOR_MISMATCH');
}

// 14. Actor ID mismatch — intent for Droid A cannot apply to Droid B.
{
  const actorA = await readyDroid({ id: 'droid-a' });
  const actorB = await readyDroid({ id: 'droid-b' });
  const intentForA = await intentFor(actorA, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actorB, intentForA);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_ACTOR_MISMATCH');
  assert.ok(actorB.items.some(i => i.id === 'orphan-item-1'), 'Droid B must not be mutated by Droid A\'s intent');
}

// 15. Non-droid Actor rejected.
{
  const actor = await readyDroid();
  actor.type = 'character';
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_WRONG_ACTOR_TYPE');
}

// 16. Insufficient permission rejected even with an otherwise valid intent.
{
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const actor = driftDroidFixture({ isOwner: false });
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_PERMISSION_DENIED');
}

// 17. GM may repair even without ownership; owner may repair without GM.
{
  installFoundryShimGlobals({ game: { user: { isGM: true } } });
  resetFakeActorEngine();
  const actor = driftDroidFixture({ isOwner: false });
  if (typeof game?.actors?.set === 'function') game.actors.set(actor.id, actor);
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
}
{
  installFoundryShimGlobals({ game: { user: { isGM: false } } });
  resetFakeActorEngine();
  const actor = driftDroidFixture({ isOwner: true });
  if (typeof game?.actors?.set === 'function') game.actors.set(actor.id, actor);
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
}

// 18. Calculation mode changed after inspection is rejected as stale
// (mode is part of the revision fingerprint — this repair path is
// otherwise mode-agnostic, matching the original unrestricted scope).
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.system.droidCalculationMode = 'stock-statblock';
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
}

// 19. installedSystems changed after inspection is stale.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.system.installedSystems['unrelated-part'] = { id: 'unrelated-part' };
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
  assert.match(result.error, /Refresh the drift report before applying repairs/);
  assert.ok(actor.items.some(i => i.id === 'orphan-item-1'), 'nothing must be deleted on a stale reject');
}

// 20. droidSystems projection changed after inspection is stale.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.system.droidSystems.sensors = [{ id: 'improved-sensor-package' }];
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
}

// 21. Embedded droid-part Items changed after inspection are stale.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.items.push({ id: 'orphan-item-2', _id: 'orphan-item-2', name: 'Second Stray', system: { droidPartId: 'heuristic-processor' } });
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
}

// 22. Duplicate selected issue ids are deduplicated, not double-applied.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package', 'orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.appliedIssueIds, ['orphaned-embedded-item:improved-sensor-package']);
  assert.deepEqual(result.deletedItemIds, ['orphan-item-1']);
}

// 23. Unknown issue id is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:totally-fabricated-part']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_INVALID_SELECTION');
}

// 24. An already-resolved issue (e.g. a second repair attempt after the
// first succeeded) is rejected rather than silently re-deleting nothing.
{
  const actor = await readyDroid();
  const intent1 = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const first = await repairDroidInstallationDrift(actor, intent1);
  assert.equal(first.success, true);
  const intent2 = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']); // fresh revision, issue no longer present
  const second = await repairDroidInstallationDrift(actor, intent2);
  assert.equal(second.success, false);
  assert.equal(second.code, 'DRIFT_REPAIR_INVALID_SELECTION');
}

// 25. Caller-supplied itemIds is rejected outright (old-API shape).
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, itemIds: ['orphan-item-1'] });
  assert.equal(result.success, false);
  assert.match(result.error, /Caller-supplied drift-repair Item IDs and mutation plans are no longer accepted/);
  assert.ok(actor.items.some(i => i.id === 'orphan-item-1'));
}

// 26. Caller-supplied embeddedItemIds is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, embeddedItemIds: ['orphan-item-1'] });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 27. Caller-supplied Item UUIDs are rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, itemUuids: ['Actor.droid-1.Item.orphan-item-1'] });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 28. Caller-supplied mutation plan is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, mutationPlan: { delete: { items: ['orphan-item-1'] } } });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 29. Caller-supplied delete bucket is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, delete: { items: ['orphan-item-1'] } });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 30. Caller-supplied installedSystems is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, installedSystems: { 'forged-part': { id: 'forged-part' } } });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 31. Caller-supplied droidSystems is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, { ...intent, droidSystems: { sensors: [{ id: 'forged-sensor' }] } });
  assert.equal(result.success, false);
  assert.match(result.error, /no longer accepted/);
}

// 32. An arbitrary non-droid-part Item on the SAME actor cannot be
// deleted merely because a forged issue id/itemId association is
// attempted — deriveRepairItemIds only trusts itemIds that appear on the
// FRESH diagnosis, and the public contract only accepts issue ids, never
// raw item ids, so there is no path for a caller to name an arbitrary
// Item at all. This test proves the unrelated Item survives an ordinary,
// valid repair of a different issue.
{
  const actor = await readyDroid({
    items: [
      { id: 'orphan-item-1', _id: 'orphan-item-1', name: 'Stray Sensor', system: { droidPartId: 'improved-sensor-package' } },
      { id: 'unrelated-weapon', _id: 'unrelated-weapon', name: 'Ordinary Blaster', type: 'weapon', system: {} }
    ]
  });
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.deletedItemIds, ['orphan-item-1']);
  assert.ok(actor.items.some(i => i.id === 'unrelated-weapon'), 'an unrelated, non-droid-part Item must never be deleted');
}

// 33. An Item belonging to another Actor cannot be deleted: repairing
// Droid A's issue only ever touches Droid A's own items array. Both
// actors must coexist in game.actors for this test, so they are built
// and registered directly rather than via readyDroid() twice (which
// would reset the shim's game.actors map between calls).
{
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' } } });
  resetFakeActorEngine();
  const actorA = driftDroidFixture({ id: 'droid-a' });
  const actorB = driftDroidFixture({ id: 'droid-b' });
  game.actors.set(actorA.id, actorA);
  game.actors.set(actorB.id, actorB);
  const intentA = await intentFor(actorA, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actorA, intentA);
  assert.equal(result.success, true);
  assert.ok(actorB.items.some(i => i.id === 'orphan-item-1'), 'Droid B\'s own identically-configured Item must be untouched by Droid A\'s repair');
}

// 34. Unselected issues remain unchanged when multiple issues exist.
{
  const actor = await readyDroid({
    items: [
      { id: 'orphan-item-1', _id: 'orphan-item-1', name: 'Stray Sensor', system: { droidPartId: 'improved-sensor-package' } },
      { id: 'orphan-item-2', _id: 'orphan-item-2', name: 'Stray Processor', system: { droidPartId: 'heuristic-processor' } }
    ]
  });
  const inspection = inspectDroidInstallationDrift(actor);
  assert.equal(inspection.issues.length, 2);
  const intent = { actorId: actor.id, selectedIssueIds: ['orphaned-embedded-item:improved-sensor-package'], inspectionRevision: inspection.inspectionRevision };
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
  assert.deepEqual(result.deletedItemIds, ['orphan-item-1']);
  assert.ok(actor.items.some(i => i.id === 'orphan-item-2'), 'the unselected issue\'s Item must remain');
}

// 35. Concurrent Garage installation (adding a ledger entry) causes
// stale rejection.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.system.installedSystems['some-other-part'] = { id: 'some-other-part', provenance: { origin: 'garage' } };
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
}

// 36. Concurrent Garage removal (an embedded Item disappearing) causes
// stale rejection rather than proceeding against a now-inaccurate plan.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  actor.items.length = 0; // simulate the orphaned Item having been removed by other means
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_STALE');
}

// 37. Repair rereads the Actor from game.actors immediately before
// mutating, and rejects if the Actor is no longer present in the world.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  game.actors.delete(actor.id);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_ACTOR_MISMATCH');
  assert.match(result.error, /no longer present in the world/);
}

// 38. Successful repair produces a new revision, and repeating the same
// (now-stale) intent a second time is rejected.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const result = await repairDroidInstallationDrift(actor, intent);
  assert.equal(result.success, true);
  assert.equal(result.previousRevision, intent.inspectionRevision);
  assert.notEqual(result.resultingRevision, result.previousRevision);

  const replay = await repairDroidInstallationDrift(actor, intent);
  assert.equal(replay.success, false);
  assert.equal(replay.code, 'DRIFT_REPAIR_STALE');
}

// 39. Empty selection is rejected per documented policy, not treated as
// a silent no-op success.
{
  const actor = await readyDroid();
  const inspection = inspectDroidInstallationDrift(actor);
  const result = await repairDroidInstallationDrift(actor, { actorId: actor.id, selectedIssueIds: [], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_INVALID_SELECTION');
}

// 40. A droid with no drift issues at all reports a true no-op only when
// there is genuinely nothing selected to apply — here, selecting an
// unknown id is still rejected as invalid selection, not reported as a
// no-op success (the noOp:true shape is reserved for a validated
// selection that resolves to zero derived deletions, which cannot happen
// for the one issue type this repair strategy currently supports).
{
  const actor = await readyDroid({ items: [] });
  const inspection = inspectDroidInstallationDrift(actor);
  assert.equal(inspection.issues.length, 0);
  const result = await repairDroidInstallationDrift(actor, { actorId: actor.id, selectedIssueIds: ['orphaned-embedded-item:improved-sensor-package'], inspectionRevision: inspection.inspectionRevision });
  assert.equal(result.success, false);
  assert.equal(result.code, 'DRIFT_REPAIR_INVALID_SELECTION');
}

// 41. Mutation failure is surfaced honestly (not silently swallowed as
// success), and the actor is rolled back to its pre-apply state.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated drift-repair mutation failure'); };
  try {
    const result = await repairDroidInstallationDrift(actor, intent);
    assert.equal(result.success, false);
    assert.equal(result.code, 'DRIFT_REPAIR_APPLY_FAILED');
    assert.ok(actor.items.some(i => i.id === 'orphan-item-1'), 'the Item must not be gone after a failed, rolled-back mutation');
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
  }
}

// 42. A rollback failure after a mutation failure is ALSO surfaced
// honestly — never reported as a generic/silent success.
{
  const actor = await readyDroid();
  const intent = await intentFor(actor, ['orphaned-embedded-item:improved-sensor-package']);
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
  const originalApply = ActorEngine.applyMutationPlan;
  const originalRestore = SnapshotManager.restoreSnapshotExact;
  ActorEngine.applyMutationPlan = async () => { throw new Error('simulated drift-repair mutation failure'); };
  SnapshotManager.restoreSnapshotExact = async () => { throw new Error('simulated rollback failure'); };
  try {
    const result = await repairDroidInstallationDrift(actor, intent);
    assert.equal(result.success, false);
    assert.equal(result.code, 'DRIFT_REPAIR_ROLLBACK_FAILED');
    assert.match(result.error, /rollback failed/);
  } finally {
    ActorEngine.applyMutationPlan = originalApply;
    SnapshotManager.restoreSnapshotExact = originalRestore;
  }
}

// 43. ActorEngine is the sole mutation authority — the repair path never
// calls actor.deleteEmbeddedDocuments()/item.delete() directly.
{
  const source = await readFile(new URL('../scripts/domain/droids/droid-installation-reconciler.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bactor\.deleteEmbeddedDocuments\s*\(/);
  assert.doesNotMatch(source, /\bitem\.delete\s*\(/);
  assert.match(source, /ActorEngine\.applyMutationPlan\(/);
}

resetFoundryShimGlobals();

// 44. UI/dev-console usage doc submits intent, not raw driftIssues
// entries or Item ids (structural — droid-authority-diagnostics.js
// cannot load in this Node shim harness).
{
  const source = await readFile(new URL('../scripts/debug/droid-authority-diagnostics.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /repairDroidInstallationDrift\(actor,\s*\[report\.driftIssues/, 'the console usage example must no longer submit raw driftIssues entries');
  assert.match(source, /selectedIssueIds:\s*\[inspection\.issues\[0\]\.issueId\]/, 'the console usage example must submit an issueId, not an Item id');
  assert.match(source, /inspectionRevision:\s*inspection\.inspectionRevision/);
}

console.log('Droid installation drift-repair intent-boundary (P1-6) tests passed.');
