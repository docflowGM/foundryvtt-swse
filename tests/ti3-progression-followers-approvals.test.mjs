import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// TI-3 (progression, followers, approvals), promoted from the TI-0 findings TX-09 sub-gap / TI-N6, TX-10 (live approvals), TX-11 / TI-N5.
// Real production modules (TransactionEngine, GMApprovalOperationsService, GMApprovalsSurfaceService, AllyAssignmentService, ProgressionFinalizer,
// runFollowerMutationTransaction); the shim's ActorEngine is a fake or a small model; settings are an in-memory model. Level: L1 (one client, offline).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = JSON.parse(JSON.stringify(v)); };

// ------------------------------------------------------------------------------------------------ 3.1 TX-11: the follower runner honors failure VALUES
{
  const { runFollowerMutationTransaction } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/follower-mutation-transaction.js');
  const log = [];
  const step = (name, commitResult, rollbackResult = undefined) => ({ name, commit: async () => { log.push(`commit:${name}`); return commitResult; }, rollback: async () => { log.push(`rollback:${name}`); return rollbackResult; } });
  // a commit that RETURNS { ok:false } / { success:false } / false is a failed step; earlier steps are rolled back, later ones never run
  for (const failure of [{ ok: false, reason: 'refused' }, { success: false }, false]) {
    log.length = 0; const r = await runFollowerMutationTransaction([step('one', { written: true }), step('two', failure), step('three', 'never')]);
    assert.equal(r.ok, false, `commit result ${JSON.stringify(failure)} is a failure`); assert.equal(r.failedStep, 'two'); assert.deepEqual(log, ['commit:one', 'commit:two', 'rollback:one'], 'one is rolled back, three never runs'); assert.equal(r.rollbackFailed, false);
  }
  // values that are NOT failures stay successes (unchanged contract)
  for (const fine of [undefined, true, { ok: true }, { id: 'x' }, 0, null, 'done']) { const r = await runFollowerMutationTransaction([step('a', fine)]); assert.equal(r.ok, true, `commit result ${JSON.stringify(fine)} is success`); }
  // a rollback that RETURNS false / { ok:false } / { success:false } is a failed rollback
  for (const bad of [false, { ok: false }, { success: false }]) {
    const r = await runFollowerMutationTransaction([step('a', 'x', bad), { name: 'b', commit: async () => { throw new Error('boom'); } }]);
    assert.equal(r.ok, false); assert.equal(r.rollbackFailed, true, `rollback result ${JSON.stringify(bad)} is a failed rollback`); assert.equal(r.rollbackErrors.length, 1); assert.equal(r.rollbackErrors[0].step, 'a');
  }
  // a clean rollback (undefined / true) is still clean
  for (const clean of [undefined, true]) { const r = await runFollowerMutationTransaction([step('a', 'x', clean), { name: 'b', commit: async () => { throw new Error('boom'); } }]); assert.equal(r.rollbackFailed, false); }
  ok('TI-3.1 (TX-11): a follower step that REPORTS failure by value (false / {ok:false} / {success:false}) fails the transaction exactly like a throw, and a rollback that reports failure is recorded as rollbackFailed');
}

