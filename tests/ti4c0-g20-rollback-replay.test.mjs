/**
 * TI4-C0 / G20 — TransactionEngine.executeRollbackCorrection() must refuse to roll back a source transaction that is already marked `Rolled Back`.
 *
 * Real production method under test: TransactionEngine.executeRollbackCorrection (with the real LedgerService and its real lock). Narrowly injected:
 * the shim's ActorEngine.applyMutationPlan (a small model that applies `set` and `delete.items` the way the real engine's buckets do), and
 * SnapshotManager (in-memory snapshots). The actor is a plain object whose `flags` property records WHEN it is read (so the test can prove the
 * authoritative status check happens while the engine's lock is held). Level: L1 (one client, offline). Not cross-client atomicity.
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const hookCalls = [];
globalThis.Hooks = { callAll: (...a) => hookCalls.push(a), on() {} };

const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (swseLogger[level]) swseLogger[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = clone(v); };
const SCOPE = 'foundryvtt-swse';

/* ---- harness ---- */
const probe = { flagReadsUnderLock: 0, flagReadsOutsideLock: 0, applyCalls: 0, plans: [], snapshots: 0, snapshotHook: null, failApply: null, lockKey: null };
let actor;
function mkActor({ credits = 900, transactions } = {}) {
  const a = { id: 'buyer', name: 'Buyer', type: 'character', isOwner: true, system: { credits }, items: [
      { id: 'blaster1', name: 'Blaster', type: 'weapon' }, { id: 'armor1', name: 'Armor', type: 'armor' }], _flags: { [SCOPE]: { transactions: transactions ?? {} } },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }, toObject() { return clone({ system: this.system, items: this.items, flags: this._flags }); } };
  Object.defineProperty(a, 'flags', { get() {
    const locked = probe.lockKey ? TransactionEngine._mutationLocks.has(probe.lockKey) : false;
    if (locked) probe.flagReadsUnderLock++; else probe.flagReadsOutsideLock++;
    return a._flags;
  } });
  a.items.get = (id) => a.items.find((i) => i.id === id) ?? null;
  return a;
}
const sourceRecord = (over = {}) => ({ id: 'tx_src', context: 'store-purchase', type: 'Buy', status: 'Success', amount: -100, cost: 100, creditsBefore: 1000, creditsAfter: 900, createdAt: 1000, actorId: 'buyer', ...over });
function install({ credits = 900, source = sourceRecord() } = {}) {
  hookCalls.length = 0;
  Object.assign(probe, { flagReadsUnderLock: 0, flagReadsOutsideLock: 0, applyCalls: 0, plans: [], snapshots: 0, snapshotHook: null, failApply: null, lockKey: 'buyer:store-rollback-reconciliation' });
  actor = mkActor({ credits, transactions: source ? { [source.id]: source } : {} });
  globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => (id === actor.id ? actor : null) }, user: { isGM: true, id: 'u1', name: 'GM' }, settings: { get: () => undefined } };
  ActorEngine.applyMutationPlan = async (a, plan) => {
    probe.applyCalls += 1; probe.plans.push(clone(plan));
    if (probe.failApply) throw new Error(probe.failApply);
    for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a._flags ? { system: a.system, flags: a._flags } : a, k, v);
    for (const id of plan.delete?.items ?? []) a.items = Object.assign(a.items.filter((i) => i.id !== id), { get: (x) => a.items.find((i) => i.id === x) ?? null });
  };
  const store = new Map();
  SnapshotManager.createSnapshot = async (a, label) => { probe.snapshots++; if (probe.snapshotHook) await probe.snapshotHook(a); const ts = store.size + 1; store.set(ts, { schemaVersion: 2, scope: 'full-actor', timestamp: ts, label, data: clone({ credits: a.system.credits, items: a.items, flags: a._flags }) }); return store.get(ts); };
  SnapshotManager.getSnapshot = (a, ts) => store.get(ts) ?? null;
  SnapshotManager.restoreSnapshot = async (a, ts) => { const s = store.get(ts); a.system.credits = s.data.credits; a._flags = clone(s.data.flags); a.items = Object.assign(clone(s.data.items), { get: (x) => a.items.find((i) => i.id === x) ?? null }); return true; };
  return actor;
}
const sourceOnActor = (id = 'tx_src') => actor._flags[SCOPE].transactions[id];
const rollbackRecords = () => Object.values(actor._flags[SCOPE].transactions).filter((r) => r.type === 'Rollback');
const call = (over = {}, ctx = {}) => TransactionEngine.executeRollbackCorrection({ actor, amount: 100, reason: 'GM rollback', sourceTransactionId: 'tx_src', removeOwnedItemIds: ['blaster1'], audit: {}, ...ctx }, { validate: false, rederive: false, source: 'g20.test', ...over });
const lockClear = () => assert.equal(TransactionEngine._mutationLocks.has('buyer:store-rollback-reconciliation'), false, 'the rollback lock was released');

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { TransactionEngine._mutationLocks.clear(); }
}

