/**
 * TI4-C0 / G24 — the legacy GM Store Dashboard must resolve a pending sale by its STABLE request id, never by its rendered array position, and
 * must do so through the canonical GMStoreOperationsService.resolvePendingSaleRequest (no second copy of the sale logic).
 *
 * Real production code under test: GMStoreDashboard (_resolvePendingSale + the rendered template), GMStoreOperationsService.resolvePendingSaleRequest.
 * Narrowly injected: SettingsHelper (an in-memory `pendingSales` setting), TransactionEngine.executeSaleTransaction (a recording model that removes the
 * item and credits the actor — the engine's own sale logic is certified elsewhere), game.actors, notifications and Hooks (recorded).
 * Level: L1 (one client, offline). The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
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
const hookCalls = [];
globalThis.Hooks = { callAll: (name, payload) => { hookCalls.push({ name, payload }); }, on() {}, once() {} };

const { GMStoreDashboard } = await import('/systems/foundryvtt-swse/scripts/apps/gm-store-dashboard.js');
const { GMStoreOperationsService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMStoreOperationsService.js');
const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { SettingsHelper } = await import('/systems/foundryvtt-swse/scripts/utils/settings-helper.js');
const { swseLogger, SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const lg of [swseLogger, SWSELogger]) for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (lg?.[level]) lg[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const store = { pendingSales: [] };
const savedGetArray = SettingsHelper.getArray; const savedSet = SettingsHelper.set;
const savedSale = TransactionEngine.executeSaleTransaction; const savedGame = globalThis.game;
const probe = { saleCalls: [], gate: null, gates: {}, failSale: false, setDelay: 0, failSet: false, shared: false };
let actors = {};

const mkActor = (id, itemIds) => ({ id, name: `Actor ${id}`, system: { credits: 1000 },
  items: Object.assign(itemIds.map((i) => ({ id: i, name: `Item ${i}` })), { get(x) { return this.find((i) => i.id === x) ?? null; } }) });
const sale = (id, over = {}) => ({ id, actorId: 'A', actor: 'Actor A', itemId: `item_${id}`, item: `Item ${id}`, value: 100, requestedPrice: 100, suggestedPrice: 100, status: 'Pending', timestamp: 1000, ...over });

function install(requests, { owners = {} } = {}) {
  Object.assign(probe, { saleCalls: [], gate: null, gates: {}, failSale: false, setDelay: 0, failSet: false, shared: false });
  notes.info.length = 0; notes.warn.length = 0; notes.error.length = 0; hookCalls.length = 0;
  store.pendingSales = clone(requests);
  SettingsHelper.getArray = (key, def = []) => (probe.shared && store[key] ? store[key] : clone(store[key] ?? def));   // `shared`: the live array, as a settings getter may return
  SettingsHelper.set = async (key, value) => {
    if (probe.setDelay) await new Promise((res) => setTimeout(res, probe.setDelay));   // a world-setting write is not instantaneous
    if (probe.failSet) throw new Error('settings write refused');
    store[key] = clone(value);
  };
  actors = { A: mkActor('A', requests.map((r) => r?.itemId ?? `item_${r?.id}`)) };
  for (const [id, items] of Object.entries(owners)) actors[id] = mkActor(id, items);
  globalThis.game = { ...(savedGame ?? {}), user: { id: 'gm', name: 'GM', isGM: true }, actors: { get: (id) => actors[id] ?? null } };
  TransactionEngine.executeSaleTransaction = async (ctx) => {
    probe.saleCalls.push({ itemId: ctx.itemId, salePrice: ctx.salePrice, context: ctx.transactionContext, requestId: ctx.audit?.requestId, source: ctx.audit?.source });
    if (probe.gate) await probe.gate;
    if (probe.gates[ctx.itemId]) await probe.gates[ctx.itemId];
    if (probe.failSale) return { success: false, error: 'sale refused' };
    const a = ctx.actor; const idx = a.items.findIndex((i) => i.id === ctx.itemId);
    if (idx < 0) return { success: false, error: 'item missing' };
    a.items.splice(idx, 1); a.system.credits += ctx.salePrice;
    return { success: true, transactionId: `tx_${probe.saleCalls.length}`, error: null };
  };
  const dash = new GMStoreDashboard(); dash.renders = 0; dash.render = () => { dash.renders++; };
  return dash;
}
function restoreAll() { SettingsHelper.getArray = savedGetArray; SettingsHelper.set = savedSet; TransactionEngine.executeSaleTransaction = savedSale; globalThis.game = savedGame; }
const queueIds = () => store.pendingSales.map((r) => r.id);
/** exactly what the OLD click handler did: the rendered row index of the clicked request, then `_resolvePendingSale(index, …)` */
async function legacyIndexClick(dash, renderedQueue, requestId, action = 'accept', amount = null) {
  const index = renderedQueue.findIndex((r) => r.id === requestId);
  return dash._resolvePendingSale(index, action, amount);
}

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---------------------------------------------------------------------------------------------- */
/* the defect: a stale rendered index resolves a different sale                                         */
/* ---------------------------------------------------------------------------------------------- */
await check('1. a stale rendered INDEX can no longer approve a different sale after an earlier request left the queue', async () => {
  const q = [sale('r1'), sale('r2'), sale('r3')];
  const dash = install(q);
  const rendered = clone(q);                                   // the GM sees r1, r2, r3 and clicks Approve on r2 (rendered index 1)
  store.pendingSales = [sale('r2'), sale('r3')];               // meanwhile r1 is resolved elsewhere: r3 now sits at the clicked index
  await legacyIndexClick(dash, rendered, 'r3');                // the GM clicked r3 (rendered index 2): that index no longer exists
  await legacyIndexClick(dash, rendered, 'r2');                // the GM clicked r2 (rendered index 1): that index is now r3
  assert.equal(probe.saleCalls.some((c) => c.requestId === 'r3'), false, 'the sale that slid into the clicked position (r3) was NOT approved');
  assert.deepEqual(queueIds(), ['r2', 'r3'], 'nothing was removed from the queue by a positional click');
});

