/**
 * TI4-C0 / G21 — the legacy GM Store Dashboard's transaction reversal must converge on the canonical, G20-protected rollback authority.
 *
 * Real production code under test: GMStoreDashboard (_loadTransactionHistory / _reverseTransaction), GMStoreOperationsService
 * (rollbackTransaction / the new stable-id entry point), TransactionEngine (getActorTransactions, executeRollbackCorrection incl. the G20 guard) and
 * LedgerService. Narrowly injected: the shim ActorEngine.applyMutationPlan (a model applying `set` and `delete.items`), SnapshotManager (in-memory),
 * and the dialog layer (SWSEDialogV2.prompt / .confirm, recorded). Level: L1 (one client, offline).
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const notes = { info: [], warn: [], error: [] };
globalThis.ui = { notifications: { info: (m) => notes.info.push(String(m)), warn: (m) => notes.warn.push(String(m)), error: (m) => notes.error.push(String(m)) } };
globalThis.Hooks = { callAll() {}, on() {}, once() {} };

const { GMStoreDashboard } = await import('/systems/foundryvtt-swse/scripts/apps/gm-store-dashboard.js');
const { GMStoreOperationsService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMStoreOperationsService.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const lg of [swseLogger, SWSELogger]) for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (lg?.[level]) lg[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = clone(v); };
const SCOPE = 'foundryvtt-swse';
const GM = { isGM: true, id: 'gm1', name: 'GM' };

/* ---- harness ---- */
const probe = { applyCalls: 0, creditAdjustCalls: [], dialogs: [], prompts: [], confirms: [], promptAnswer: 'GM reason', confirmAnswer: true, failApply: null, appliedBeforePrompt: null };
let actors = [];
function mkActor(id, name, credits, transactions, itemNames = ['Blaster', 'Armor']) {
  const a = { id, name, type: 'character', isOwner: true, system: { credits }, _flags: { [SCOPE]: { transactions } },
    items: itemNames.map((n, i) => ({ id: `${id}-item${i}`, name: n, type: 'weapon', flags: {} })),
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }, toObject() { return clone({ system: this.system, items: this.items, flags: this._flags }); } };
  Object.defineProperty(a, 'flags', { get() { return a._flags; } });
  a.items.get = (x) => a.items.find((i) => i.id === x) ?? null;
  return a;
}
const buy = (id, over = {}) => ({ id, context: 'store-purchase', type: 'Buy', status: 'Success', amount: -100, cost: 100, creditsBefore: 1000, creditsAfter: 900, createdAt: Number(over.createdAt ?? 1000),
  actorId: over.actorId ?? 'buyer', actorName: over.actorName ?? 'Buyer', audit: { items: [{ id: 'pol-blaster', name: 'Blaster', type: 'weapon', quantity: 1 }] }, ...over });