/* ---------------------------------------------------------------------------------------------- */
await check('1. an eligible source transaction rolls back once (credits restored, item removed, source marked, one Rollback record)', async () => {
  install();
  const r = await call();
  assert.equal(r.success, true);
  assert.equal(actor.system.credits, 1000);
  assert.deepEqual(actor.items.map((i) => i.id), ['armor1']);
  assert.equal(sourceOnActor().status, 'Rolled Back');
  assert.equal(sourceOnActor().rolledBackByTransactionId, r.transactionId);
  assert.equal(rollbackRecords().length, 1);
  assert.equal(hookCalls.filter((h) => h[0] === 'swseStoreRollbackCorrectionComplete').length, 1);
  lockClear();
});

await check('2-6. a SECOND rollback of the same source is refused: credits, Items, records and the first rollback metadata are untouched', async () => {
  install();
  const first = await call();
  assert.equal(first.success, true);
  const credits = actor.system.credits; const items = actor.items.map((i) => i.id); const srcBefore = clone(sourceOnActor()); const recordsBefore = clone(actor._flags[SCOPE].transactions);
  const applyBefore = probe.applyCalls; const hooksBefore = hookCalls.length; const snapsBefore = probe.snapshots;
  const second = await call({}, { removeOwnedItemIds: ['armor1'] });
  assert.equal(second.success, false);
  assert.equal(second.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK', 'stable machine-readable code');
  assert.equal(second.rolledBackByTransactionId, first.transactionId);
  assert.equal(actor.system.credits, credits, 'credits unchanged');
  assert.deepEqual(actor.items.map((i) => i.id), items, 'owned Items unchanged (armor1 NOT deleted)');
  assert.equal(rollbackRecords().length, 1, 'no additional rollback record');
  assert.deepEqual(actor._flags[SCOPE].transactions, recordsBefore, 'no transaction record created or modified');
  assert.deepEqual(sourceOnActor(), srcBefore, 'first rollback id / timestamp / reason / status preserved');
  assert.equal(probe.applyCalls, applyBefore, 'no mutation plan was applied');
  assert.equal(hookCalls.length, hooksBefore, 'no successful-rollback hook/notification');
  assert.equal(probe.snapshots, snapsBefore, 'no unnecessary recovery snapshot');
  assert.notEqual(second.rollbackFailed, true);
  assert.notEqual(second.indeterminate, true);
  lockClear();
});

await check('7. a STALE caller-provided actor/transaction object cannot bypass the engine\'s current status', async () => {
  install();
  const stale = clone({ id: actor.id, name: actor.name, system: actor.system, items: actor.items, flags: actor._flags });
  stale.isOwner = true; stale.getFlag = () => undefined;
  assert.equal(stale.flags[SCOPE].transactions.tx_src.status, 'Success', 'the stale copy still shows the old status');
  const first = await call();
  assert.equal(first.success, true);
  const credits = actor.system.credits;
  const r = await call({}, { actor: stale });
  assert.equal(r.success, false);
  assert.equal(r.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  assert.equal(actor.system.credits, credits);
  lockClear();
});

await check('8. an already-rolled-back source is refused even if the caller presents canRollback:true', async () => {
  install();
  await call();
  const credits = actor.system.credits; const records = rollbackRecords().length;
  const r = await call({}, { canRollback: true, canReverse: true, audit: { canRollback: true, status: 'Success' } });
  assert.equal(r.success, false);
  assert.equal(r.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  assert.equal(actor.system.credits, credits);
  assert.equal(rollbackRecords().length, records);
  lockClear();
});

await check('9. a refusal releases the lock and does not poison later independent operations', async () => {
  install({ source: null });
  actor._flags[SCOPE].transactions = { tx_src: sourceRecord({ status: 'Rolled Back', rolledBackByTransactionId: 'tx_first' }), tx_other: sourceRecord({ id: 'tx_other', amount: -50, cost: 50 }) };
  const refused = await call();
  assert.equal(refused.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  lockClear();
  const ok = await call({}, { sourceTransactionId: 'tx_other', amount: 50, removeOwnedItemIds: [] });
  assert.equal(ok.success, true, 'an independent rollback still works');
  assert.equal(actor.system.credits, 950);
  lockClear();
});

await check('10. legitimate source-less corrections keep their supported behaviour (no source lookup, no source flag path)', async () => {
  install();
  const r = await call({}, { sourceTransactionId: '', removeOwnedItemIds: [] });
  assert.equal(r.success, true);
  assert.equal(actor.system.credits, 1000);
  assert.equal(rollbackRecords().length, 1);
  assert.equal(rollbackRecords()[0].rollbackOf, null);
  assert.deepEqual(Object.keys(actor._flags[SCOPE].transactions).sort(), ['tx_src', r.transactionId].sort(), 'no stub source record was created');
  assert.equal(sourceOnActor().status, 'Success', 'the unrelated record is untouched');
  const r2 = await call({}, { sourceTransactionId: undefined, removeOwnedItemIds: [], amount: 10 });
  assert.equal(r2.success, true);
  lockClear();
});

for (const [label, id, code] of [
  ['a nonempty source id with no record', 'tx_missing', 'SOURCE_TRANSACTION_NOT_FOUND'],
  ['a source id that would nest the flag path ("a.b")', 'tx_src.status', 'SOURCE_TRANSACTION_ID_INVALID'],
  ['a prototype-property source id', '__proto__', 'SOURCE_TRANSACTION_ID_INVALID'],
  ['a non-string source id', 42, 'SOURCE_TRANSACTION_ID_INVALID']
]) {
  await check(`11. ${label} fails closed (${code}); nothing is written and no stub source record is created`, async () => {
    install();
    const before = clone(actor._flags[SCOPE].transactions);
    const r = await call({}, { sourceTransactionId: id });
    assert.equal(r.success, false);
    assert.equal(r.code, code);
    assert.equal(probe.applyCalls, 0);
    assert.equal(actor.system.credits, 900);
    assert.deepEqual(actor._flags[SCOPE].transactions, before, 'no misleading source-transaction flag path was created');
    lockClear();
  });
}

await check('11b. a malformed source record (not an object) fails closed', async () => {
  install({ source: null });
  actor._flags[SCOPE].transactions = { tx_src: 'garbage' };
  const r = await call();
  assert.equal(r.success, false);
  assert.equal(r.code, 'SOURCE_TRANSACTION_MALFORMED');
  assert.equal(probe.applyCalls, 0);
  lockClear();
});

await check('12. a normal rollback failure keeps its structured recovery evidence (rollbackFailed when the restore fails) and releases the lock', async () => {
  install();
  probe.failApply = 'write refused';
  const failed = await call();
  assert.equal(failed.success, false);
  assert.match(failed.error, /write refused/);
  assert.notEqual(failed.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  assert.equal(actor.system.credits, 900, 'snapshot restored');
  assert.equal(sourceOnActor().status, 'Success', 'a failed rollback does not mark the source');
  lockClear();
  // restore failure → rollbackFailed evidence is preserved
  install();
  probe.failApply = 'write refused';
  SnapshotManager.restoreSnapshot = async () => false;
  const unresolved = await call();
  assert.equal(unresolved.success, false);
  assert.equal(unresolved.rollbackFailed, true);
  assert.match(unresolved.error, /snapshot restore failed/i);
  lockClear();
  // and the source can be rolled back later, because the failed attempt did not mark it
  install();
  const retry = await call();
  assert.equal(retry.success, true);
});

await check('13. the authoritative status is read from the LIVE actor flags while the engine\'s lock is held (never before it)', async () => {
  install();
  const r = await call();
  assert.equal(r.success, true);
  assert.ok(probe.flagReadsUnderLock >= 1, 'the source record was inspected while the rollback lock was held');
  assert.equal(probe.flagReadsOutsideLock, 0, 'no flag read happened outside the lock');
  lockClear();
});

await check('14. the status is re-read immediately before applying: a source marked Rolled Back during the awaited snapshot is not replayed', async () => {
  install();
  probe.snapshotHook = async (a) => { a._flags[SCOPE].transactions.tx_src.status = 'Rolled Back'; a._flags[SCOPE].transactions.tx_src.rolledBackByTransactionId = 'tx_raced'; };
  const r = await call();
  assert.equal(r.success, false);
  assert.equal(r.code, 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK');
  assert.equal(probe.applyCalls, 0, 'no mutation plan applied');
  assert.equal(actor.system.credits, 900);
  assert.equal(sourceOnActor().rolledBackByTransactionId, 'tx_raced', 'the other rollback\'s metadata is preserved');
  lockClear();
});

await check('15. the lock still excludes a concurrent rollback of the same actor (existing behaviour)', async () => {
  install();
  let release; const gate = new Promise((res) => { release = res; });
  probe.snapshotHook = async () => { await gate; };
  const a = call();
  await new Promise((res) => setTimeout(res, 0));
  const b = await call();
  assert.equal(b.success, false);
  assert.match(b.error, /already in progress/i);
  release();
  const ra = await a;
  assert.equal(ra.success, true);
  lockClear();
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G20 rollback replay: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
