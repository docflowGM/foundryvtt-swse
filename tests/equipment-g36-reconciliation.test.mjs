import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// TI4-B G36: GM-only reconciliation of unresolved equipment transactions. Review writes nothing; a GM decision is admitted only when the fresh
// evidence supports it; nothing is replayed, no action is spent or undone, and the original journal evidence is kept with a forensic note.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const C = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
const RI = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-request-identity.js');
const { installCoordinatorHarness, REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const h = installCoordinatorHarness(ActorEngine);
const mkActor = (items) => { items.get = (id) => items.find((i) => i.id === id); const a = { id: 'a', type: 'character', items, system: { size: 'Medium' }, flags: { swse: {} } }; for (const i of items) i.actor = a; return a; };
const weapon = (id) => ({ id, name: 'Blade', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const ready = () => ({ type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' });

/** fenceFailAt: 1 journal-prepared, 2 item-write, 3 action-spend, 4 journal-finalize */
function world({ fenceFailAt = 0 } = {}) {
  RI._resetRequestRegistryForTests();
  const actor = mkActor([weapon('s')]);
  const spends = []; const history = []; const sw = { spendThrows: false, markerThrows: false, fenceFailAt }; let fenceCalls = 0;
  const deps = {
    ...h.deps, isGm: () => true, ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false, currentUserId: () => 'gm-1',
    spendAction: async (_a, type, meta) => { if (sw.spendThrows) throw new Error('spend threw'); spends.push({ type, meta }); history.push({ metadata: meta }); return { allowed: true, committed: true }; },
    spendMarkerPresent: async (_a, id) => { if (sw.markerThrows) throw new Error('marker unreadable'); return history.some((x) => x.metadata?.requestId === id); },
    fence: async () => { fenceCalls += 1; return sw.fenceFailAt === 0 || fenceCalls < sw.fenceFailAt; },
  };
  const entry = (id) => actor.flags.swse.equipmentTxn.entries.find((e) => e.requestId === id);
  return { actor, deps, spends, sw, entry, posture: () => actor.items.get('s').system.weaponPosture };
}
const reconcile = (w, id, opts = {}) => InventoryEngine.reconcileWeaponRequest(w.actor, id, { ...opts, deps: w.deps });

{
  // spend threw and its marker was unreadable: the Items are applied, the spend is unknown -> only compensation is admitted
  const w = world(); w.sw.spendThrows = true; w.sw.markerThrows = true;
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'INDETERMINATE');
  const writes = h.log.actorWrites.length;
  const review = await reconcile(w, first.requestId);
  assert.equal(review.status, 'REVIEW');
  assert.equal(review.evidence.classification, 'APPLIED'); assert.equal(review.evidence.spend, 'unknown');
  assert.deepEqual(review.allowedResolutions, ['compensate']);
  assert.equal(h.log.actorWrites.length, writes, 'a review writes nothing');
  const refused = await reconcile(w, first.requestId, { resolution: 'finalize' });
  assert.equal(refused.status, 'RESOLUTION_NOT_ALLOWED'); assert.equal(w.entry(first.requestId).phase, 'INDETERMINATE');
  w.sw.markerThrows = false; // the spend marker is readable again: absent -> the GM may also waive
  const review2 = await reconcile(w, first.requestId);
  assert.deepEqual(review2.allowedResolutions, ['compensate', 'finalize-without-spend']);
  const done = await reconcile(w, first.requestId, { resolution: 'compensate', note: 'table call: no draw happened' });
  assert.equal(done.status, 'RECONCILED'); assert.equal(done.phaseAfter, 'NOT_APPLIED'); assert.equal(done.resolved, true);
  assert.equal(w.posture(), 'STOWED', 'the owned fields are restored');
  const e = w.entry(first.requestId);
  assert.equal(e.items[0].target['system.weaponPosture'], 'READIED', 'the recorded target is preserved');
  const note = e.notes.find((x) => x?.kind === 'gm-reconcile');
  assert.equal(note.by, 'gm-1'); assert.equal(note.phaseBefore, 'INDETERMINATE'); assert.equal(note.resolution, 'compensate'); assert.equal(note.gmNote, 'table call: no draw happened');
  assert.ok(note.compensation.restoredPaths.length > 0);
  assert.equal(w.spends.length, 0, 'reconciliation never spends');
  // the id is released: drawing again is a new logical action that runs normally
  w.sw.spendThrows = false;
  const again = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.notEqual(again.requestId, first.requestId); assert.equal(again.status, 'COMMITTED'); assert.equal(w.spends.length, 1);
  ok('1: unknown spend -> review only offers compensation; compensation restores fields, keeps evidence, releases the id');
}
{
  // executor fenced before the spend: APPLIED, spend absent. The GM may waive the spend; nothing is paid and a retry replays from the journal
  const w = world({ fenceFailAt: 3 });
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'EXECUTOR_FENCED'); assert.equal(w.entry(first.requestId).phase, 'APPLIED');
  w.sw.fenceFailAt = 0;
  const review = await reconcile(w, first.requestId);
  assert.equal(review.evidence.classification, 'APPLIED'); assert.equal(review.evidence.spend, 'absent');
  const done = await reconcile(w, first.requestId, { resolution: 'finalize-without-spend' });
  assert.equal(done.status, 'RECONCILED'); assert.equal(done.phaseAfter, 'FINALIZED');
  assert.equal(w.entry(first.requestId).spend.state, 'waived'); assert.equal(w.spends.length, 0);
  assert.equal(w.posture(), 'READIED');
  const retry = await C.executeEquipmentIntent(w.actor, { requestId: first.requestId, intent: ready() }, { context: C.GM_LOCAL_CONTEXT }, w.deps);
  assert.equal(retry.status, 'DUPLICATE_REPLAYED'); assert.equal(w.spends.length, 0, 'a retry after reconciliation is never re-executed');
  const again = await reconcile(w, first.requestId, { resolution: 'finalize' });
  assert.equal(again.status, 'ALREADY_RESOLVED');
  ok('2: applied with no spend -> GM waives explicitly; FINALIZED without paying; a retry replays, a second reconcile is refused');
}
{
  // fenced before FINALIZED after the spend: APPLIED + spend present -> only finalize; compensation (which would leave a paid action) is refused
  const w = world({ fenceFailAt: 4 });
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'EXECUTOR_FENCED'); assert.equal(w.spends.length, 1);
  w.sw.fenceFailAt = 0;
  const review = await reconcile(w, first.requestId);
  assert.equal(review.evidence.spend, 'present'); assert.deepEqual(review.allowedResolutions, ['finalize']);
  assert.equal((await reconcile(w, first.requestId, { resolution: 'compensate' })).status, 'RESOLUTION_NOT_ALLOWED');
  const done = await reconcile(w, first.requestId, { resolution: 'finalize' });
  assert.equal(done.phaseAfter, 'FINALIZED'); assert.equal(w.entry(first.requestId).spend.state, 'committed'); assert.equal(w.spends.length, 1);
  ok('3: applied and paid -> finalize only; the single spend stands');
}
{
  // fenced before the Item write: PREPARED, nothing applied -> close as NOT_APPLIED
  const w = world({ fenceFailAt: 2 });
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal(first.status, 'EXECUTOR_FENCED'); assert.equal(w.entry(first.requestId).phase, 'PREPARED'); assert.equal(w.posture(), 'STOWED');
  w.sw.fenceFailAt = 0;
  const review = await reconcile(w, first.requestId);
  assert.equal(review.evidence.classification, 'NOT_APPLIED'); assert.deepEqual(review.allowedResolutions, ['close-not-applied']);
  const done = await reconcile(w, first.requestId, { resolution: 'close-not-applied' });
  assert.equal(done.phaseAfter, 'NOT_APPLIED'); assert.equal(w.spends.length, 0);
  ok('4: prepared but never written -> closed as NOT_APPLIED');
}
{
  // a concurrent edit after the interrupted transaction: compensation never overwrites it; the evidence and a PARTIAL phase remain
  const w = world(); w.sw.spendThrows = true; w.sw.markerThrows = true;
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  w.actor.items.get('s').system.weaponPosture = 'EQUIPPED'; // someone else changed it
  const review = await reconcile(w, first.requestId);
  assert.equal(review.evidence.classification, 'INDETERMINATE');
  const done = await reconcile(w, first.requestId, { resolution: 'compensate' });
  assert.equal(done.status, 'RECONCILED'); assert.equal(done.resolved, false); assert.equal(done.phaseAfter, 'PARTIAL');
  assert.equal(w.posture(), 'EQUIPPED', 'the concurrent value is left untouched');
  assert.ok(done.compensation.skippedConcurrentPaths.some((p) => p.endsWith('system.weaponPosture')));
  assert.equal(RI.peekRequestId(RI.intentKey(w.actor, ready())), first.requestId, 'an unresolved action keeps its id');
  ok('5: concurrent edits are skipped, the entry stays unresolved (PARTIAL) and keeps its id');
}
{
  // authority and input
  const w = world(); w.sw.spendThrows = true; w.sw.markerThrows = true;
  const first = await InventoryEngine.requestWeaponPosture(w.actor, ready(), { deps: w.deps });
  assert.equal((await C.reconcileEquipmentTransaction(w.actor, first.requestId, {}, w.deps)).status, 'NO_AUTHORITATIVE_EXECUTOR');
  assert.equal((await C.reconcileEquipmentTransaction(w.actor, first.requestId, { context: C.GM_LOCAL_CONTEXT }, { ...w.deps, isGm: () => false })).status, 'REJECTED_NOT_GM');
  assert.equal((await reconcile(w, 'nope')).status, 'NOT_FOUND');
  await assert.rejects(() => reconcile(w, first.requestId, { resolution: 'replay' }), /resolution must be one of/);
  const before = JSON.stringify(w.actor.flags.swse.equipmentTxn);
  const wf = await C.reconcileEquipmentTransaction(w.actor, first.requestId, { context: C.GM_LOCAL_CONTEXT, resolution: 'compensate' }, { ...w.deps, writeJournal: async () => { throw new Error('disk'); } });
  assert.equal(wf.status, 'RECONCILE_WRITE_FAILED');
  assert.equal(JSON.stringify(w.actor.flags.swse.equipmentTxn), before, 'a failed write leaves the journal evidence as it was');
  ok('6: no context / non-GM / unknown id / unsupported resolution / journal write failure are reported, never silently applied');
}
console.log(`equipment-g36-reconciliation: ${n} checks ok`);