function install({ transactions, credits = 900, extraActors = [] } = {}) {
  Object.assign(probe, { applyCalls: 0, creditAdjustCalls: [], dialogs: [], prompts: [], confirms: [], promptAnswer: 'GM reason', confirmAnswer: true, failApply: null, appliedBeforePrompt: null });
  notes.info.length = 0; notes.warn.length = 0; notes.error.length = 0;
  const buyer = mkActor('buyer', 'Buyer', credits, transactions ?? { tx_src: buy('tx_src') });
  actors = [buyer, ...extraActors];
  globalThis.game = { ...(globalThis.game ?? {}), actors: Object.assign([...actors], { get: (id) => actors.find((a) => a.id === id) ?? null, filter: (f) => actors.filter(f) }), user: { ...GM }, users: { get: () => GM }, settings: { get: () => undefined } };
  ActorEngine.applyMutationPlan = async (a, plan) => {
    probe.applyCalls += 1;
    if (probe.failApply) throw new Error(probe.failApply);
    for (const [k, v] of Object.entries(plan.set ?? {})) setPath({ system: a.system, flags: a._flags }, k, v);
    for (const id of plan.delete?.items ?? []) { a.items = Object.assign(a.items.filter((i) => i.id !== id), { get: (x) => a.items.find((i) => i.id === x) ?? null }); }
  };
  const store = new Map();
  SnapshotManager.createSnapshot = async (a, label) => { const ts = store.size + 1; store.set(ts, { schemaVersion: 2, scope: 'full-actor', timestamp: ts, label, data: clone({ credits: a.system.credits, items: a.items, flags: a._flags }) }); return store.get(ts); };
  SnapshotManager.getSnapshot = (a, ts) => store.get(ts) ?? null;
  SnapshotManager.restoreSnapshot = async (a, ts) => { const s = store.get(ts); a.system.credits = s.data.credits; a._flags = clone(s.data.flags); a.items = Object.assign(clone(s.data.items), { get: (x) => a.items.find((i) => i.id === x) ?? null }); return true; };
  const realAdjust = TransactionEngine.executeCreditAdjustment;
  TransactionEngine.executeCreditAdjustment = async function (ctx, opts) { probe.creditAdjustCalls.push({ context: ctx?.transactionContext, source: opts?.source }); return realAdjust.call(this, ctx, opts); };
  probe.restoreAdjust = () => { TransactionEngine.executeCreditAdjustment = realAdjust; };
  SWSEDialogV2.prompt = async (opts) => { probe.prompts.push(opts); probe.appliedBeforePrompt = probe.applyCalls; return probe.promptAnswer === null ? null : (probe.promptAnswer ?? 'reason'); };
  SWSEDialogV2.confirm = async (opts) => { probe.confirms.push(opts); return probe.confirmAnswer; };
  const dash = new GMStoreDashboard();
  dash.renders = 0; dash.render = () => { dash.renders++; };
  return { buyer, dash };
}
const savedPrompt = SWSEDialogV2.prompt; const savedConfirm = SWSEDialogV2.confirm; const savedApply = ActorEngine.applyMutationPlan;
const savedSnap = { c: SnapshotManager.createSnapshot, g: SnapshotManager.getSnapshot, r: SnapshotManager.restoreSnapshot };
function restoreAll() {
  probe.restoreAdjust?.(); probe.restoreAdjust = null;
  SWSEDialogV2.prompt = savedPrompt; SWSEDialogV2.confirm = savedConfirm; ActorEngine.applyMutationPlan = savedApply;
  SnapshotManager.createSnapshot = savedSnap.c; SnapshotManager.getSnapshot = savedSnap.g; SnapshotManager.restoreSnapshot = savedSnap.r;
  TransactionEngine._mutationLocks.clear();
}
const rollbackRecords = (a) => Object.values(a._flags[SCOPE].transactions).filter((r) => r.type === 'Rollback');
const src = (a, id = 'tx_src') => a._flags[SCOPE].transactions[id];
/** exactly what the OLD click handler did: resolve the row by its rendered array index, then call _reverseTransaction(index) */
async function legacyClick(dash, txId) { await dash._loadTransactionHistory(); const idx = dash.transactions.findIndex((t) => t.transactionId === txId); return dash._reverseTransaction(idx); }
/** the new contract: the button carries stable ids */
const click = (dash, txId, actorId = 'buyer') => dash._reverseTransaction(txId, actorId);

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---------------------------------------------------------------------------------------------- */
/* the defect, through the legacy index route                                                         */
/* ---------------------------------------------------------------------------------------------- */
await check('1. the legacy route no longer bypasses the G20 guard: no direct executeCreditAdjustment reversal is made', async () => {
  const { dash } = install();
  await legacyClick(dash, 'tx_src');
  assert.equal(probe.creditAdjustCalls.filter((c) => c.context === 'store-rollback-correction').length, 0, 'the legacy store-rollback-correction credit adjustment must not be reachable');
});

await check('2. reversing the same source twice through the legacy route can never credit the actor twice', async () => {
  const { buyer, dash } = install();
  await legacyClick(dash, 'tx_src');
  await legacyClick(dash, 'tx_src');
  assert.ok(buyer.system.credits <= 1000, `credits ${buyer.system.credits}: at most one reversal may ever apply (900 + 100)`);
});

/* ---------------------------------------------------------------------------------------------- */
/* canonical convergence                                                                              */
/* ---------------------------------------------------------------------------------------------- */
await check('3+4. a stable-id reversal delegates to the canonical service and marks the correct source with its rollback identity', async () => {
  const { buyer, dash } = install();
  const calls = []; const real = GMStoreOperationsService.rollbackTransaction;
  GMStoreOperationsService.rollbackTransaction = async function (index, ctx) { calls.push({ index, ctx }); return real.call(this, index, ctx); };
  try {
    await click(dash, 'tx_src');
  } finally { GMStoreOperationsService.rollbackTransaction = real; }
  assert.equal(calls.length, 1, 'the canonical service was used exactly once');
  assert.equal(calls[0].ctx.transactions.length, 1);
  assert.equal(calls[0].ctx.transactions[0].transactionId, 'tx_src');
  assert.equal(calls[0].ctx.transactions[0].actorId, 'buyer');
  assert.equal(probe.creditAdjustCalls.length, 0, 'no direct credit adjustment');
  assert.equal(buyer.system.credits, 1000);
  const rb = rollbackRecords(buyer);
  assert.equal(rb.length, 1);
  assert.equal(src(buyer).status, 'Rolled Back');
  assert.equal(src(buyer).rolledBackByTransactionId, rb[0].id);
  assert.equal(rb[0].rollbackOf, 'tx_src');
  assert.deepEqual(buyer.items.map((i) => i.name), ['Armor'], 'the purchased Item was removed through the canonical reconciliation');
  assert.equal(notes.info.length, 1, 'one success notification');
  assert.equal(dash.renders, 1, 'the dashboard refreshed');
});