await check('2. a stale rendered INDEX can no longer DENY a different sale', async () => {
  const q = [sale('r1'), sale('r2')];
  const dash = install(q); const rendered = clone(q);
  store.pendingSales = [sale('r2')];                           // r1 resolved elsewhere; r2 slid to index 0
  await legacyIndexClick(dash, rendered, 'r1', 'deny');       // the GM clicked Deny on r1 (index 0) — which is now r2
  assert.deepEqual(queueIds(), ['r2'], 'r2 was not denied/removed by a click that targeted r1');
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleDenied').length, 0);
});

await check('2b. a numeric index is refused outright as an identity (no fallback to position, even when the position is valid)', async () => {
  const dash = install([sale('r1'), sale('r2')]);
  for (const bad of [0, 1, '0', 2, -1, NaN, null, undefined, {}]) {
    await dash._resolvePendingSale(bad, 'accept'); await dash._resolvePendingSale(bad, 'deny');
  }
  assert.equal(probe.saleCalls.length, 0);
  assert.deepEqual(queueIds(), ['r1', 'r2']);
  assert.equal(hookCalls.length, 0);
});

/* ---------------------------------------------------------------------------------------------- */
/* stable-id contract                                                                                 */
/* ---------------------------------------------------------------------------------------------- */
await check('3. approve by request id after the queue was reordered / an earlier entry removed resolves EXACTLY the selected request', async () => {
  const dash = install([sale('r1'), sale('r2'), sale('r3')]);
  store.pendingSales = [sale('r3'), sale('r2')];               // reordered, r1 removed
  const r = await dash._resolvePendingSale('r2', 'accept');
  assert.equal(r.success, true);
  assert.deepEqual(probe.saleCalls.map((c) => c.requestId), ['r2']);
  assert.deepEqual(queueIds(), ['r3']);
  assert.equal(actors.A.system.credits, 1100); assert.equal(actors.A.items.get('item_r2'), null); assert.ok(actors.A.items.get('item_r3'));
});