// ------------------------------------------------------------------------------------------------ 3.2 TI-N5: ally assign / unassign surface an incomplete rollback to the caller
{
  const { AllyAssignmentService } = await import('/systems/foundryvtt-swse/scripts/engine/crew/ally-assignment-service.js');
  const { ActorEngine: FakeEngine, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');
  const SYS = 'foundryvtt-swse';
  const mkActor = (o = {}) => { const a = { id: 'a1', name: 'A', type: 'npc', uuid: 'Actor.a1', isOwner: false, system: {}, img: 'x', items: [], effects: [], ownership: {}, ...o, flags: { [SYS]: {}, swse: {}, ...(o.flags || {}) }, getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: a.system, name: a.name, flags: a.flags, items: a.items, effects: a.effects })); } }; return a; };
  const asGM = () => installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: new Map(), users: [] }, CONST: { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } } });
  const failRollbacks = (on) => { const real = FakeEngine.updateActor; FakeEngine.updateActor = async function (actor, data, options) { if (on && String(options?.source ?? '').endsWith(':rollback')) throw new Error('rollback write failed'); return real.call(FakeEngine, actor, data, options); }; return () => { FakeEngine.updateActor = real; }; };
  // assignAsAlly: the third step (ownership grant) fails because no player user exists; the two earlier steps roll back
  for (const rollbackBroken of [false, true]) {
    resetFakeActorEngine(); asGM(); const owner = mkActor({ id: 'o1', type: 'character', system: { ownedActors: [] } }); const target = mkActor({ id: 't1', type: 'npc' });
    const restore = failRollbacks(rollbackBroken); let err;
    try { await silent(() => AllyAssignmentService.assignAsAlly(owner, target, { grantOwnership: true })); } catch (e) { err = e; } finally { restore(); }
    assert.ok(err, 'assign failed'); assert.match(err.message, /Ownership could not be granted/, 'the original error and message are unchanged');
    assert.equal(err.rollbackFailed, rollbackBroken, `assignAsAlly: rollbackFailed is reported to the caller (${rollbackBroken})`); assert.equal(err.failedStep != null, true);
    if (rollbackBroken) assert.ok(err.rollbackErrors?.length >= 1);
  }
  // unassignAlly: the second step fails; the owner removal rolls back (or fails to)
  for (const rollbackBroken of [false, true]) {
    resetFakeActorEngine(); asGM(); const owner = mkActor({ id: 'o2', type: 'character', system: { ownedActors: [{ id: 't2' }] } }); const target = mkActor({ id: 't2', type: 'npc' });
    const real = FakeEngine.updateActor; FakeEngine.updateActor = async function (actor, data, options) { const src = String(options?.source ?? ''); if (src.endsWith(':rollback')) { if (rollbackBroken) throw new Error('rollback write failed'); } else if (actor === target) throw new Error('target write failed'); return real.call(FakeEngine, actor, data, options); };
    let err; try { await silent(() => AllyAssignmentService.unassignAlly(owner, target)); } catch (e) { err = e; } finally { FakeEngine.updateActor = real; }
    assert.ok(err); assert.match(err.message, /target write failed/); assert.equal(err.rollbackFailed, rollbackBroken, `unassignAlly: rollbackFailed (${rollbackBroken})`);
  }
  ok('TI-3.2 (TI-N5): assignAsAlly / unassignAlly throw the original error annotated with rollbackFailed / failedStep / rollbackErrors, so an incomplete rollback is distinguishable from a clean one');
}