await check('5. a second reversal of the same source is rejected: no credits, no Items, no record, no success notice', async () => {
  const { buyer, dash } = install();
  await click(dash, 'tx_src');
  const credits = buyer.system.credits; const items = buyer.items.map((i) => i.id); const before = clone(buyer._flags[SCOPE].transactions); const infoBefore = notes.info.length;
  const prompts = probe.prompts.length;
  const r = await click(dash, 'tx_src');
  assert.notEqual(r?.success, true);
  assert.equal(buyer.system.credits, credits);
  assert.deepEqual(buyer.items.map((i) => i.id), items);
  assert.deepEqual(buyer._flags[SCOPE].transactions, before, 'no transaction record created or modified');
  assert.equal(notes.info.length, infoBefore, 'no success notification');
  assert.ok(notes.error.concat(notes.warn).some((m) => /already.*rolled back/i.test(m)), 'the refusal is communicated accurately');
  assert.equal(probe.prompts.length, prompts, 'the GM is not even asked to confirm an impossible reversal');
});

await check('6. a stale rendered index cannot reverse a different transaction (identity comes from the clicked row\'s ids)', async () => {
  const { buyer, dash } = install({ transactions: { tx_a: buy('tx_a', { createdAt: 2000, audit: { items: [{ name: 'Blaster', type: 'weapon', quantity: 1 }] } }), tx_b: buy('tx_b', { createdAt: 1000, amount: -50, cost: 50, audit: { items: [{ name: 'Armor', type: 'armor', quantity: 1 }] } }) } });
  await dash._loadTransactionHistory();
  const idxOfA = dash.transactions.findIndex((t) => t.transactionId === 'tx_a');
  dash.transactions = [...dash.transactions].reverse();           // the list was reordered after the rows were rendered
  assert.notEqual(dash.transactions[idxOfA].transactionId, 'tx_a', 'precondition: the stale index now points at the OTHER transaction');
  await click(dash, 'tx_a');
  assert.equal(src(buyer, 'tx_a').status, 'Rolled Back');
  assert.equal(src(buyer, 'tx_b').status, 'Success', 'the other transaction was not reversed');
  assert.equal(buyer.system.credits, 1000, '+100 for tx_a only');
  // the numeric index API no longer exists as an identity: it is refused outright
  const credits = buyer.system.credits;
  await dash._reverseTransaction(0);
  assert.equal(buyer.system.credits, credits);
  assert.equal(src(buyer, 'tx_b').status, 'Success');
});

for (const [label, build] of [
  ['an unknown transaction id', () => ['tx_nope', 'buyer']],
  ['a blank transaction id', () => ['', 'buyer']],
  ['a blank actor id', () => ['tx_src', '']],
  ['an actor that does not exist', () => ['tx_src', 'ghost']],
  ['a transaction that belongs to a DIFFERENT actor than the one named', () => ['tx_other', 'buyer']]
]) {
  await check(`7. ${label} fails closed: no prompt, no mutation, no success notice`, async () => {
    const other = mkActor('other', 'Other', 500, { tx_other: buy('tx_other', { actorId: 'other', actorName: 'Other' }) });
    const { buyer, dash } = install({ extraActors: [other] });
    const [tid, aid] = build();
    const r = await dash._reverseTransaction(tid, aid);
    assert.notEqual(r?.success, true);
    assert.equal(probe.applyCalls, 0);
    assert.equal(probe.prompts.length, 0);
    assert.equal(buyer.system.credits, 900);
    assert.equal(other.system.credits, 500);
    assert.equal(notes.info.length, 0);
    assert.ok(notes.error.length + notes.warn.length >= 1, 'the GM is told why');
  });
}

