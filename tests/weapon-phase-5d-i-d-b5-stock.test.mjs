import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-B5 -- stock configuration (hasFoldingStock, retractableStockOptional). Every weapon is a PRODUCTION PACK RECORD under a deliberately WRONG name.
// Stock position is OWNED state (flags.swse.fireState.stock) written through the existing FireStateStore.setStockState; extending / folding is the
// published Move action paid through the action economy; the canonical definition is never mutated.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { FireStateStore } = await import('/systems/foundryvtt-swse/scripts/engine/combat/fire-state-store.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { ActionEconomyConsumption } = await import('/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (l) => { step += 1; console.log(`  [${step}] ${l} OK`); };
const packs = new Map();
for (const f of fs.readdirSync(new URL('../packs/', import.meta.url)).filter((n) => /^weapons.*\.db$/.test(n))) {
  for (const line of fs.readFileSync(new URL(`../packs/${f}`, import.meta.url), 'utf8').split('\n')) { if (line.trim()) { const d = JSON.parse(line); packs.set(d._id, d); } }
}
const idOf = (k) => Object.entries(registryData.productionIdIndex).find(([, v]) => v === k)[0];
let uid = 0;
const prod = (k, name = 'Zxq Renamed Thing') => { const d = packs.get(idOf(k)); assert.ok(d, k); return { id: `w${++uid}`, name, type: d.type, flags: JSON.parse(JSON.stringify(d.flags)), system: JSON.parse(JSON.stringify(d.system)) }; };
const setPath = (o, path, v) => { const ks = path.split('.'); let t = o; for (const k of ks.slice(0, -1)) t = (t[k] ??= {}); t[ks.at(-1)] = v; };
const mkActor = (items) => {
  const col = [...items]; col.get = (id) => col.find((i) => i.id === id);
  const actor = { id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, items: col, system: {}, getFlag() { return undefined; } };
  for (const w of items) w.actor = actor;
  return actor;
};
const spent = [];
let writes = 0;
ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const item = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); writes += 1; } return updates.map((u) => actor.items.get(u._id)).filter(Boolean); };   // resolves with the documents it changed, as Foundry does
ActionEconomyConsumption.spend = async (actor, type) => { spent.push(type); return { allowed: true, committed: true, rollback: async () => { spent.pop(); } }; };
const reset = () => { spent.length = 0; writes = 0; };
const stockOf = (w) => w.flags?.swse?.fireState?.stock;

// 1. the carried facts really are what the ledger says
{
  const by = Object.fromEntries(registryData.identities.map((r) => [r.identityKey, r]));
  assert.equal(by['weapon-targeting-blaster-rifle'].operation.hasFoldingStock, false);
  assert.equal(by['weapon-blaster-rifle'].operation.retractableStockOptional, true);
  assert.equal(by['weapon-blaster-carbine'].operation.retractableStockOptional, true);
  assert.equal(registryData.identities.filter((r) => r.operation && 'hasFoldingStock' in r.operation).length, 1);
  assert.equal(registryData.identities.filter((r) => r.operation && 'retractableStockOptional' in r.operation).length, 2);
  ok('1. production data: hasFoldingStock=false only on the Targeting Blaster Rifle; retractableStockOptional only on the Blaster Rifle and Blaster Carbine (price metadata)');
}

