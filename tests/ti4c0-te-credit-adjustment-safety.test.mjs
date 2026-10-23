/**
 * TI4-C0 — TransactionEngine.executeCreditAdjustment() failure contract.
 *
 * Defect: when the rollback snapshot could not be created the adjustment CONTINUED without one; if the mutation then committed credits and a later step
 * threw (e.g. the derived-data recompute after the credit write), there was nothing to restore from and the engine returned an ordinary
 * `{success:false}` — although credits had moved. Callers (and G22's refund retry) treat that as "definitely not applied".
 *
 * Required contract:
 *   - no verified rollback snapshot ⇒ the adjustment is refused BEFORE any credit mutation (definitive failure, nothing moved);
 *   - failed before the mutation started ⇒ definitive failure;
 *   - mutation attempted, failure, restore VERIFIED ⇒ definitive failure (credits restored);
 *   - mutation attempted, failure, restore failed/threw/unavailable ⇒ rollbackFailed + indeterminate + partialMutationPossible (never a plain failure);
 *   - success and pre-mutation refusals keep their existing result shapes.
 *
 * Real production code: TransactionEngine.executeCreditAdjustment + LedgerService. Narrowly injected (as in the G21 harness): ActorEngine.applyMutationPlan
 * (a model that applies `set` to a plain actor and can commit-then-throw, mirroring the real order _applySetOps → recalcAll) and SnapshotManager
 * (in-memory create/restore, each able to fail). The shim replaces the real ActorEngine, so the real applyMutationPlan ordering is established by reading
 * actor-engine.js, not by executing it. Level: L1 (one client, offline).
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.Hooks = { callAll() {}, on() {}, once() {} };

const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { swseLogger, SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const lg of [swseLogger, SWSELogger]) for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (lg?.[level]) lg[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const savedApply = ActorEngine.applyMutationPlan;
const savedCreate = SnapshotManager.createSnapshot;
const savedRestore = SnapshotManager.restoreSnapshot;
const savedGame = globalThis.game;

const probe = { apply: 0, create: 0, restore: 0 };
let actor;
function install({ credits = 900, snapshot = 'ok', applyMode = 'ok', restore = 'ok' } = {}) {
  Object.assign(probe, { apply: 0, create: 0, restore: 0 });
  actor = { id: 'A', name: 'Actor A', isOwner: true, system: { credits }, _flags: {}, flags: {}, getFlag() { return undefined; }, toObject() { return clone({ system: this.system }); } };
  globalThis.game = { ...(savedGame ?? {}), user: { id: 'gm', name: 'GM' }, actors: { get: (id) => (id === 'A' ? actor : null) } };
  let saved = null;
  SnapshotManager.createSnapshot = async (a) => {
    probe.create++;
    if (snapshot === 'throw') throw new Error('snapshot write refused');
    if (snapshot === 'null') return null;
    saved = { timestamp: probe.create, credits: a.system.credits };
    return saved;
  };
  SnapshotManager.restoreSnapshot = async (a) => {
    probe.restore++;
    if (restore === 'throw') throw new Error('restore exploded');
    if (restore === 'false') return false;
    a.system.credits = saved.credits;
    return true;
  };
  ActorEngine.applyMutationPlan = async (a, plan) => {
    probe.apply++;
    if (applyMode === 'throw-before-commit') throw new Error('plan validation failed');
    a.system.credits = plan.set['system.credits'];                        // _applySetOps committed
    if (applyMode === 'commit-then-throw') throw new Error('derived-data recompute failed');   // Phase 3 recalcAll
  };
}
const adjust = (over = {}) => TransactionEngine.executeCreditAdjustment({ actor, amount: 100, reason: 'ti4', transactionContext: 'game-credit-refund', ...over }, { source: 'ti4' });

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { ActorEngine.applyMutationPlan = savedApply; SnapshotManager.createSnapshot = savedCreate; SnapshotManager.restoreSnapshot = savedRestore; globalThis.game = savedGame; }
}

await check('1. snapshot creation throws ⇒ refused BEFORE any credit mutation; definitive failure; credits unchanged', async () => {
  install({ snapshot: 'throw' });
  const r = await adjust();
  assert.equal(r.success, false);
  assert.equal(probe.apply, 0, 'the credit mutation never started');
  assert.equal(actor.system.credits, 900);
  assert.ok(!r.indeterminate && !r.rollbackFailed && !r.partialMutationPossible, 'nothing moved: a definitive failure');
  assert.match(String(r.error), /snapshot/i);
});

await check('2. snapshot creation returns nothing ⇒ refused before any credit mutation', async () => {
  install({ snapshot: 'null' });
  const r = await adjust();
  assert.equal(r.success, false); assert.equal(probe.apply, 0); assert.equal(actor.system.credits, 900);
  assert.ok(!r.indeterminate && !r.rollbackFailed);
});

await check('3. the reported defect: credits committed, a later step throws, NO snapshot ⇒ can no longer happen (refused up front, credits not moved)', async () => {
  install({ snapshot: 'throw', applyMode: 'commit-then-throw' });
  const r = await adjust();
  assert.equal(r.success, false);
  assert.equal(actor.system.credits, 900, 'credits did not move behind a plain success:false');
});

await check('4. mutation commits, a later step throws, snapshot restore VERIFIED ⇒ definitive failure with credits restored (preserved behaviour)', async () => {
  install({ applyMode: 'commit-then-throw' });
  const r = await adjust();
  assert.equal(r.success, false); assert.equal(probe.restore, 1);
  assert.equal(actor.system.credits, 900, 'restored');
  assert.ok(!r.indeterminate && !r.rollbackFailed && !r.partialMutationPossible);
  assert.equal(r.error, 'derived-data recompute failed');
});

for (const restore of ['false', 'throw']) {
  await check(`5. mutation commits, a later step throws, restore ${restore === 'false' ? 'reports failure' : 'throws'} ⇒ rollbackFailed AND indeterminate AND partialMutationPossible`, async () => {
    install({ applyMode: 'commit-then-throw', restore });
    const r = await adjust();
    assert.equal(r.success, false);
    assert.equal(actor.system.credits, 1000, 'credits really did move (and stay moved)');
    assert.equal(r.rollbackFailed, true); assert.equal(r.indeterminate, true); assert.equal(r.partialMutationPossible, true);
    assert.match(String(r.error), /rollback failed/i);
  });
}

await check('6. plan fails BEFORE committing and the restore is verified ⇒ definitive failure (preserved)', async () => {
  install({ applyMode: 'throw-before-commit' });
  const r = await adjust();
  assert.equal(r.success, false); assert.equal(actor.system.credits, 900);
  assert.ok(!r.indeterminate && !r.rollbackFailed);
});

await check('7. success keeps its existing result shape and a snapshot is taken first', async () => {
  install();
  const r = await adjust();
  assert.equal(r.success, true); assert.equal(r.error, null);
  assert.deepEqual(Object.keys(r).sort(), ['amount', 'creditsAfter', 'creditsBefore', 'error', 'success', 'transactionId']);
  assert.equal(r.creditsBefore, 900); assert.equal(r.creditsAfter, 1000); assert.equal(r.amount, 100);
  assert.equal(probe.create, 1); assert.equal(probe.apply, 1); assert.equal(actor.system.credits, 1000);
});

await check('8. pre-mutation refusals are unchanged definitive failures and take no snapshot', async () => {
  install();
  for (const [label, call, pattern] of [
    ['no actor', () => TransactionEngine.executeCreditAdjustment({ actor: null, amount: 5, transactionContext: 'game-credit-refund' }), /No actor/],
    ['zero amount', () => adjust({ amount: 0 }), /non-zero/],
    ['unsupported context', () => adjust({ transactionContext: 'not-a-context' }), /Unsupported/],
    ['insufficient credits', () => adjust({ amount: -5000 }), /Insufficient credits/]
  ]) {
    const r = await call();
    assert.equal(r.success, false, label); assert.match(String(r.error), pattern, label);
    assert.ok(!r.indeterminate && !r.rollbackFailed && !r.partialMutationPossible, label);
  }
  assert.equal(probe.create, 0, 'no snapshot is taken for a refused request'); assert.equal(probe.apply, 0); assert.equal(actor.system.credits, 900);
});

await check('9. the lock is released after every outcome (a refused or indeterminate adjustment does not wedge later ones)', async () => {
  install({ snapshot: 'throw' });
  assert.equal((await adjust()).success, false);
  install();
  assert.equal((await adjust()).success, true);
  install({ applyMode: 'commit-then-throw', restore: 'false' });
  assert.equal((await adjust()).indeterminate, true);
  install();
  assert.equal((await adjust()).success, true);
});

await check('10. caller-visible contract: every failure carries `success:false`, a string `error` and a `transactionId`; indeterminate outcomes are a superset of the old rollbackFailed result', async () => {
  const outcomes = [];
  for (const cfg of [{ snapshot: 'throw' }, { applyMode: 'throw-before-commit' }, { applyMode: 'commit-then-throw' }, { applyMode: 'commit-then-throw', restore: 'false' }]) {
    install(cfg); outcomes.push(await adjust());
  }
  for (const r of outcomes) { assert.equal(r.success, false); assert.equal(typeof r.error, 'string'); assert.match(String(r.transactionId), /^tx_/); }
  const unverified = outcomes[3];
  assert.equal(unverified.rollbackFailed, true, 'callers that already key on rollbackFailed keep working');
});

await check('11. a failure BEFORE the mutation starts (credit read throws) is a definitive failure: no snapshot restore, not indeterminate', async () => {
  install();
  Object.defineProperty(actor, 'system', { get() { throw new Error('actor data unavailable'); }, configurable: true });
  const r = await adjust();
  assert.equal(r.success, false); assert.equal(probe.apply, 0); assert.equal(probe.restore, 0);
  assert.ok(!r.indeterminate && !r.rollbackFailed && !r.partialMutationPossible);
});

const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 TransactionEngine credit-adjustment safety: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