await check('7b. an ambiguous transaction id (two ledger records claiming it) fails closed', async () => {
  const { buyer, dash } = install({ transactions: { k1: buy('tx_dup'), k2: buy('tx_dup', { createdAt: 3000 }) } });
  const r = await click(dash, 'tx_dup');
  assert.notEqual(r?.success, true);
  assert.equal(r?.error, 'transaction-ambiguous', 'refused as ambiguous before any confirmation');
  assert.equal(probe.prompts.length, 0);
  assert.equal(probe.applyCalls, 0);
  assert.equal(buyer.system.credits, 900);
});

await check('7c. a ledger record stored on the named actor but claiming another actor id fails closed before any confirmation', async () => {
  const { buyer, dash } = install({ transactions: { tx_x: buy('tx_x', { actorId: 'other', actorName: 'Other' }) } });
  const r = await click(dash, 'tx_x');
  assert.notEqual(r?.success, true);
  assert.equal(r?.error, 'transaction-actor-mismatch');
  assert.equal(probe.prompts.length, 0);
  assert.equal(probe.applyCalls, 0);
  assert.equal(buyer.system.credits, 900);
});

await check('8. cancelling the confirmation causes no mutation and no success notice', async () => {
  const { buyer, dash } = install();
  probe.promptAnswer = null;
  const r = await click(dash, 'tx_src');
  assert.equal(r?.success, false);
  assert.equal(r?.cancelled, true);
  assert.equal(probe.applyCalls, 0);
  assert.equal(buyer.system.credits, 900);
  assert.equal(buyer.items.length, 2);
  assert.equal(src(buyer).status, 'Success');
  assert.equal(notes.info.length, 0);
  assert.equal(dash.renders, 0);
});

await check('9. the reversal scope (credits AND owned Items) is disclosed before confirmation, and nothing is mutated before it', async () => {
  const { dash } = install();
  await click(dash, 'tx_src');
  assert.equal(probe.prompts.length, 1, 'the canonical confirmation was shown');
  assert.equal(probe.appliedBeforePrompt, 0, 'no mutation before the GM answered');
  const text = `${probe.prompts[0].title ?? ''} ${probe.prompts[0].content ?? ''}`;
  assert.match(text, /Credit adjustment:\s*\+100/i);
  assert.match(text, /Owned items to remove:\s*1/i);
  assert.equal(probe.confirms.length, 0, 'the old credits-only confirmation ("inventory items are not affected") is gone');
  assert.doesNotMatch(text, /not restored or removed|credits only|Ledger Correction Only/i);
});

await check('10. an engine failure shows an error and no success notice; the source stays unmarked', async () => {
  const { buyer, dash } = install();
  probe.failApply = 'write refused';
  const r = await click(dash, 'tx_src');
  assert.notEqual(r?.success, true);
  assert.equal(notes.info.length, 0);
  assert.ok(notes.error.some((m) => /write refused|roll back/i.test(m)));
  assert.equal(src(buyer).status, 'Success');
  assert.equal(buyer.system.credits, 900);
  assert.equal(dash.renders, 0);
});

await check('11. GM-only: a non-GM user cannot reverse anything', async () => {
  const { buyer, dash } = install();
  globalThis.game.user = { isGM: false, id: 'p1', name: 'Player' };
  const r = await click(dash, 'tx_src');
  assert.notEqual(r?.success, true);
  assert.equal(probe.applyCalls, 0);
  assert.equal(probe.prompts.length, 0);
  assert.equal(buyer.system.credits, 900);
});

await check('12. the canonical GM Datapad path is unchanged: it still reverses by index, and still honours its own canRollback gate', async () => {
  const { buyer } = install();
  const rows = TransactionEngine.getActorTransactions(buyer, { includeZeroCost: true }).map((t) => ({ transactionId: t.transactionId, actor: t.actorName, actorId: t.actorId, item: t.itemName, amount: t.amount, context: t.context, audit: t.audit, canRollback: true }));
  const refused = await GMStoreOperationsService.rollbackTransaction(0, { transactions: [{ ...rows[0], canRollback: false }], render: () => {} });
  assert.equal(refused.success, false);
  assert.equal(refused.error, 'transaction-not-rollbackable');
  assert.equal(probe.applyCalls, 0);
  const ok = await GMStoreOperationsService.rollbackTransaction(0, { transactions: rows, render: () => {} });
  assert.equal(ok.success, true);
  assert.equal(buyer.system.credits, 1000);
  assert.equal(src(buyer).status, 'Rolled Back');
  const replay = await GMStoreOperationsService.rollbackTransaction(0, { transactions: rows, render: () => {} });
  assert.equal(replay.success, false, 'a stale datapad row with canRollback:true is still stopped by the G20 engine guard');
  assert.equal(buyer.system.credits, 1000);
});