// 2. a weapon with an integrated retractable stock: state transitions cost the published Move action, persist on the owned Item, never touch the canonical record
{
  const sub = prod('weapon-subrepeating-blaster'); const A = mkActor([sub]);
  const before = JSON.stringify(registry.getByIdentityKey('weapon-subrepeating-blaster'));
  reset();
  let r = await FireStateStore.setStockState(A, sub, 'extended');
  assert.equal(r.ok, true); assert.deepEqual(spent, ['move']); assert.equal(stockOf(sub), 'extended');
  reset(); r = await FireStateStore.setStockState(A, sub, 'extended');
  assert.equal(r.ok, true); assert.deepEqual(spent, [], 'already extended: no action, no change'); 
  reset(); r = await FireStateStore.setStockState(A, sub, 'retracted');
  assert.deepEqual(spent, ['move']); assert.equal(stockOf(sub), 'retracted');
  reset(); r = await FireStateStore.setStockState(A, sub, 'extended', { free: true });
  assert.deepEqual(spent, [], 'a GM correction needs no action'); assert.equal(stockOf(sub), 'extended');
  assert.equal(JSON.stringify(registry.getByIdentityKey('weapon-subrepeating-blaster')), before, 'canonical definition untouched');
  ok('2. Subrepeating Blaster: extend / fold = one Move action, no cost when unchanged, free correction allowed, owned state only (canonical record unchanged)');
}

// 3. invalid configurations
{
  const sub = prod('weapon-subrepeating-blaster'); const A = mkActor([sub]);
  reset();
  assert.deepEqual(await FireStateStore.setStockState(A, sub, 'folded-ish'), { ok: false, reason: 'invalid-stock-state' });
  assert.deepEqual(await FireStateStore.setStockState(A, sub, undefined), { ok: false, reason: 'invalid-stock-state' });
  assert.deepEqual(spent, []); assert.equal(writes, 0);
  const tbr = prod('weapon-targeting-blaster-rifle'); const B = mkActor([tbr]);
  for (const free of [false, true]) for (const st of ['extended', 'retracted']) {
    reset();
    assert.deepEqual(await FireStateStore.setStockState(B, tbr, st, { free }), { ok: false, reason: 'no-stock' });
    assert.deepEqual(spent, []); assert.equal(writes, 0); assert.equal(stockOf(tbr), undefined);
  }
  // a weapon that does not STATE the absence is not guessed at (stock is a purchase option / installed modification)
  for (const k of ['weapon-blaster-rifle', 'weapon-blaster-carbine', 'weapon-hunting-blaster-carbine']) {
    const w = prod(k); const C = mkActor([w]); reset();
    const r = await FireStateStore.setStockState(C, w, 'extended');
    assert.equal(r.ok, true, k); assert.equal(stockOf(w), 'extended', k);
  }
  // renaming cannot confer or remove a stock; a custom weapon has no canonical statement either way
  const renamed = prod('weapon-targeting-blaster-rifle', 'Hunting Blaster Carbine'); const D = mkActor([renamed]);
  assert.deepEqual(await FireStateStore.setStockState(D, renamed, 'extended'), { ok: false, reason: 'no-stock' });
  const homebrew = { id: 'hb', name: 'Targeting Blaster Rifle', type: 'weapon', flags: {}, system: {} }; const E = mkActor([homebrew]);
  assert.equal((await FireStateStore.setStockState(E, homebrew, 'extended', { free: true })).ok, true);
  ok('3. invalid state refused; the stated absence (Targeting Blaster Rifle) refuses even a free correction and writes nothing; unstated weapons and legacy items are not guessed at; names are irrelevant');
}

// 4. the persisted state feeds the existing handling rules (brace rule, attack of opportunity) on the next read
{
  const sub = prod('weapon-subrepeating-blaster'); const A = mkActor([sub]);
  const shape = () => rt.shapeOfWeapon(sub, {});
  assert.equal(shape().brace.stockRule, 'extended');
  assert.equal(FireStateStore.previewBrace(sub, shape()).legal, false, 'unknown stock counts as not extended');
  await FireStateStore.setStockState(A, sub, 'retracted');
  assert.equal(FireStateStore.previewBrace(sub, shape()).legal, false);
  assert.equal(FireStateStore.previewBrace(sub, shape()).reason, 'stock-not-extended');
  await FireStateStore.setStockState(A, sub, 'extended');
  assert.equal(FireStateStore.previewBrace(sub, shape()).legal, true, 'extended stock allows the brace');
  ok('4. persisted stock state drives the structured brace rule: unknown / retracted refuse, extended allows');
}
console.log(`weapon-phase-5d-i-d-b5-stock: ${step} checks OK`);