// ------------------------------------------------------------------------------------------------ 3.3 / 3.4 approvals
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };   // installFoundryShimGlobals (3.2) replaced it
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { GMApprovalOperationsService: Svc } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalOperationsService.js');
{
  const world = new Map(); const settingsStore = { pendingCustomPurchases: [] }; const deleted = [];
  const mkOwner = (credits = 1000) => { const a = { id: 'owner', name: 'Owner', type: 'character', isOwner: true, system: { credits, ownedActors: [] }, flags: {}, items: [], ownership: {}, getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, flags: this.flags })); } }; return a; };
  const mkDroid = (id, name, extra = {}) => { const a = { id, name, type: 'droid', isOwner: true, uuid: `Actor.${id}`, system: { credits: 0, droidSystems: { stateMode: 'PENDING', ownerActorId: 'owner', credits: { spent: 300 } }, storeAcquisition: { pendingApproval: true }, ...(extra.system || {}) }, flags: { 'foundryvtt-swse': { pendingApproval: true, draftOnly: true } }, items: [], ownership: {}, getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, flags: this.flags, name: this.name, type: this.type })); }, async delete() { deleted.push(this.id); world.delete(this.id); } }; return a; };
  const modelApply = async (a, plan) => { for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a, k, v); for (const [k, v] of Object.entries(plan.update ?? {})) { if (k !== 'items') setPath(a, k, v); } };
  ActorEngine.applyMutationPlan = modelApply;
  ActorEngine.updateActor = async (a, data) => { for (const [k, v] of Object.entries(data)) setPath(a, k, v); return a; };
  const snaps = [];
  SnapshotManager.createSnapshot = async (a, label) => { const s = { schemaVersion: 2, scope: 'full-actor', timestamp: snaps.length + 1, label, data: JSON.parse(JSON.stringify({ system: a.system, flags: a.flags })) }; snaps.push(s); return s; };
  SnapshotManager.getSnapshot = (a, ts) => snaps.find((s) => s.timestamp === ts) ?? null;
  SnapshotManager.restoreSnapshot = async (a, ts) => { const s = snaps.find((x) => x.timestamp === ts); a.system = JSON.parse(JSON.stringify(s.data.system)); a.flags = JSON.parse(JSON.stringify(s.data.flags)); return true; };
  const hooksReal = globalThis.Hooks;
  const throwOn = (names) => { globalThis.Hooks = { ...hooksReal, callAll: (name, ...r) => { if (names.includes(name)) throw new Error(`listener for ${name} threw`); return hooksReal.callAll?.(name, ...r); }, call: (name, ...r) => { if (names.includes(name)) throw new Error(`listener for ${name} threw`); return hooksReal.call?.(name, ...r); } }; };
  const restoreHooks = () => { globalThis.Hooks = hooksReal; };
  const setup = () => { world.clear(); deleted.length = 0; snaps.length = 0; TransactionEngine._mutationLocks.clear(); notes.error.length = notes.warn.length = notes.info.length = 0; settingsStore.pendingCustomPurchases = []; };
  globalThis.game = { ...(globalThis.game ?? {}), user: { isGM: true, id: 'gm1', name: 'GM' }, users: [], actors: { get: (id) => world.get(id) ?? null, contents: [], [Symbol.iterator]: () => world.values() },
    settings: { settings: { has: () => true }, get: (_s, k) => JSON.parse(JSON.stringify(settingsStore[k] ?? null)), set: async (_s, k, v) => { settingsStore[k] = JSON.parse(JSON.stringify(v)); return v; } } };
  const host = { selectedApprovalKey: null, approvalEditMode: false, approvalDenyMode: false, _loadPendingDroids: async () => {}, _loadStorePendingApprovals: async () => {}, pendingDroids: [], storeApprovals: [] };
  Svc._resetApprovalState = async (h) => { h.selectedApprovalKey = null; };   // the shell refresh is not under test
  const queue = () => settingsStore.pendingCustomPurchases;
  const pending = (id, draft, cost = 300) => ({ id, type: 'droid', ownerActorId: 'owner', draftActorId: draft.id, costCredits: cost, draftData: { name: draft.name }, metadata: {} });
  const approvalOf = (owner, droid, cost = 300) => ({ actor: owner, assetActor: droid, cost, reason: 'ti3', transactionContext: 'store-custom-approval', audit: { source: 'ti3' } });

  // 3.3 the engine refuses to approve an asset that was already approved (TX-10: the asset-state check is part of the transaction)
  {
    setup(); const owner = mkOwner(1000); const droid = mkDroid('dr1', 'Droid One'); world.set('owner', owner); world.set('dr1', droid);
    const first = await TransactionEngine.executeAssetApprovalTransaction(approvalOf(owner, droid), { source: 'ti3', rederive: false });
    assert.equal(first.success, true, first.error); assert.equal(owner.system.credits, 700);
    const second = await TransactionEngine.executeAssetApprovalTransaction(approvalOf(owner, droid), { source: 'ti3', rederive: false });
    assert.equal(second.success, false, 'a second approval of the same asset is refused'); assert.equal(second.refused, 'already-acquired'); assert.ok(second.acquiredTransactionId);
    assert.equal(owner.system.credits, 700, 'the owner is charged ONCE');
    ok('TI-3.3 (TX-10): executeAssetApprovalTransaction refuses an asset that already carries a store-acquisition record (no second charge, nothing changed)');
  }

  // 3.4a custom approvals are addressed by the record's own id; a slot that now holds another request is never approved
  {
    setup(); const owner = mkOwner(1000); const dA = mkDroid('dA', 'Droid A'); const dB = mkDroid('dB', 'Droid B'); world.set('owner', owner); world.set('dA', dA); world.set('dB', dB);
    queue().push(pending('pending_a', dA, 300), pending('pending_b', dB, 400));
    assert.deepEqual(Svc.parseApprovalKey('custom-id:pending_b'), { kind: 'custom', approvalId: 'pending_b', index: -1 });
    assert.equal(Svc.resolveCustomIndex(Svc.parseApprovalKey('custom-id:pending_b')), 1); assert.equal(Svc.resolveCustomIndex(Svc.parseApprovalKey('custom:0')), 0, 'legacy index keys still parse');
    // another GM approves A first; this GM's stale button still says "request A"
    assert.equal(await Svc.approveRequest(host, 'custom-id:pending_a'), true); assert.equal(owner.system.credits, 700); assert.deepEqual(queue().map((e) => e.id), ['pending_b']);
    const stale = await Svc.approveRequest(host, 'custom-id:pending_a');
    assert.equal(stale, false, 'the stale id no longer names any pending request'); assert.equal(owner.system.credits, 700, 'and B (now at index 0) was NOT approved in its place'); assert.deepEqual(queue().map((e) => e.id), ['pending_b']); assert.equal(dB.system.storeAcquisition?.transactionId, undefined, 'B was not approved (no acquisition record)');
    // B approves normally by its own id
    assert.equal(await Svc.approveRequest(host, 'custom-id:pending_b'), true); assert.equal(owner.system.credits, 300);
    ok('TI-3.4a (TX-10): custom approvals are addressed by custom-id:<id>; a stale id never approves whatever record now occupies its old queue slot');
  }

  // 3.4b the surface exposes the stable id as the ACTION key and the template uses it
  {
    const { GMApprovalsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalsSurfaceService.js');
    setup(); const owner = mkOwner(1000); const dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA);
    const h = { ...host, storeApprovals: [pending('pending_a', dA)] };
    const vm = await GMApprovalsSurfaceService.buildViewModel(h);
    const row = vm.approvalRequests.find((r) => r.sourceType === 'store-custom' || r.type === 'droid');
    assert.equal(row.key, 'custom:0', 'the legacy selection key is unchanged'); assert.equal(row.actionKey, 'custom-id:pending_a', 'the mutation buttons carry the stable id');
    assert.equal(vm.selectedApproval.actionKey, 'custom-id:pending_a');
    const tpl = (await import('node:fs')).readFileSync(new URL('../templates/apps/gm-datapad/surfaces/approvals/queue.hbs', import.meta.url), 'utf8');
    assert.equal((tpl.match(/data-approval-key="\{\{selectedApproval\.key\}\}"/g) ?? []).length, 0, 'no mutation button still reads the index key'); assert.ok((tpl.match(/data-approval-key="\{\{selectedApproval\.actionKey\}\}"/g) ?? []).length >= 5);
    ok('TI-3.4b (TX-10): the approvals surface hands the stable id to approve / deny / edit buttons (actionKey); selection keys are unchanged');
  }

  // 3.4c denying a stale request never deletes an asset that was already approved and paid for
  {
    setup(); const owner = mkOwner(1000); const dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA);
    queue().push(pending('pending_a', dA, 300));
    assert.equal(await Svc.approveRequest(host, 'custom-id:pending_a'), true);   // approved; then a stale deny arrives (the request id is still in a second tab's queue)
    queue().push(pending('pending_a', dA, 300));   // the stale entry the other tab still shows
    const denied = await silent(() => Svc.denyRequest(host, 'custom-id:pending_a', 'stale'));
    assert.deepEqual(deleted, [], 'the approved, paid-for droid is NOT deleted'); assert.ok(world.get('dA'), 'it still exists'); assert.equal(denied, false); assert.deepEqual(queue().map((e) => e.id), [], 'only the stale queue entry is removed');
    assert.ok(notes.warn.some((m) => /already approved/i.test(m)));
    // a genuine pending draft is still deleted on deny
    setup(); const dB = mkDroid('dB', 'Droid B'); world.set('owner', owner); world.set('dB', dB); queue().push(pending('pending_b', dB, 300));
    assert.equal(await silent(() => Svc.denyRequest(host, 'custom-id:pending_b', 'no')), true); assert.deepEqual(deleted, ['dB']);
    ok('TI-3.4c (TX-10): deny removes an unapproved draft as before, but a request whose asset was already approved only loses its stale queue entry (the owned asset is kept)');
  }

  // 3.4d post-commit failures never turn a committed approval into a failure
  {
    // custom approval: a throwing hook, then a failing purchase-history mirror, then a failing queue removal
    setup(); let owner = mkOwner(1000); let dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    throwOn(['swseCustomPurchaseApproved']); let r = await silent(() => Svc.approveRequest(host, 'custom-id:pending_a')); restoreHooks();
    assert.equal(r, true, 'a throwing completion hook does not fail a committed approval'); assert.equal(owner.system.credits, 700); assert.deepEqual(queue(), [], 'the request was still removed from the queue'); assert.ok(notes.warn.some((m) => /do not approve it again/i.test(m)));
    setup(); owner = mkOwner(1000); dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    const realUpdate = ActorEngine.updateActor; ActorEngine.updateActor = async (a, d) => { if ('flags.foundryvtt-swse.purchaseHistory' in d) throw new Error('history write failed'); return realUpdate(a, d); };
    r = await silent(() => Svc.approveRequest(host, 'custom-id:pending_a')); ActorEngine.updateActor = realUpdate;
    assert.equal(r, true); assert.equal(owner.system.credits, 700); assert.deepEqual(queue(), []);
    // the queue removal itself fails: still approved; a retry cannot charge again (engine refuses) and the stale entry is not a way to delete the asset (3.4c)
    setup(); owner = mkOwner(1000); dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    const realRemove = Svc._removeApprovalFromQueue; Svc._removeApprovalFromQueue = async () => { throw new Error('settings write failed'); };   // (injected one level above the shared queue helper)
    r = await silent(() => Svc.approveRequest(host, 'custom-id:pending_a')); Svc._removeApprovalFromQueue = realRemove;
    assert.equal(r, true, 'committed approval is reported as approved even though the queue entry could not be removed'); assert.equal(owner.system.credits, 700); assert.equal(queue().length, 1, 'the stale entry remains');
    const retry = await silent(() => Svc.approveRequest(host, 'custom-id:pending_a')); assert.equal(retry, false); assert.equal(owner.system.credits, 700, 'a retry is refused by the engine: no second charge');
    // droid approval: a throwing swseApprovalResolved listener
    setup(); owner = mkOwner(1000); const droid = mkDroid('dr9', 'Droid Nine'); world.set('owner', owner); world.set('dr9', droid);
    throwOn(['swseApprovalResolved']); r = await silent(() => Svc.approveDroid(host, 'dr9')); restoreHooks();
    assert.equal(r, true, 'a throwing listener does not fail a committed droid approval'); assert.equal(owner.system.credits, 700); assert.equal(droid.system.droidSystems.stateMode, 'FINALIZED');
    // and a second approveDroid call is refused (state-based guard) with no second charge
    const again = await silent(() => Svc.approveDroid(host, 'dr9')); assert.equal(again, false); assert.equal(owner.system.credits, 700);
    ok('TI-3.4d (TX-10): after a committed custom or droid approval, a throwing hook, a failing history mirror or a failing queue removal are warnings — never "Failed to approve" — and a retry cannot charge twice');
  }

  // ---- review corrections (TI3-R1 / TI3-R2) ------------------------------------------------------------------------------------------------------
  // 3.6 TI3-R1: queue removal never falls back to an old index for a record that has an id
  {
    setup(); const owner = mkOwner(1000); const dA = mkDroid('dA', 'Droid A'); const dB = mkDroid('dB', 'Droid B'); world.set('owner', owner); world.set('dA', dA); world.set('dB', dB);
    const A = pending('pending_a', dA, 300); const B = pending('pending_b', dB, 400);
    // (a) A was removed by another operation and B moved into A's old slot: removing "A" by its stale index must not remove B
    queue().push(B); let removed = await Svc._removeApprovalFromQueue(A, 0, null);
    assert.equal(removed, false, 'an id that is no longer in the queue removes nothing'); assert.deepEqual(queue().map((e) => e.id), ['pending_b'], 'B (now at the old index) is NOT removed');
    // (b) end to end: while A's approval transaction runs, another GM removes A; B shifts into index 0; the cleanup after the commit must leave B alone
    setup(); const o2 = mkOwner(1000); const a2 = mkDroid('dA', 'Droid A'); const b2 = mkDroid('dB', 'Droid B'); world.set('owner', o2); world.set('dA', a2); world.set('dB', b2);
    queue().push(pending('pending_a', a2, 300), pending('pending_b', b2, 400));
    const realApply = ActorEngine.applyMutationPlan; let shifted = false;
    ActorEngine.applyMutationPlan = async (a, p, o) => { if (!shifted) { shifted = true; settingsStore.pendingCustomPurchases = settingsStore.pendingCustomPurchases.filter((e) => e.id !== 'pending_a'); } return realApply(a, p, o); };
    const ok1 = await Svc.approvePendingCustom(host, 0); ActorEngine.applyMutationPlan = realApply;
    assert.equal(ok1, true, 'A was approved (committed)'); assert.deepEqual(queue().map((e) => e.id), ['pending_b'], 'B was not removed by the stale index cleanup'); assert.equal(b2.system.storeAcquisition?.transactionId, undefined, 'and B was not approved');
    // (c) an id-less LEGACY record may use its index only while the entry there is still byte-identical
    const legacyA = { type: 'droid', ownerActorId: 'owner', draftActorId: 'dA', costCredits: 1, draftData: { name: 'x' } }; const legacyB = { ...legacyA, costCredits: 2 };
    settingsStore.pendingCustomPurchases = [legacyA, legacyB]; assert.equal(await Svc._removeApprovalFromQueue(legacyB, 1, null), true); assert.deepEqual(queue(), [legacyA]);
    settingsStore.pendingCustomPurchases = [legacyA, { ...legacyA, costCredits: 99 }]; assert.equal(await Svc._removeApprovalFromQueue(legacyB, 1, null), false, 'a different record in that slot is not removed'); assert.equal(queue().length, 2);
    ok('TI3-R1: queue removal for a record with an id matches that id or refuses (never the old index); an id-less legacy record may use its index only while the entry there is identical');
  }

  // 3.7 TI3-R2: the destructive denial revalidates identity, pending state and acquisition under the decision lock
  {
    // (a) a legacy index key cannot identify an id-bearing record: refused, nothing deleted
    setup(); let owner = mkOwner(1000); let dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    let r = await silent(() => Svc.denyRequest(host, 'custom:0', 'stale index')); assert.equal(r, false); assert.deepEqual(deleted, [], 'no actor deleted for an ambiguous index'); assert.equal(queue().length, 1); assert.ok(notes.error.some((m) => /list position|reload/i.test(m)));
    // (b) the queue changed between the first read and the lock: the request is gone -> nothing deleted (and a different request in its slot is not touched)
    setup(); owner = mkOwner(1000); dA = mkDroid('dA', 'Droid A'); const dB = mkDroid('dB', 'Droid B'); world.set('owner', owner); world.set('dA', dA); world.set('dB', dB);
    queue().push(pending('pending_a', dA, 300), pending('pending_b', dB, 400));
    const realAcquire = TransactionEngine.acquireAssetDecisionLock;
    TransactionEngine.acquireAssetDecisionLock = (...a) => { settingsStore.pendingCustomPurchases = settingsStore.pendingCustomPurchases.filter((e) => e.id !== 'pending_a'); return realAcquire.apply(TransactionEngine, a); };
    r = await silent(() => Svc.denyRequest(host, 'custom-id:pending_a', 'x')); TransactionEngine.acquireAssetDecisionLock = realAcquire;
    assert.equal(r, false); assert.deepEqual(deleted, [], 'A was removed by someone else first: its draft is not deleted by this stale denial'); assert.deepEqual(queue().map((e) => e.id), ['pending_b'], 'B untouched');
    // (c) an approval of this very asset is in flight: the denial refuses (busy) and keeps everything; once it commits, a later denial only drops the stale entry
    setup(); owner = mkOwner(1000); dA = mkDroid('dA', 'Droid A'); world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    let release; const gate = new Promise((res) => { release = res; }); const realApply = ActorEngine.applyMutationPlan; let started = false;
    ActorEngine.applyMutationPlan = async (a, p, o) => { started = true; await gate; return realApply(a, p, o); };
    const approving = Svc.approveRequest(host, 'custom-id:pending_a'); for (let k = 0; k < 500 && !started; k += 1) await new Promise((res) => setTimeout(res, 1));
    r = await silent(() => Svc.denyRequest(host, 'custom-id:pending_a', 'race')); assert.equal(r, false, 'denial refused while the approval of the same asset is running'); assert.deepEqual(deleted, []); assert.ok(world.get('dA')); assert.ok(notes.warn.some((m) => /in progress/i.test(m)));
    release(); assert.equal(await approving, true); ActorEngine.applyMutationPlan = realApply; assert.equal(owner.system.credits, 700);
    // (d) a draft that can be neither confirmed as pending nor as acquired is never deleted
    setup(); owner = mkOwner(1000); dA = mkDroid('dA', 'Droid A'); dA.flags['foundryvtt-swse'] = {}; dA.system.storeAcquisition = {}; world.set('owner', owner); world.set('dA', dA); queue().push(pending('pending_a', dA, 300));
    r = await silent(() => Svc.denyRequest(host, 'custom-id:pending_a', 'x')); assert.equal(r, false); assert.deepEqual(deleted, [], 'uncertain pending state: nothing deleted'); assert.equal(queue().length, 1, 'and the request stays queued for manual review'); assert.ok(notes.warn.some((m) => /could not be confirmed|NOT deleted/i.test(m)));
    // (e) the legacy GM Store Dashboard deletes through the SAME guarded core and checks identity before approving
    const src = (await import('node:fs')).readFileSync(new URL('../scripts/apps/gm-store-dashboard.js', import.meta.url), 'utf8');
    const denySrc = src.slice(src.indexOf('async _denyPendingCustom('), src.indexOf('async _denyPendingCustom(') + 3500);
    assert.match(denySrc, /decideDenial\(/); assert.doesNotMatch(denySrc, /draftActor\.delete\(\)/, 'the dashboard no longer deletes a draft by its rendered index');
    assert.match(src.slice(src.indexOf('async _approvePendingCustom('), src.indexOf('async _approvePendingCustom(') + 900), /isStillPending\(/);
    ok('TI3-R2: a denial is refused for an ambiguous index, a request that left the queue, an approval in flight, or an unconfirmable draft; the dashboard uses the same guarded core');
  }
}

// ------------------------------------------------------------------------------------------------ 3.5 TX-09 sub-gap / TI-N6: progression post-apply
{
  const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
  const calls = { apply: 0, update: 0 };
  const mkActor = () => ({ id: 'pc1', name: 'PC', type: 'character', system: { starshipManeuverSuite: { maneuvers: [], max: 0 } }, items: [{ id: 'm1', type: 'maneuver', name: 'Evasive Action' }] });
  const plan = { metadata: { postApply: { starshipManeuverNames: ['Evasive Action'] } } };
  const engine = (updateImpl) => ({ applyMutationPlan: async () => { calls.apply += 1; }, updateActor: async (...a) => { calls.update += 1; return updateImpl(...a); } });
  const saved = globalThis.SWSE;
  try {
    // the plan applies, then the post-apply sync write fails: the plan IS committed -> success with a warning, applied once
    globalThis.SWSE = { ActorEngine: engine(async () => { throw new Error('maneuver suite write failed'); }) };
    calls.apply = calls.update = 0; notes.warn.length = 0;
    let r = await silent(() => ProgressionFinalizer._applyMutationPlan(mkActor(), plan));
    assert.equal(r.success, true, 'an applied plan is not reported as a failed finalization'); assert.equal(calls.apply, 1, 'the plan was applied exactly once'); assert.equal(r.postApplyWarnings?.length, 1); assert.equal(r.postApplyWarnings[0].step, 'post-apply-sync'); assert.match(r.postApplyWarnings[0].error, /maneuver suite write failed/);
    assert.ok(notes.warn.some((m) => /applied/i.test(m) && /finalize again/i.test(m)), 'the player is told not to finalize again');
    // the plan ITSELF failing is still a failure and never reaches the sync
    globalThis.SWSE = { ActorEngine: { applyMutationPlan: async () => { calls.apply += 1; throw new Error('plan failed'); }, updateActor: async () => { calls.update += 1; } } };
    calls.apply = calls.update = 0; r = await silent(() => ProgressionFinalizer._applyMutationPlan(mkActor(), plan));
    assert.equal(r.success, false); assert.match(r.error, /plan failed/); assert.equal(calls.update, 0, 'no post-apply sync after a failed plan');
    // the healthy path is unchanged
    globalThis.SWSE = { ActorEngine: engine(async () => ({})) }; calls.apply = calls.update = 0; r = await ProgressionFinalizer._applyMutationPlan(mkActor(), plan);
    assert.equal(r.success, true); assert.equal(r.postApplyWarnings, undefined); assert.equal(calls.update, 1);
    // review TI3-R3: committed-but-incomplete is machine readable, and ONLY the suite can be repaired, idempotently, without replaying the level-up
    {
      const live = mkActor(); calls.apply = calls.update = 0; const writes = [];
      const failingOnce = { fail: true };
      globalThis.SWSE = { ActorEngine: { applyMutationPlan: async () => { calls.apply += 1; }, updateActor: async (a, data) => { calls.update += 1; writes.push(Object.keys(data)); if (failingOnce.fail) throw new Error('maneuver suite write failed'); for (const [k2, v2] of Object.entries(data)) setPath(a, k2, v2); return a; } } };
      let r2 = await silent(() => ProgressionFinalizer._applyMutationPlan(live, plan));
      assert.equal(r2.success, true); assert.equal(r2.committed, true); assert.equal(r2.postApplyIncomplete, true, 'distinguished from a clean finalization'); assert.equal(r2.postApplyWarnings[0].field, 'system.starshipManeuverSuite'); assert.deepEqual(r2.postApplyRepair.starshipManeuverNames, ['Evasive Action']);
      assert.equal(calls.apply, 1, 'the plan ran once'); assert.deepEqual(live.system.starshipManeuverSuite.maneuvers, [], 'and the suite really is still incomplete');
      // repair: no plan replay, exactly one write, only the two suite fields
      failingOnce.fail = false; calls.apply = calls.update = 0; writes.length = 0;
      const fix = await ProgressionFinalizer.resyncPostApplyState(live, r2.postApplyRepair);
      assert.deepEqual(fix, { success: true, changed: true }); assert.equal(calls.apply, 0, 'the mutation plan is NOT re-applied: no feat, talent, attribute or HP grant is replayed'); assert.equal(calls.update, 1); assert.deepEqual(writes[0].sort(), ['system.starshipManeuverSuite.maneuvers', 'system.starshipManeuverSuite.max'].sort());
      assert.deepEqual(live.system.starshipManeuverSuite.maneuvers, ['m1']);
      // a second (and third) resync changes nothing and writes nothing: no duplicate maneuver
      calls.update = 0; const again = await ProgressionFinalizer.resyncPostApplyState(live, r2.postApplyRepair); const third = await ProgressionFinalizer.resyncPostApplyState(live, r2.postApplyRepair);
      assert.deepEqual(again, { success: true, changed: false }); assert.deepEqual(third, { success: true, changed: false }); assert.equal(calls.update, 0); assert.deepEqual(live.system.starshipManeuverSuite.maneuvers, ['m1'], 'no duplicate');
      // removal ids are idempotent too
      live.system.starshipManeuverSuite = { maneuvers: ['m1', 'm9'], max: 2 }; calls.update = 0;
      assert.deepEqual(await ProgressionFinalizer.resyncPostApplyState(live, { starshipManeuverRemoveItemIds: ['m9'] }), { success: true, changed: true }); assert.deepEqual(live.system.starshipManeuverSuite.maneuvers, ['m1']);
      assert.deepEqual(await ProgressionFinalizer.resyncPostApplyState(live, { starshipManeuverRemoveItemIds: ['m9'] }), { success: true, changed: false });
      // a repair that fails reports it (never throws) and a clean finalization carries no incomplete flag
      failingOnce.fail = true; live.system.starshipManeuverSuite = { maneuvers: [], max: 0 }; const bad = await silent(() => ProgressionFinalizer.resyncPostApplyState(live, r2.postApplyRepair)); assert.equal(bad.success, false); assert.match(bad.error, /write failed/);
      globalThis.SWSE = { ActorEngine: engine(async () => ({})) }; const clean = await ProgressionFinalizer._applyMutationPlan(mkActor(), plan); assert.equal(clean.postApplyIncomplete, undefined); assert.equal(clean.committed, true);
    }
    ok('TI-3.5 (TX-09 sub-gap / TI-N6): a post-apply sync failure after a COMMITTED progression plan is success + postApplyWarnings (and a "do not finalize again" notice), a failed plan is still a failure that skips the sync');
  } finally { globalThis.SWSE = saved; }
}

console.log(`\nTI-3 progression / followers / approvals: ${n} checks passed.`);