await check('4. deny by request id removes exactly that request, sells nothing and fires the denial hook with the right request', async () => {
  const dash = install([sale('r1'), sale('r2')]);
  store.pendingSales = [sale('r2'), sale('r1')];
  const r = await dash._resolvePendingSale('r1', 'deny');
  assert.equal(r.success, true);
  assert.deepEqual(queueIds(), ['r2']); assert.equal(probe.saleCalls.length, 0); assert.equal(actors.A.system.credits, 1000);
  const denied = hookCalls.filter((h) => h.name === 'swseStoreSaleDenied');
  assert.equal(denied.length, 1); assert.equal(denied[0].payload.request.id, 'r1');
  assert.equal(dash.renders, 1, 'the dashboard refreshed');
});

await check('5. a custom (Set Amount) sale resolves the selected request at that amount, through the canonical approval context', async () => {
  const dash = install([sale('r1'), sale('r2')]);
  store.pendingSales = [sale('r2'), sale('r1')];
  const r = await dash._resolvePendingSale('r1', 'accept', 250);
  assert.equal(r.success, true);
  assert.equal(probe.saleCalls.length, 1); assert.equal(probe.saleCalls[0].requestId, 'r1'); assert.equal(probe.saleCalls[0].salePrice, 250); assert.equal(probe.saleCalls[0].context, 'store-sale-approval');
  assert.equal(actors.A.system.credits, 1250); assert.deepEqual(queueIds(), ['r2']);
});

await check('6. normal approval keeps its behaviour: sale executed once at the requested price, request removed, success notice, approval hook, refresh', async () => {
  const dash = install([sale('r1', { requestedPrice: 120 })]);
  const r = await dash._resolvePendingSale('r1', 'accept');
  assert.equal(r.success, true);
  assert.equal(probe.saleCalls.length, 1); assert.equal(probe.saleCalls[0].salePrice, 120);
  assert.deepEqual(queueIds(), []);
  assert.equal(notes.info.length, 1); assert.match(notes.info[0], /Approved/i);
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleApproved').length, 1);
  assert.equal(dash.renders, 1);
});