/* ---------------------------------------------------------------------------------------------- */
/* projection + historical records                                                                    */
/* ---------------------------------------------------------------------------------------------- */
await check('13. historical / source-less records: rollback rows, zero-impact rows, id-less records and already-rolled-back sources are not reversible', async () => {
  const { dash } = install({ transactions: {
    tx_ok: buy('tx_ok', { createdAt: 5000 }),
    tx_rb: { id: 'tx_rb', context: 'store-rollback-reconciliation', type: 'Rollback', status: 'Success', amount: 100, cost: 100, createdAt: 4000, actorId: 'buyer', rollbackOf: 'tx_done', audit: {} },
    tx_done: buy('tx_done', { createdAt: 3000, status: 'Rolled Back', rolledBackByTransactionId: 'tx_rb' }),
    tx_noid: { context: 'store-purchase', type: 'Buy', status: 'Success', amount: -20, cost: 20, createdAt: 2000, actorId: 'buyer', audit: {} }
  } });
  await dash._loadTransactionHistory();
  const by = Object.fromEntries(dash.transactions.map((t) => [t.transactionId || '(none)', t]));
  assert.equal(by.tx_ok.canRollback, true);
  assert.equal(by.tx_rb.canRollback, false, 'a rollback record cannot itself be rolled back');
  assert.equal(by.tx_done.canRollback, false, 'an already-rolled-back source offers no action after a refresh');
  assert.equal(by.tx_done.status, 'Rolled Back');
  assert.equal(by['(none)'].canRollback, false, 'a record with no stable id cannot be addressed');
  const r = await dash._reverseTransaction('tx_done', 'buyer');
  assert.notEqual(r?.success, true);
  assert.equal(probe.applyCalls, 0);
});

await check('14. after a successful reversal and a refresh the source row offers no reversal action (no restored button)', async () => {
  const { dash } = install();
  await dash._loadTransactionHistory();
  assert.equal(dash.transactions.find((t) => t.transactionId === 'tx_src').canRollback, true);
  await click(dash, 'tx_src');
  await dash._loadTransactionHistory();
  const row = dash.transactions.find((t) => t.transactionId === 'tx_src');
  assert.equal(row.canRollback, false);
  assert.equal(row.status, 'Rolled Back');
  assert.ok(dash.transactions.some((t) => t.type === 'Rollback' && t.canRollback === false), 'the rollback record itself is listed but not reversible');
});

/* ---------------------------------------------------------------------------------------------- */
/* supplementary structural guards                                                                    */
/* ---------------------------------------------------------------------------------------------- */
await check('15. (supplementary) the template carries stable ids, is gated by canRollback, and no longer promises a credits-only correction', async () => {
  const hbs = await readFile(new URL('../templates/apps/gm-store-dashboard.hbs', import.meta.url), 'utf8');
  const start = hbs.indexOf('data-action="reverse-transaction"');
  assert.ok(start > 0);
  const row = hbs.slice(Math.max(0, start - 400), start + 700);
  assert.match(row, /data-transaction-id="\{\{this\.transactionId\}\}"/);
  assert.match(row, /data-actor-id="\{\{this\.actorId\}\}"/);
  assert.match(row, /\{\{#if this\.canRollback\}\}/);
  assert.doesNotMatch(row, /Adjust Credits/);
  assert.doesNotMatch(row, /inventory items are not affected/i);
  assert.match(row, /owned items|Items/i, 'the tooltip says the rollback can also remove owned Items');
  assert.doesNotMatch(row, /data-index=/, 'the reverse button no longer carries a rendered index');
});

await check('16. (supplementary) the dashboard source has no reachable direct credit-adjustment reversal and its click handler passes ids, not an index', async () => {
  const js = await readFile(new URL('../scripts/apps/gm-store-dashboard.js', import.meta.url), 'utf8');
  const start = js.indexOf('async _reverseTransaction(');
  const end = js.indexOf('async _resolvePendingSale(', start);
  const body = js.slice(start, end);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(body, /executeCreditAdjustment/);
  assert.doesNotMatch(js, /store-rollback-correction/);
  assert.match(body, /GMStoreOperationsService\.rollbackTransactionById/);
  const handler = js.slice(js.indexOf('data-action="reverse-transaction"'), js.indexOf('// Pending sale actions'));
  assert.match(handler, /dataset\.transactionId/);
  assert.match(handler, /dataset\.actorId/);
  assert.doesNotMatch(handler, /dataset\.index/);
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G21 legacy dashboard reversal: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