await check('7. the dashboard has no second copy of the sale logic: it delegates to GMStoreOperationsService.resolvePendingSaleRequest and never calls the engine itself', async () => {
  const dash = install([sale('r1'), sale('r2')]);
  const calls = []; const real = GMStoreOperationsService.resolvePendingSaleRequest;
  GMStoreOperationsService.resolvePendingSaleRequest = async function (...args) { calls.push(args); return real.apply(this, args); };
  try { await dash._resolvePendingSale('r2', 'accept', 90); await dash._resolvePendingSale('r1', 'deny'); }
  finally { GMStoreOperationsService.resolvePendingSaleRequest = real; }
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'r2'); assert.equal(calls[0][1].decision, 'approve'); assert.equal(calls[0][1].amount, 90);
  assert.equal(calls[1][0], 'r1'); assert.equal(calls[1][1].decision, 'deny');
  const source = await readFile(new URL('../scripts/apps/gm-store-dashboard.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('async _resolvePendingSale('), source.indexOf('async _previewPendingCustom('));
  assert.ok(!/executeSaleTransaction|splice\(|pendingSales\[/.test(body), '_resolvePendingSale contains no sale execution, splice or positional lookup');
});

/* ---------------------------------------------------------------------------------------------- */
/* conservative identity handling                                                                     */
/* ---------------------------------------------------------------------------------------------- */
await check('8. a missing, blank or unknown request id resolves nothing (no match against an id-less request, no position fallback)', async () => {
  const idless = { actorId: 'A', actor: 'Actor A', itemId: 'item_x', item: 'Item x', value: 100, status: 'Pending' };
  const dash = install([idless, sale('r2')]);
  for (const bad of ['', '   ', undefined, null, 'ghost']) {
    for (const action of ['accept', 'deny']) await dash._resolvePendingSale(bad, action, action === 'accept' ? 75 : null);
  }
  assert.equal(probe.saleCalls.length, 0);
  assert.equal(store.pendingSales.length, 2);
  assert.equal(hookCalls.length, 0);
  assert.ok(notes.error.length >= 1, 'the GM is told why');
});

await check('8b. the canonical service itself (also used by the GM Datapad) refuses blank / missing / non-scalar ids and never matches an id-less request', async () => {
  const idless = { actorId: 'A', actor: 'Actor A', itemId: 'item_x', item: 'Item x', value: 100, status: 'Pending' };
  install([idless, { ...idless, id: '', itemId: 'item_y' }, { ...idless, id: null, itemId: 'item_z' }, sale('r2')]);
  actors.A = mkActor('A', ['item_x', 'item_y', 'item_z', 'item_r2']);
  for (const bad of [undefined, null, '', '   ', {}, [], 0, false]) {
    for (const decision of ['approve', 'deny', 'counteroffer']) {
      const r = await GMStoreOperationsService.resolvePendingSaleRequest(bad, { decision, amount: 60 }, {});
      assert.notEqual(r?.success, true, `${JSON.stringify(bad)} / ${decision}`);
    }
  }
  assert.equal(probe.saleCalls.length, 0); assert.equal(store.pendingSales.length, 4); assert.equal(hookCalls.length, 0);
});

await check('8c. the canonical service refuses duplicate ids for every decision, and a concurrent repeat for the same id', async () => {
  install([sale('dup', { itemId: 'item_a' }), sale('dup', { itemId: 'item_b' })]);
  actors.A = mkActor('A', ['item_a', 'item_b']);
  for (const decision of ['approve', 'counteroffer', 'deny']) {
    const r = await GMStoreOperationsService.resolvePendingSaleRequest('dup', { decision, amount: 40 }, {});
    assert.equal(r.success, false); assert.equal(r.error, 'pending-sale-ambiguous-id');
  }
  assert.equal(probe.saleCalls.length, 0); assert.equal(store.pendingSales.length, 2);
  install([sale('r1')]);
  let release; probe.gate = new Promise((res) => { release = res; });
  const first = GMStoreOperationsService.resolvePendingSaleRequest('r1', { decision: 'approve' }, {});
  const second = await GMStoreOperationsService.resolvePendingSaleRequest('r1', { decision: 'deny' }, {});
  assert.equal(second.error, 'pending-sale-in-progress');
  release(); assert.equal((await first).success, true);
  assert.equal(probe.saleCalls.length, 1); assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleDenied').length, 0, 'the concurrent deny did not run');
});

await check('9. DUPLICATE request ids are ambiguous: neither request is resolved (approve or deny)', async () => {
  const dash = install([sale('dup', { itemId: 'item_a' }), sale('dup', { itemId: 'item_b' }), sale('r3')]);
  actors.A = mkActor('A', ['item_a', 'item_b', 'item_r3']);
  for (const action of ['accept', 'deny']) { const r = await dash._resolvePendingSale('dup', action, action === 'accept' ? 50 : null); assert.notEqual(r?.success, true); }
  assert.equal(probe.saleCalls.length, 0);
  assert.equal(store.pendingSales.length, 3);
  assert.equal(hookCalls.length, 0);
  const r3 = await dash._resolvePendingSale('r3', 'accept');
  assert.equal(r3.success, true, 'an unambiguous request in the same queue still resolves');
});

await check('10. a stale click on a request that was already resolved changes nothing', async () => {
  const dash = install([sale('r1'), sale('r2')]);
  await dash._resolvePendingSale('r1', 'accept');
  const credits = actors.A.system.credits; const calls = probe.saleCalls.length; const ids = queueIds();
  const again = await dash._resolvePendingSale('r1', 'accept');
  const denyAgain = await dash._resolvePendingSale('r1', 'deny');
  assert.notEqual(again?.success, true); assert.notEqual(denyAgain?.success, true);
  assert.equal(probe.saleCalls.length, calls); assert.equal(actors.A.system.credits, credits); assert.deepEqual(queueIds(), ids);
  assert.ok(notes.error.length >= 1);
});

await check('11. a repeated click while the first is still in flight does not sell twice', async () => {
  const dash = install([sale('r1')]);
  let release; probe.gate = new Promise((res) => { release = res; });
  const first = dash._resolvePendingSale('r1', 'accept');
  const second = await dash._resolvePendingSale('r1', 'accept');
  assert.notEqual(second?.success, true, 'the repeat was refused while the first is in flight');
  release(); const done = await first;
  assert.equal(done.success, true);
  assert.equal(probe.saleCalls.length, 1);
  assert.equal(actors.A.system.credits, 1100);
  assert.deepEqual(queueIds(), []);
  const third = await dash._resolvePendingSale('r1', 'accept');
  assert.notEqual(third?.success, true); assert.equal(probe.saleCalls.length, 1);
});

await check('12. a failed sale keeps the request queued (nothing removed) and an in-flight guard is released so the GM can retry', async () => {
  const dash = install([sale('r1')]);
  probe.failSale = true;
  const r = await dash._resolvePendingSale('r1', 'accept');
  assert.notEqual(r?.success, true); assert.deepEqual(queueIds(), ['r1']); assert.equal(actors.A.system.credits, 1000);
  probe.failSale = false;
  const retry = await dash._resolvePendingSale('r1', 'accept');
  assert.equal(retry.success, true); assert.equal(probe.saleCalls.length, 2); assert.deepEqual(queueIds(), []);
});

await check('13. the item/actor guard stays: a sale whose item is no longer owned is refused and stays queued', async () => {
  const dash = install([sale('r1')]);
  actors.A.items.splice(0, 1);
  const r = await dash._resolvePendingSale('r1', 'accept');
  assert.notEqual(r?.success, true); assert.equal(probe.saleCalls.length, 0); assert.deepEqual(queueIds(), ['r1']);
});

/* ---------------------------------------------------------------------------------------------- */
/* the rendered buttons carry the stable id, not a position                                           */
/* ---------------------------------------------------------------------------------------------- */
await check('14. the pending-sale buttons and the click handlers are addressed by request id, not data-index', async () => {
  const tpl = await readFile(new URL('../templates/apps/gm-store-dashboard.hbs', import.meta.url), 'utf8');
  const pending = tpl.slice(tpl.indexOf('data-swse-tab="pending">', tpl.indexOf('<div class="dashboard-tab')), tpl.indexOf('{{#each pendingApprovals}}'));
  for (const action of ['accept-pending', 'set-amount-pending', 'deny-pending']) {
    const m = pending.match(new RegExp(`<button[^>]*data-action="${action}"[^>]*>`));
    assert.ok(m, `${action} button exists`);
    assert.ok(/data-request-id="\{\{this\.id\}\}"/.test(m[0]), `${action} carries data-request-id`);
    assert.ok(!/data-index/.test(m[0]), `${action} no longer carries data-index`);
  }
  const js = await readFile(new URL('../scripts/apps/gm-store-dashboard.js', import.meta.url), 'utf8');
  for (const action of ['accept-pending', 'deny-pending', 'set-amount-pending']) {
    const block = js.slice(js.indexOf(`[data-action="${action}"]`), js.indexOf(`[data-action="${action}"]`) + 500);
    assert.ok(/dataset\.requestId/.test(block) && !/dataset\.index/.test(block), `${action} handler reads dataset.requestId`);
  }
});

/* ---------------------------------------------------------------------------------------------- */
/* correction 1 — R1: the queue is updated from FRESH state by request id; R2: ids are strings only     */
/* ---------------------------------------------------------------------------------------------- */
const suspend = () => { let release; const gate = new Promise((res) => { release = res; }); return { gate, release }; };
const tick = () => new Promise((res) => setTimeout(res, 5));

await check('R1a. denying B while the approval of A is suspended: B stays denied and cannot reappear when A completes', async () => {
  const dash = install([sale('A'), sale('B'), sale('C')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const approveA = dash._resolvePendingSale('A', 'accept');
  await tick();
  const denyB = await dash._resolvePendingSale('B', 'deny');
  assert.equal(denyB.success, true);
  assert.deepEqual(queueIds(), ['A', 'C']);
  s.release(); const a = await approveA;
  assert.equal(a.success, true);
  assert.deepEqual(queueIds(), ['C'], 'B (denied meanwhile) did not reappear; A was removed; C is untouched');
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleDenied').length, 1);
});

await check('R1b. a NEW request arriving while the approval is suspended is preserved when the approval completes', async () => {
  const dash = install([sale('A'), sale('B')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const approveA = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales = [...store.pendingSales, sale('NEW')];
  s.release(); await approveA;
  assert.deepEqual(queueIds(), ['B', 'NEW'], 'the newly queued request was not overwritten away');
});

await check('R1c. the queue being REORDERED while the approval is suspended removes the right request (not whatever now sits at the old position)', async () => {
  const dash = install([sale('A'), sale('B')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const approveA = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales = [sale('B'), sale('A')];                  // A was index 0 when the approval began; it is index 1 now
  s.release(); const a = await approveA;
  assert.equal(a.success, true);
  assert.deepEqual(queueIds(), ['B'], 'A was removed by id; B (now at A\'s old index) was not');
});

await check('R1c2. the same with a settings getter that returns the LIVE array and an in-place reorder: still the right request is removed', async () => {
  const dash = install([sale('A'), sale('B')]);
  probe.shared = true;
  const s = suspend(); probe.gates.item_A = s.gate;
  const approveA = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales.reverse();                                 // in place: A is now at index 1, B at index 0
  s.release(); const a = await approveA;
  assert.equal(a.success, true);
  assert.deepEqual(queueIds(), ['B'], 'A removed by id, not B at the old index');
});

await check('R1d. two DISTINCT requests approved concurrently are both removed (neither completion restores the other)', async () => {
  const dash = install([sale('A'), sale('B'), sale('C')]);
  const sa = suspend(); const sb = suspend(); probe.gates.item_A = sa.gate; probe.gates.item_B = sb.gate; probe.setDelay = 5;
  const pa = dash._resolvePendingSale('A', 'accept'); const pb = dash._resolvePendingSale('B', 'accept');
  await tick();
  sa.release(); sb.release();
  const [ra, rb] = await Promise.all([pa, pb]);
  assert.equal(ra.success, true); assert.equal(rb.success, true);
  assert.equal(probe.saleCalls.length, 2);
  assert.deepEqual(queueIds(), ['C']);
  assert.equal(actors.A.system.credits, 1200);
});

await check('R1e. concurrent DENIALS of distinct requests (slow settings writes) both persist: queue writes are serialized', async () => {
  const dash = install([sale('A'), sale('B'), sale('C')]);
  probe.setDelay = 10;
  const results2 = await Promise.all([dash._resolvePendingSale('A', 'deny'), dash._resolvePendingSale('B', 'deny')]);
  assert.ok(results2.every((r) => r.success === true));
  assert.deepEqual(queueIds(), ['C'], 'neither denied request reappeared');
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleDenied').length, 2);
});

await check('R1f. the same request is still refused while in flight, and distinct requests are NOT blocked by it', async () => {
  const dash = install([sale('A'), sale('B')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const pa = dash._resolvePendingSale('A', 'accept');
  await tick();
  const again = await dash._resolvePendingSale('A', 'deny');
  assert.equal(again.error, 'pending-sale-in-progress');
  const b = await dash._resolvePendingSale('B', 'accept');
  assert.equal(b.success, true, 'a different request resolves while A is suspended');
  s.release(); assert.equal((await pa).success, true);
  assert.deepEqual(queueIds(), []); assert.equal(probe.saleCalls.length, 2);
});

await check('R1g. sale succeeded but the request is already gone from the queue: truthful success, no queue write, hook fires, GM warned', async () => {
  const dash = install([sale('A'), sale('B')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const pa = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales = [sale('B')];                             // resolved elsewhere (e.g. another client) meanwhile
  s.release(); const r = await pa;
  assert.equal(r.success, true, 'the sale really happened');
  assert.equal(r.queueReconciled, false); assert.equal(r.queueReconciliation, 'request-absent');
  assert.deepEqual(queueIds(), ['B']);
  assert.equal(actors.A.system.credits, 1100);
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleApproved').length, 1);
  assert.ok(notes.warn.length >= 1);
});

await check('R1h. sale succeeded but the id became ambiguous (duplicate queued meanwhile): no queue entry is guessed, truthful success with reconciliation flagged', async () => {
  const dash = install([sale('A')]);
  const s = suspend(); probe.gates.item_A = s.gate;
  const pa = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales = [sale('A'), sale('A', { itemId: 'item_other' })];
  s.release(); const r = await pa;
  assert.equal(r.success, true); assert.equal(r.queueReconciled, false); assert.equal(r.queueReconciliation, 'ambiguous-id');
  assert.equal(store.pendingSales.length, 2, 'neither duplicate was removed');
});

await check('R1i. sale succeeded but the queue write FAILS: not reported as an ordinary failure, GM told not to re-approve, and a retry cannot sell twice', async () => {
  const dash = install([sale('A')]);
  probe.failSet = true;
  const r = await dash._resolvePendingSale('A', 'accept');
  assert.equal(r.success, true, 'the sale was executed and committed');
  assert.equal(r.queueReconciled, false); assert.equal(r.queueReconciliation, 'queue-write-failed');
  assert.equal(actors.A.system.credits, 1100); assert.equal(probe.saleCalls.length, 1);
  assert.ok(notes.error.concat(notes.warn).some((m) => /already (completed|sold)|do not approve|not.*again|still be listed/i.test(m)), 'the GM is warned the request may still be listed');
  assert.ok(!notes.error.some((m) => /Failed to approve/i.test(m)), 'not reported as a failed approval');
  probe.failSet = false;
  const retry = await dash._resolvePendingSale('A', 'accept');
  assert.notEqual(retry?.success, true, 'the item is gone: a retry cannot sell it again');
  assert.equal(probe.saleCalls.length, 1);
});

await check('R1k. a DENIAL whose queue write fails is reported as not denied: no denial hook, no success notice, the request stays listed', async () => {
  const dash = install([sale('A'), sale('B')]);
  probe.failSet = true;
  const r = await dash._resolvePendingSale('A', 'deny');
  assert.equal(r.success, false); assert.equal(r.error, 'pending-sale-queue-write-failed');
  assert.deepEqual(queueIds(), ['A', 'B']);
  assert.equal(hookCalls.filter((h) => h.name === 'swseStoreSaleDenied').length, 0);
  assert.equal(notes.info.length, 0); assert.ok(notes.error.length >= 1);
  probe.failSet = false;
  assert.equal((await dash._resolvePendingSale('A', 'deny')).success, true, 'the lock was released: a retry works');
  assert.deepEqual(queueIds(), ['B']);
});

await check('R1j. a FAILED sale still leaves the queue untouched even if other requests changed meanwhile', async () => {
  const dash = install([sale('A'), sale('B')]);
  const s = suspend(); probe.gates.item_A = s.gate; probe.failSale = true;
  const pa = dash._resolvePendingSale('A', 'accept');
  await tick();
  store.pendingSales = [sale('B'), sale('A'), sale('NEW')];
  s.release(); const r = await pa;
  assert.notEqual(r?.success, true);
  assert.deepEqual(queueIds(), ['B', 'A', 'NEW']);
});

await check('R2. the canonical service requires a STRING request id: a number cannot resolve a stored request with a matching numeric-looking id', async () => {
  install([sale('0', { itemId: 'item_zero' }), sale('5', { itemId: 'item_five' }), sale('sale_abc123')]);
  actors.A = mkActor('A', ['item_zero', 'item_five', 'item_sale_abc123']);
  for (const bad of [0, 5, 5.0, 1, NaN]) {
    for (const decision of ['approve', 'deny', 'counteroffer']) {
      const r = await GMStoreOperationsService.resolvePendingSaleRequest(bad, { decision, amount: 50 }, {});
      assert.notEqual(r?.success, true, `${bad} / ${decision}`); assert.equal(r.error, 'pending-sale-invalid-id');
    }
  }
  assert.equal(probe.saleCalls.length, 0); assert.equal(store.pendingSales.length, 3); assert.equal(hookCalls.length, 0);
  const ok = await GMStoreOperationsService.resolvePendingSaleRequest('sale_abc123', { decision: 'approve' }, {});
  assert.equal(ok.success, true, 'a generated string id still resolves');
  const strZero = await GMStoreOperationsService.resolvePendingSaleRequest('0', { decision: 'deny' }, {});
  assert.equal(strZero.success, true, 'the string "0" resolves exactly the request whose id is "0"');
});

const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 G24 pending-sale identity: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
